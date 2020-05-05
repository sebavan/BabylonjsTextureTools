varying vec2 vUV;

#include<helperFunctions>
#include<pbrHelperFunctions>
#include<pbrBRDFFunctions>
#include<hammersley>
#include<importanceSampling>

// PROD MODE
const uint SAMPLE_COUNT = 16384u;
// DEV MODE
// const uint SAMPLE_COUNT = 4096u;

#ifdef BRDF_V_HEIGHT_CORRELATED
    // Correlated
    #define visibility(nov, nol, a) smithVisibility_GGXCorrelated(nov, nol, a)
#else
    // Uncorrelated
    #define visibility(nov, nol, a) smithVisibility_TrowbridgeReitzGGXFast(nov, nol, a)
#endif

#ifdef MS_BRDF_ENERGY_CONSERVATION
    /*
     * Assuming f90 = 1
     *   Fc = (1 - V•H)^5
     *   F(h) = f0*(1 - Fc) + Fc
     *
     * f0 and f90 are known at runtime, but thankfully can be factored out, allowing us
     * to split the integral in two terms and store both terms separately in a LUT.
     *
     * At runtime, we can reconstruct Er() exactly as below:
     *
     *            4                <v•h>
     *   DFV.x = --- ∑ Fc V(v, l) ------- <n•l>
     *            N  h             <n•h>
     *
     *
     *            4                <v•h>
     *   DFV.y = --- ∑    V(v, l) ------- <n•l>
     *            N  h             <n•h>
     *
     *
     *   Er() = (1 - f0) * DFV.x + f0 * DFV.y
     *
     *        = mix(DFV.xxx, DFV.yyy, f0)
     *
     */
    vec2 packResult(float V, float Fc) {
        vec2 result;
        result.x = V * Fc;
        result.y = V;
        return result;
    }
#else
    /*
     * Assuming f90 = 1
     * Fc = (1 - V•H)^5
     * F(h) = f0*(1 - Fc) + f90*Fc
     *
     * f0 and f90 are known at runtime, but thankfully can be factored out, allowing us
     * to split the integral in two terms and store both terms separately in a LUT.
     *
     * At runtime, we can reconstruct Er() exactly as below:
     *
     *            4                      <v•h>
     *   DFV.x = --- ∑ (1 - Fc) V(v, l) ------- <n•l>
     *            N  h                   <n•h>
     *
     *
     *            4                      <v•h>
     *   DFV.y = --- ∑ (    Fc) V(v, l) ------- <n•l>
     *            N  h                   <n•h>
     *
     *
     *   Er() = f0 * DFV.x + f90 * DFV.y
     *
     */
    vec2 packResult(float V, float Fc) {
        vec2 result;
        result.x = (1.0 - Fc) * V;
        result.y = Fc * V;
        return result;
    }
#endif

/*
 *
 * Importance sampling GGX - Trowbridge-Reitz
 * ------------------------------------------
 *
 * Important samples are chosen to integrate Dggx() * cos(theta) over the hemisphere.
 *
 * All calculations are made in tangent space, with n = [0 0 1]
 *
 *                      h (important sample)
 *                     /.
 *                    / .
 *                   /  .
 *                  /   .
 *         --------o----+-------> n
 *                   cos(theta)
 *                    = n•h
 *
 *  h is micro facet's normal
 *  l is the reflection of v around h, l = reflect(-v, h)  ==>  v•h = l•h
 *
 *  n•v is given as an input parameter at runtime
 *
 *  Since n = [0 0 1], we also have v.z = n•v
 *
 *  Since we need to compute v•h, we chose v as below. This choice only affects the
 *  computation of v•h (and therefore the fresnel term too), but doesn't affect
 *  n•l, which only relies on l.z (which itself only relies on v.z, i.e.: n•v)
 *
 *      | sqrt(1 - (n•v)^2)     (sin)
 *  v = | 0
 *      | n•v                   (cos)
 *
 *
 *  h = important_sample_ggx()
 *
 *  l = reflect(-v, h) = 2 * v•h * h - v;
 *
 *  n•l = [0 0 1] • l = l.z
 *
 *  n•h = [0 0 1] • l = h.z
 *
 *
 *  pdf() = D(h) <n•h> |J(h)|
 *
 *               1
 *  |J(h)| = ----------
 *            4 <v•h>
 *
 *
 * Evaluating the integral
 * -----------------------
 *
 * We are trying to evaluate the following integral:
 *
 *                    /
 *             Er() = | fr(s) <n•l> ds
 *                    /
 *                    Ω
 *
 * For this, we're using importance sampling:
 *
 *                    1     fr(h)
 *            Er() = --- ∑ ------- <n•l>
 *                    N  h   pdf
 *
 * with:
 *
 *            fr() = D(h) F(h) V(v, l)
 *
 *
 *  It results that:
 *
 *            1                        4 <v•h>
 *    Er() = --- ∑ D(h) F(h) V(v, l) ------------ <n•l>
 *            N  h                     D(h) <n•h>
 *
 *
 *  +-------------------------------------------+
 *  |          4                  <v•h>         |
 *  |  Er() = --- ∑ F(h) V(v, l) ------- <n•l>  |
 *  |          N  h               <n•h>         |
 *  +-------------------------------------------+
 *
 */

vec3 DFV(float NdotV, float roughness) {
    vec3 result = vec3(0.);

    vec3 V;
    V.x = sqrt(1.0 - NdotV*NdotV);
    V.y = 0.0;
    V.z = NdotV;

    // from perceptual to linear roughness
    float alpha = square(roughness);

    for(uint i = 0u; i < SAMPLE_COUNT; ++i)
    {
        vec2 Xi = hammersley(i, SAMPLE_COUNT);

        vec3 H  = hemisphereImportanceSampleDggx(Xi, alpha);
        vec3 L  = normalize(2.0 * dot(V, H) * H - V);

        float VdotH = saturate(dot(V, H));
        float NdotL = saturate(L.z);
        float NdotH = saturate(H.z);

        if(NdotL > 0.0)
        {
            float Vis = visibility(NdotV, NdotL, alpha);
            float WeightedVis = Vis * (VdotH / NdotH) * NdotL;
            float Fc = pow5(1.0 - VdotH);

            result.rg += packResult(WeightedVis, Fc);
        }

#ifdef SHEEN
        vec3 HCharlie  = hemisphereImportanceSampleDCharlie(Xi, alpha);
        vec3 LCharlie  = normalize(2.0 * dot(V, HCharlie) * HCharlie - V);

        float VdotHCharlie = saturate(dot(V, HCharlie));
        float NdotLCharlie = saturate(LCharlie.z);
        float NdotHCharlie = saturate(HCharlie.z);

        if (NdotLCharlie > 0.0) {
            float Vis = visibility_Ashikhmin(NdotV, NdotLCharlie);
            float WeightedVis = Vis * (VdotHCharlie / NdotHCharlie) * NdotLCharlie;

            result.b += WeightedVis;
        }
#endif
    }

    result = result * 4. / float(SAMPLE_COUNT);

    return result;
}

void main() 
{
    vec3 integratedBRDF = DFV(vUV.x, vUV.y);

#ifdef RGBD
    gl_FragColor = toRGBD(integratedBRDF);
#else
    gl_FragColor = vec4(integratedBRDF, 1.);
#endif
}
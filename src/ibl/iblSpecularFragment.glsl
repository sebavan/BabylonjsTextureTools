varying vec2 vUV;

uniform samplerCube environmentMap;
uniform vec2 textureInfo;
uniform float face;

uniform float linearRoughness;

#include<helperFunctions>
#include<hammersley>
#include<importanceSampling>
#include<pbrBRDFFunctions>

// PROD MODE
const uint SAMPLE_COUNT = 4096u;
// DEV MODE
// const uint SAMPLE_COUNT = 32u;

const float SAMPLE_COUNT_FLOAT = float(SAMPLE_COUNT);
const float SAMPLE_COUNT_FLOAT_INVERSED = 1. / SAMPLE_COUNT_FLOAT;

const float K = 4.;

/*
 *
 * Importance sampling GGX - Trowbridge-Reitz
 * ------------------------------------------
 *
 * Important samples are chosen to integrate Dggx() * cos(theta) over the hemisphere.
 *
 * All calculations are made in tangent space, with n = [0 0 1]
 *
 *             l        h (important sample)
 *             .\      /.
 *             . \    / .
 *             .  \  /  .
 *             .   \/   .
 *         ----+---o----+-------> n [0 0 1]
 *     cos(2*theta)     cos(theta)
 *        = n•l            = n•h
 *
 *  v = n
 *  f0 = f90 = 1
 *  V = 1
 *
 *  h is micro facet's normal
 *
 *  l is the reflection of v (i.e.: n) around h  ==>  n•h = l•h = v•h
 *
 *  h = important_sample_ggx()
 *
 *  n•h = [0 0 1]•h = h.z
 *
 *  l = reflect(-n, h)
 *    = 2 * (n•h) * h - n;
 *
 *  n•l = cos(2 * theta)
 *      = cos(theta)^2 - sin(theta)^2
 *      = (n•h)^2 - (1 - (n•h)^2)
 *      = 2(n•h)^2 - 1
 *
 *
 *  pdf() = D(h) <n•h> |J(h)|
 *
 *               1
 *  |J(h)| = ----------
 *            4 <v•h>
 *
 *    v = n -> <v•h>/<n•h> = 1
 *
 *  pdf() = D(h) / 4
 *
 *
 * Pre-filtered importance sampling
 * --------------------------------
 *
 *  see: "Real-time Shading with Filtered Importance Sampling", Jaroslav Krivanek
 *  see: "GPU-Based Importance Sampling, GPU Gems 3", Mark Colbert
 *
 *
 *                   Ωs
 *     lod = log4(K ----)
 *                   Ωp
 *
 *     log4(K) = 1, works well for box filters
 *     K = 4
 *
 *             1
 *     Ωs = ---------, solid-angle of an important sample
 *           N * pdf
 *
 *              4 PI
 *     Ωp ~ --------------, solid-angle of a sample in the base cubemap
 *           texel_count
 *
 *
 * Evaluating the integral
 * -----------------------
 *
 *                    K     fr(h)
 *            Er() = --- ∑ ------- L(h) <n•l>
 *                    N  h   pdf
 *
 * with:
 *
 *            fr() = D(h)
 *
 *                       N
 *            K = -----------------
 *                    fr(h)
 *                 ∑ ------- <n•l>
 *                 h   pdf
 *
 *
 *  It results that:
 *
 *            K           4 <v•h>
 *    Er() = --- ∑ D(h) ------------ L(h) <n•l>
 *            N  h        D(h) <n•h>
 *
 *    v = n -> <v•h>/<n•h> = 1
 *
 *              K
 *    Er() = 4 --- ∑ L(h) <n•l>
 *              N  h
 *
 *                  N       4
 *    Er() = ------------- --- ∑ V(v) <n•l>
 *             4 ∑ <n•l>    N
 *
 *
 *  +------------------------------+
 *  |          ∑ <n•l> L(h)        |
 *  |  Er() = --------------       |
 *  |            ∑ <n•l>           |
 *  +------------------------------+
 *
 */

float log4(float x) {
    return log2(x) / 2.;
}

vec3 specular(vec3 N) {
    vec3 result = vec3(0.0);

    // center the cone around the normal (handle case of normal close to up)
    vec3 up = abs(N.z) < 0.999 ? vec3(0, 0, 1) : vec3(1, 0, 0);

    mat3 R;
    R[0] = normalize(cross(up, N));
    R[1] = cross(N, R[0]);
    R[2] = N;

    float maxLevel = textureInfo.y;
    float dim0 = textureInfo.x;
    float omegaP = (4. * PI) / (6. * dim0 * dim0);

    float weight = 0.;
    for(uint i = 0u; i < SAMPLE_COUNT; ++i)
    {
        vec2 Xi = hammersley(i, SAMPLE_COUNT);
        vec3 H = hemisphereImportanceSampleDggx(Xi, linearRoughness);

        float NoV = 1.;
        float NoH = H.z;
        float NoH2 = H.z * H.z;
        float NoL = 2. * NoH2 - 1.;
        vec3 L = vec3(2. * NoH * H.x, 2. * NoH * H.y, NoL);
        L = normalize(L);

        if (NoL > 0.) {
            float pdf_inversed = 4. / normalDistributionFunction_TrowbridgeReitzGGX(NoH, linearRoughness);

            float omegaS = SAMPLE_COUNT_FLOAT_INVERSED * pdf_inversed;
            float l = log4(omegaS) - log4(omegaP) + log4(K);
            float mipLevel = clamp(float(l), 0.0, maxLevel);

            weight += NoL;

            vec3 c = textureCubeLodEXT(environmentMap, R * L, mipLevel).rgb;
            #ifdef GAMMA_INPUT
                c = toLinearSpace(c);
            #endif
            result += c * NoL;
        }
    }

    result = result / weight;

    return result;
}

void main() 
{
    float cx = vUV.x * 2. - 1.;
    float cy = (1. - vUV.y) * 2. - 1.;

    vec3 dir = vec3(0.);
    if (face == 0.) { // PX
        dir = vec3( 1.,  cy, -cx);
    }
    else if (face == 1.) { // NX
        dir = vec3(-1.,  cy,  cx);
    }
    else if (face == 2.) { // PY
        dir = vec3( cx,  1., -cy);
    }
    else if (face == 3.) { // NY
        dir = vec3( cx, -1.,  cy);
    }
    else if (face == 4.) { // PZ
        dir = vec3( cx,  cy,  1.);
    }
    else if (face == 5.) { // NZ
        dir = vec3(-cx,  cy, -1.);
    }
    dir = normalize(dir);

    if (linearRoughness == 0.) {
        gl_FragColor = vec4(textureCube(environmentMap, dir).rgb, 1.);
    }
    else {
        vec3 integratedBRDF = specular(dir);
        gl_FragColor = vec4(integratedBRDF, 1.);
    }
}
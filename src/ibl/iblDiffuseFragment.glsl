varying vec2 vUV;

uniform samplerCube environmentMap;
uniform vec2 textureInfo;
uniform float face;

#include<helperFunctions>
#include<hammersley>
#include<importanceSampling>

// PROD MODE
const uint SAMPLE_COUNT = 4096u;
// DEV MODE
// const uint SAMPLE_COUNT = 16u;

const float SAMPLE_COUNT_FLOAT = float(SAMPLE_COUNT);
const float SAMPLE_COUNT_FLOAT_INVERSED = 1. / SAMPLE_COUNT_FLOAT;

const float K = 4.;

/*
 *
 * Importance sampling
 * -------------------
 *
 * Important samples are chosen to integrate cos(theta) over the hemisphere.
 *
 * All calculations are made in tangent space, with n = [0 0 1]
 *
 *                      l (important sample)
 *                     /.
 *                    / .
 *                   /  .
 *                  /   .
 *         --------o----+-------> n (direction)
 *                   cos(theta)
 *                    = n•l
 *
 *
 *  'direction' is given as an input parameter, and serves as tge z direction of the tangent space.
 *
 *  l = important_sample_cos()
 *
 *  n•l = [0 0 1] • l = l.z
 *
 *           n•l
 *  pdf() = -----
 *           PI
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
 * We are trying to evaluate the following integral:
 * (we pre-multiply by PI to avoid a 1/PI in the shader)
 *
 *                     1  /
 *             Ed() = --- | L(s) <n•l> ds
 *                    PI  /
 *                        Ω
 *
 * For this, we're using importance sampling:
 *
 *                    1      L(l)
 *            Ed() = ---- ∑ ------- <n•l>
 *                   PI*N l   pdf
 *
 *
 *  It results that:
 *
 *            1            PI
 *    Ed() = ---- ∑ L(l) ------  <n•l>
 *           PI*N l        <n.l>
 *
 *
 *  +----------------------+
 *  |          1           |
 *  |  Ed() = ---- ∑ L(l)  |
 *  |          N   l       |
 *  +----------------------+
 *
 */

float log4(float x) {
    return log2(x) / 2.;
}

vec3 irradiance(vec3 N) {
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

    for(uint i = 0u; i < SAMPLE_COUNT; ++i)
    {
        vec2 Xi = hammersley(i, SAMPLE_COUNT);
        vec3 Ls = hemisphereCosSample(Xi);

        Ls = normalize(Ls);

        vec3 Ns = vec3(0., 0., 1.);

        float NoL = dot(Ns, Ls);

        if (NoL > 0.) {
            float pdf_inversed = PI / NoL;

            float omegaS = SAMPLE_COUNT_FLOAT_INVERSED * pdf_inversed;
            float l = log4(omegaS) - log4(omegaP) + log4(K);
            float mipLevel = clamp(l, 0.0, maxLevel);

            vec3 c = textureCubeLodEXT(environmentMap, R * Ls, mipLevel).rgb;
            #ifdef GAMMA_INPUT
                c = toLinearSpace(c);
            #endif
            result += c;
        }
    }

    result = result * SAMPLE_COUNT_FLOAT_INVERSED;

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

    vec3 integratedBRDF = irradiance(dir);

    gl_FragColor = vec4(integratedBRDF, 1.);
}
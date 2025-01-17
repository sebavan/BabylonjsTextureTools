varying vec2 vUV;

uniform samplerCube environmentMap;
uniform sampler2D icdf;
uniform vec2 textureInfo;
uniform float face;

// PROD MODE
#define NUM_SAMPLES 4096u
// DEV MODE
// #define NUM_SAMPLES 32u

#include<helperFunctions>
#include<pbrBRDFFunctions>
#include<importanceSampling>
#include<hdrFilteringFunctions>

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

    vec3 integratedBRDF = irradiance(environmentMap, dir, textureInfo, icdf);

    gl_FragColor = vec4(integratedBRDF, 1.);
}
varying vec2 vUV;

uniform float lod;
uniform samplerCube textureSampler;

#include<helperFunctions>

void main(void) 
{
    float cx = vUV.x * 2. - 1.;
    float cy = vUV.y * 2. - 1.;

    float face = 0.;
    if (cy > 0.75) {
        gl_FragColor = vec4(0.);
        return;
    }
    else if (cy > 0.25) {
        if (cx > 0. && cx < 0.5) {
            face = 2.;
            cx = cx * 4. - 1.;
            cy = cy * 4. - 2.;
        }
        else {
            gl_FragColor = vec4(0.);
            return;
        }
    }
    else if (cy > -0.25) {
        cy = cy * 4.;
        if (cx > 0.5) {
            face = 0.;
            cx = cx * 4. - 3.;
        }
        else if (cx > 0.) {
            face = 4.;
            cx = cx * 4. - 1.;
        }
        else if (cx > -0.5) {
            face = 1.;
            cx = cx * 4. + 1.;
        }
        else  {
            face = 5.;
            cx = cx * 4. + 3.;
        }
    }
    else if (cy > -0.75) {
        if (cx > 0. && cx < 0.5) {
            face = 3.;
            cx = cx * 4. - 1.;
            cy = cy * 4. + 2.;
        }
        else {
            gl_FragColor = vec4(0.);
            return;
        }
    }
    else {
        gl_FragColor = vec4(0.);
        return;
    }

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

    // AND YES IT IS THE LEAST OPTIMIZE I COULD THINK OF...
    // but it works :-)
    // I keep it only for posterity and cause it is not used in real time.

    vec3 c = textureCubeLodEXT(textureSampler, dir, lod).rgb;
    gl_FragColor = vec4(toGammaSpace(c), 1.);
}
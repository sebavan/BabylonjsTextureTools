varying vec2 vUV;

uniform float invertY;
uniform sampler2D textureSampler;

void main(void) 
{
    vec2 uv = vUV;
    if (invertY == 1.0) {
        uv.y = 1.0 - uv.y;
    }

    gl_FragColor = texture2D(textureSampler, uv);
}
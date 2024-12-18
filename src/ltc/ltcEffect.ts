import {
    EffectWrapper,
    EffectRenderer,
} from "@babylonjs/core/Materials/effectRenderer";
import { ThinEngine } from "@babylonjs/core/Engines/thinEngine";
import { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture";
import { Constants } from "@babylonjs/core/Engines/constants";
import { Scalar } from "@babylonjs/core/Maths/math.scalar";
import { RenderTargetWrapper } from "@babylonjs/core/Engines/renderTargetWrapper";

import "@babylonjs/core/Engines/Extensions/engine.renderTarget";
import "@babylonjs/core/Engines/Extensions/engine.renderTargetCube";

import "@babylonjs/core/Shaders/ShadersInclude/helperFunctions";
import "@babylonjs/core/Shaders/ShadersInclude/pbrHelperFunctions";
import "@babylonjs/core/Shaders/ShadersInclude/pbrBRDFFunctions";
import "@babylonjs/core/Shaders/ShadersInclude/hdrFilteringFunctions";
import "@babylonjs/core/Shaders/ShadersInclude/importanceSampling";
import "@babylonjs/core/Maths/math.vector";

import fragmentShader from "./brdfFragment.glsl";
import { Matrix, Vector2, Vector3 } from "@babylonjs/core/Maths/math.vector";

class CompAvgStruct
{
    public norm: number;
    public fresnel: number;
    public averageDir: Vector3;

    constructor() {
        this.norm = 0;
        this.fresnel = 0;
        this.averageDir = Vector3.Zero();
    }
}

class LTC {
    public magnitude: number;
    public fresnel: number;
    public m11: number;
    public m22: number;
    public m13: number;

    public X: Vector3;
    public Y: Vector3;
    public Z: Vector3;

    public M: Matrix;
    public invM: Matrix;
    public detM: number;

    constructor() {
        this.magnitude = 1;
        this.fresnel = 1;
        this.m11 = 1;
        this.m22 = 1;
        this.m13 = 0;
        this.X = new Vector3(1, 0, 0);
        this.Y = new Vector3(0, 1, 0);
        this.Z = new Vector3(0, 0, 1);
        this.M = Matrix.Identity();
        this.invM = Matrix.Identity();
        this.detM = 0;
        this.update();
    }

    public update(): void {
        this.M = new Matrix();
        Matrix.FromXYZAxesToRef(this.X, this.Y, this.Z, this.M);
        const tempMatrix = Matrix.FromArray([
            this.m11,
            0,
            0,
            1,
            0,
            this.m22,
            0,
            1,
            this.m13,
            0,
            1,
            1,
        ]);
        this.M = this.M.multiply(tempMatrix);
        this.M.invertToRef(this.invM);
        this.detM = Math.abs(this.M.determinant());
    }
}

class BRDF {
    public sample(V: Vector3, alpha: number, U1: number, U2: number) : Vector3 {
        return Vector3.Zero();
    }

    public  eval(V: Vector3, L: Vector3, alpha: number, pdf: number) : number {
        return 0;
    }
}

const MIN_ALPHA = 0.00001;

// number of samples used to compute the error during fitting
const Nsample = 32;

export class LTCEffect {
    public readonly rtw: RenderTargetWrapper;
    private readonly _engine: ThinEngine;
    private readonly _effectRenderer: EffectRenderer;

    constructor(engine: ThinEngine, effectRenderer: EffectRenderer, size = 64) {
        this._engine = engine;
        this._effectRenderer = effectRenderer;
        this.rtw = this._createRenderTarget(size);
    }

    public render(brdf: BRDF, N: number): void {
        const tab = new Array<Matrix>(N * N);
        const tabMagFresnel = new Array<Vector2>(N * N);
        const tabSphere = new Array<number>(N * N);

        this.fitTab(tab, tabMagFresnel, N, brdf);

        const effectWrapper = this._getEffect();
        this._effectRenderer.setViewport();
        this._effectRenderer.applyEffectWrapper(effectWrapper);

        //effectWrapper.effect.setTexture("environmentMap", texture);
        //effectWrapper.effect.setFloat2("textureInfo", textureWidth, mipmapsCount - 1);
        this._engine.bindFramebuffer(this.rtw, 0);
        this._effectRenderer.applyEffectWrapper(effectWrapper);
        effectWrapper.effect.setFloat("face", 0);
        this._effectRenderer.draw();
        this._engine.unBindFramebuffer(this.rtw);
        effectWrapper.dispose();
    }

    private fitTab(
        tab: Array<Matrix>,
        tabMagFresnel: Array<Vector2>,
        N: number,
        brdf: BRDF
    ) {
        const ltc = new LTC();

        // loop over theta and alpha
        for (let a = N - 1; a >= 0; --a) {
            for (let t = 0; t <= N - 1; ++t) {
                // parameterised by sqrt(1 - cos(theta))
                let x = t / (N - 1);
                let ct = 1.0 - x * x;
                let theta = Math.min(1.57, Math.acos(ct));
                const V = new Vector3(Math.sin(theta), 0.0, Math.cos(theta));

                // alpha = roughness^2
                let roughness = a / (N - 1);
                let alpha = Math.max(roughness * roughness, MIN_ALPHA);

                let averageDir = Vector3.Zero();

                const struct = new CompAvgStruct();
                struct.norm = ltc.magnitude;
                struct.fresnel = ltc.fresnel;
                struct.averageDir = averageDir;

                this.computeAvgTerms(
                    brdf,
                    V,
                    alpha,
                    struct
                );

                ltc.magnitude = struct.norm;
                ltc.fresnel = struct.fresnel;
                averageDir = struct.averageDir;

                let isotropic = false;

                // 1. first guess for the fit
                // init the hemisphere in which the distribution is fitted
                // if theta == 0 the lobe is rotationally symmetric and aligned with Z = (0 0 1)
                if (t == 0) {
                    ltc.X = new Vector3(1, 0, 0);
                    ltc.Y = new Vector3(0, 1, 0);
                    ltc.Z = new Vector3(0, 0, 1);

                    if (a == N - 1) {
                        // roughness = 1
                        ltc.m11 = 1.0;
                        ltc.m22 = 1.0;
                    } // init with roughness of previous fit
                    else {
                        ltc.m11 = tab[a + 1 + t * N].m[0 + 0];
                        ltc.m22 = tab[a + 1 + t * N].m[1 * 4 + 1];
                    }

                    ltc.m13 = 0;
                    ltc.update();

                    isotropic = true;
                }
                // otherwise use previous configuration as first guess
                else {
                    const L = averageDir;
                    const T1 = new Vector3(L.z, 0, -L.x);
                    const T2 = new Vector3(0, 1, 0);
                    ltc.X = T1;
                    ltc.Y = T2;
                    ltc.Z = L;
                    ltc.update();
                    isotropic = false;
                }

                // 2. fit (explore parameter space and refine first guess)
                const epsilon = 0.05;
                fit(ltc, brdf, V, alpha, epsilon, isotropic);

                // copy data
                tab[a + t * N] = ltc.M;
                tabMagFresnel[a + t * N].x = ltc.magnitude;
                tabMagFresnel[a + t * N].y = ltc.fresnel;

                // kill useless coefs in matrix
                tab[a + t * N].multiplyAtIndex(0 + 1, 0);
                tab[a + t * N].multiplyAtIndex(4 * 1 + 0, 0);
                tab[a + t * N].multiplyAtIndex(4 * 2 + 1, 0);
                tab[a + t * N].multiplyAtIndex(4 * 1 + 2, 0);
            }
        }
    }

    

    // computes
// * the norm (albedo) of the BRDF
// * the average Schlick Fresnel value
// * the average direction of the BRDF
private computeAvgTerms(brdf: BRDF, V: Vector3, alpha: number, result: CompAvgStruct)
{
    result.norm = 0.0;
    result.fresnel = 0.0;
    result.averageDir = Vector3.Zero();

    for (let j = 0; j < Nsample; ++j)
    for (let i = 0; i < Nsample; ++i)
    {
        const U1 = (i + 0.5)/Nsample;
        const U2 = (j + 0.5)/Nsample;

        // sample
        const L = brdf.sample(V, alpha, U1, U2);

        // eval
        let pdf = 0;
        let evalResult = brdf.eval(V, L, alpha, pdf);

        if (pdf > 0)
        {
            let weight = evalResult / pdf;

            let H = V.add(L).normalize();

            // accumulate
            result.norm       += weight;
            result.fresnel    += weight * Math.pow(1.0 - Math.max(V.dot(H), 0.0), 5.0);
            result.averageDir.addInPlace(L.multiplyByFloats(weight, weight, weight));
        }
    }

    result.norm    /= (Nsample*Nsample);
    result.fresnel /= (Nsample*Nsample);

    // clear y component, which should be zero with isotropic BRDFs
    result.averageDir.y = 0.0;
    result.averageDir = result.averageDir.normalize();
}

    private _getEffect(): EffectWrapper {
        const effectWrapper = new EffectWrapper({
            engine: this._engine,
            name: "IBLDiffuse",
            fragmentShader: fragmentShader,
            samplerNames: ["environmentMap"],
            uniformNames: ["textureInfo", "face"],
        });

        return effectWrapper;
    }

    private _createRenderTarget(size: number): RenderTargetWrapper {
        const rtw = this._engine.createRenderTargetTexture(size, {
            format: Constants.TEXTUREFORMAT_RGBA,
            type: Constants.TEXTURETYPE_FLOAT,
            generateMipMaps: false,
            generateDepthBuffer: false,
            generateStencilBuffer: false,
            samplingMode: Constants.TEXTURE_NEAREST_SAMPLINGMODE,
        });
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this._engine.updateTextureWrappingMode(
            rtw.texture!,
            Constants.TEXTURE_CLAMP_ADDRESSMODE,
            Constants.TEXTURE_CLAMP_ADDRESSMODE,
            Constants.TEXTURE_CLAMP_ADDRESSMODE
        );

        return rtw;
    }
}

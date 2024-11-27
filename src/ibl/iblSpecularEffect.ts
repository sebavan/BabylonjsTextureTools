import { EffectWrapper, EffectRenderer } from "@babylonjs/core/Materials/effectRenderer";
import { ThinEngine } from "@babylonjs/core/Engines/thinEngine";
import { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture";
import { Constants } from "@babylonjs/core/Engines/constants";
import { Tools } from "@babylonjs/core/Misc/tools";
import { Scalar } from "@babylonjs/core/Maths/math.scalar";
import { EnvironmentTextureTools } from "@babylonjs/core/Misc/environmentTextureTools";
import { RenderTargetWrapper } from "@babylonjs/core/Engines/renderTargetWrapper";

import "@babylonjs/core/Engines/Extensions/engine.renderTarget";
import "@babylonjs/core/Engines/Extensions/engine.renderTargetCube";

import "@babylonjs/core/Shaders/ShadersInclude/helperFunctions";
import "@babylonjs/core/Shaders/ShadersInclude/pbrHelperFunctions";
import "@babylonjs/core/Shaders/ShadersInclude/pbrBRDFFunctions";
import "@babylonjs/core/Shaders/ShadersInclude/importanceSampling";
import "@babylonjs/core/Shaders/ShadersInclude/hdrFilteringFunctions";

import fragmentShader from "./iblSpecularFragment.glsl";
import { SphericalPolynomial } from "@babylonjs/core";

export class IBLSpecularEffect {
    public rtw!: RenderTargetWrapper;

    private readonly _lodGenerationOffset = 0;
    private readonly _lodGenerationScale = 0.8;
    private readonly _engine: ThinEngine;
    private readonly _effectRenderer: EffectRenderer;

    constructor(engine: ThinEngine, effectRenderer: EffectRenderer) {
        this._engine = engine;
        this._effectRenderer = effectRenderer;
    }

    public render(texture: BaseTexture, size: number): void {
        this.rtw = this._createRenderTarget(size);

        const effectWrapper = this._getEffect(texture);

        this._effectRenderer.setViewport();

        const intTexture = texture.getInternalTexture();
        if (intTexture) {
            // Just in case generate fresh clean mips.
            this._engine.updateTextureSamplingMode(Constants.TEXTURE_TRILINEAR_SAMPLINGMODE, intTexture, true);
        }

        this._effectRenderer.applyEffectWrapper(effectWrapper);

        const textureWidth = texture.getSize().width;
        const mipmapsCount = Math.round(Scalar.Log2(textureWidth)) + 1;
        effectWrapper.effect.setTexture("environmentMap", texture);
        effectWrapper.effect.setFloat2("textureInfo", textureWidth, mipmapsCount - 1);

        const mipmapsCountOutput = Math.round(Scalar.Log2(size)) + 1;
        for (let face = 0; face < 6; face++) {
            for (let lod = 0; lod < mipmapsCountOutput; lod++) {
                this._engine.bindFramebuffer(this.rtw, face, undefined, undefined, true, lod);

                this._effectRenderer.applyEffectWrapper(effectWrapper);

                effectWrapper.effect.setFloat("face", face);

                let alpha = Math.pow(2, (lod - this._lodGenerationOffset) / this._lodGenerationScale) / size;
                if (lod === 0) {
                    alpha = 0;
                }

                effectWrapper.effect.setFloat("linearRoughness", alpha);

                this._effectRenderer.draw();
            }
        }

        this._engine.unBindFramebuffer(this.rtw);

        texture.sphericalPolynomial;
        effectWrapper.dispose();
    }

    public save(texture: BaseTexture, size: number): void {
        this.render(texture, size);

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const rtwTexture = this.rtw.texture!;
        rtwTexture._sphericalPolynomial = null;
        rtwTexture._sphericalPolynomialPromise = null;
        rtwTexture._sphericalPolynomialComputed = false;

        const babylonTexture = new BaseTexture(this._engine, rtwTexture);
        babylonTexture.lodGenerationOffset = this._lodGenerationOffset;
        babylonTexture.lodGenerationScale = this._lodGenerationScale;
        babylonTexture.gammaSpace = false;
        babylonTexture.forceSphericalPolynomialsRecompute();

        // Calling into it should trigger the computation.
        babylonTexture.sphericalPolynomial;
        const polynomialPromise: Promise<void | SphericalPolynomial> = babylonTexture.getInternalTexture()?._sphericalPolynomialPromise ?? Promise.resolve();

        polynomialPromise.then(() => {
            EnvironmentTextureTools.CreateEnvTextureAsync(babylonTexture).then((buffer: ArrayBuffer) => {
                const blob = new Blob([buffer], { type: "octet/stream" });
                Tools.Download(blob, "environment.env");
            })
            .catch((error: unknown) => {
                console.error(error);
                alert(error);
            });
        })
        .catch((error: unknown) => {
            console.error(error);
            alert(error);
        });
    }

    private _getEffect(texture: BaseTexture): EffectWrapper {
        const defines = [];
        if (texture.gammaSpace) {
            defines.push("#define GAMMA_INPUT");
        }

        const shader = defines.join("\n") + "\n" + fragmentShader;

        const effectWrapper = new EffectWrapper({
            engine: this._engine,
            name: "IBLSpecular",
            fragmentShader: shader,
            samplerNames: ["environmentMap"],
            uniformNames: ["textureInfo", "face", "linearRoughness"],
        });

        return effectWrapper;
    }

    private _createRenderTarget(size: number): RenderTargetWrapper {
        if (this.rtw) {
            this.rtw.dispose(false);
        }

        const rtw = this._engine.createRenderTargetCubeTexture(size, {
            format: Constants.TEXTUREFORMAT_RGBA,
            type: Constants.TEXTURETYPE_FLOAT,
            generateMipMaps: false,
            generateDepthBuffer: false,
            generateStencilBuffer: false,
            samplingMode: Constants.TEXTURE_NEAREST_SAMPLINGMODE,
        });
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const texture = rtw.texture!;

        this._engine.updateTextureWrappingMode(texture,
            Constants.TEXTURE_CLAMP_ADDRESSMODE,
            Constants.TEXTURE_CLAMP_ADDRESSMODE,
            Constants.TEXTURE_CLAMP_ADDRESSMODE);

        this._engine.updateTextureSamplingMode(Constants.TEXTURE_TRILINEAR_SAMPLINGMODE, texture, true);

        return rtw;
    }
}
import { EffectWrapper, EffectRenderer } from "@babylonjs/core/Materials/effectRenderer";
import { ThinEngine } from "@babylonjs/core/Engines/thinEngine";
import { InternalTexture } from "@babylonjs/core/Materials/Textures/internalTexture";
import { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture";
import { Constants } from "@babylonjs/core/Engines/constants";
import { Scalar } from "@babylonjs/core/Maths/math.scalar";

import "@babylonjs/core/Engines/Extensions/engine.renderTarget";
import "@babylonjs/core/Engines/Extensions/engine.renderTargetCube";

import "@babylonjs/core/Shaders/ShadersInclude/helperFunctions";
import "@babylonjs/core/Shaders/ShadersInclude/pbrHelperFunctions";
import "@babylonjs/core/Shaders/ShadersInclude/pbrBRDFFunctions";

import fragmentShader from "./iblDiffuseFragment.glsl";

export class IBLDiffuseEffect {
    public readonly texture: InternalTexture;

    private readonly _engine: ThinEngine;
    private readonly _effectRenderer: EffectRenderer;

    constructor(engine: ThinEngine, effectRenderer: EffectRenderer, size = 512) {
        this._engine = engine;
        this._effectRenderer = effectRenderer;

        this.texture = this._createRenderTarget(size);
    }

    public render(texture: BaseTexture): void {
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

        for (let face = 0; face < 6; face++) {
            this._engine.bindFramebuffer(this.texture, face);

            this._effectRenderer.applyEffectWrapper(effectWrapper);

            effectWrapper.effect.setFloat("face", face);

            this._effectRenderer.draw();
        }

        this._engine.unBindFramebuffer(this.texture);


        effectWrapper.dispose();
    }

    private _getEffect(texture: BaseTexture): EffectWrapper {
        const defines = [];
        if (texture.gammaSpace) {
            defines.push("#define GAMMA_INPUT");
        }

        const shader = defines.join("\n") + "\n" + fragmentShader;

        const effectWrapper = new EffectWrapper({
            engine: this._engine,
            name: "IBLDiffuse",
            fragmentShader: shader,
            samplerNames: ["environmentMap"],
            uniformNames: ["textureInfo", "face"],
        });

        return effectWrapper;
    }

    private _createRenderTarget(size: number): InternalTexture {
        const texture = this._engine.createRenderTargetCubeTexture(size, {
            format: Constants.TEXTUREFORMAT_RGBA,
            type: Constants.TEXTURETYPE_FLOAT,
            generateMipMaps: false,
            generateDepthBuffer: false,
            generateStencilBuffer: false,
            samplingMode: Constants.TEXTURE_NEAREST_SAMPLINGMODE
        });
        this._engine.updateTextureWrappingMode(texture,
            Constants.TEXTURE_CLAMP_ADDRESSMODE,
            Constants.TEXTURE_CLAMP_ADDRESSMODE,
            Constants.TEXTURE_CLAMP_ADDRESSMODE);

        return texture;
    }
}
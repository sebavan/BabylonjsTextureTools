import { EffectWrapper, EffectRenderer } from "@babylonjs/core/Materials/effectRenderer";
import { ThinEngine } from "@babylonjs/core/Engines/thinEngine";
import { InternalTexture } from "@babylonjs/core/Materials/Textures/internalTexture";
import { Constants } from "@babylonjs/core/Engines/constants";
import { Tools } from "@babylonjs/core/Misc/tools";

import "@babylonjs/core/Engines/Extensions/engine.renderTarget";

import "@babylonjs/core/Shaders/ShadersInclude/helperFunctions";
import "@babylonjs/core/Shaders/ShadersInclude/pbrHelperFunctions";
import "@babylonjs/core/Shaders/ShadersInclude/pbrBRDFFunctions";

import { BlitEffect } from "../blit/blitEffect";

import fragmentShader from "./brdfFragment.glsl";

export enum BRDFMode {
    CorrelatedGGXEnergieConservation,
    CorrelatedGGX,
    UncorrelatedGGX,
}

export class BRDFEffect {
    public readonly texture: InternalTexture;

    private readonly _size: number;
    private readonly _engine: ThinEngine;
    private readonly _effectRenderer: EffectRenderer;
    private readonly _blitEffect: BlitEffect;

    constructor(engine: ThinEngine, effectRenderer: EffectRenderer, size = 256) {
        this._size = size;
        this._engine = engine;
        this._effectRenderer = effectRenderer;
        this._blitEffect = new BlitEffect(this._engine, this._effectRenderer);

        this.texture = this._createRenderTarget(size);
    }

    public render(mode: BRDFMode, sheen: boolean, rgbd = false): void {
        const effectWrapper = this._getEffect(mode, sheen, rgbd);

        this._effectRenderer.render(effectWrapper, this.texture);
        effectWrapper.dispose();
    }

    public save(mode: BRDFMode, sheen: boolean): void {
        const canvas = this._engine.getRenderingCanvas();
        if (!canvas) {
            return;
        }

        this.render(mode, sheen, true);

        const oldWidth = this._engine.getRenderWidth();
        const oldHeight = this._engine.getRenderWidth();

        this._engine.setSize(this._size, this._size);

        this._blitEffect.blit(this.texture, true);

        // Reading datas from WebGL
        Tools.ToBlob(canvas, (blob) => {
            if (blob) {
                Tools.Download(blob, "rgbdBrdfLookup.png");
            }
        });

        this._engine.setSize(oldWidth, oldHeight);
    }

    private _getEffect(mode: BRDFMode, sheen: boolean, rgbd: boolean): EffectWrapper {
        const defines = [];
        if (rgbd) {
            defines.push("#define RGBD");
        }
        if (sheen) {
            defines.push("#define SHEEN");
        }
        switch(mode) {
            case BRDFMode.CorrelatedGGXEnergieConservation:
                defines.push("#define BRDF_V_HEIGHT_CORRELATED");
                defines.push("#define MS_BRDF_ENERGY_CONSERVATION");
                break;
            case BRDFMode.CorrelatedGGX:
                defines.push("#define BRDF_V_HEIGHT_CORRELATED");
                break;
            case BRDFMode.UncorrelatedGGX:
                // no special defines
                break;
        }

        const shader = defines.join("\n") + "\n" + fragmentShader;

        const effectWrapper = new EffectWrapper({
            engine: this._engine,
            name: "BRDF",
            fragmentShader: shader
        });

        return effectWrapper;
    }

    private _createRenderTarget(size: number): InternalTexture {
        const texture = this._engine.createRenderTargetTexture(size, {
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
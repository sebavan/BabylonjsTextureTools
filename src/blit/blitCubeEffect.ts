import { ThinEngine } from "@babylonjs/core/Engines/thinEngine";
import { EffectWrapper, EffectRenderer } from "@babylonjs/core/Materials/effectRenderer";
import { InternalTexture } from "@babylonjs/core/Materials/Textures/internalTexture";

import "@babylonjs/core/Shaders/ShadersInclude/helperFunctions";

import blitFragment from "./blitCube.glsl";
import { RenderTargetWrapper } from "@babylonjs/core/Engines/renderTargetWrapper";

export class BlitCubeEffect {
    private readonly _renderer: EffectRenderer;
    private readonly _blit: EffectWrapper;

    constructor(engine: ThinEngine, renderer: EffectRenderer) {
        this._renderer = renderer;
        this._blit = new EffectWrapper({
            name: "BlitCube",
            engine: engine,
            fragmentShader: blitFragment,
            samplerNames: ["textureSampler"],
            uniformNames: ["lod"],
        });
    }

    public blit(rttOrTexture: InternalTexture | RenderTargetWrapper, lod: number): void {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const texture = rttOrTexture instanceof RenderTargetWrapper ? rttOrTexture.texture! : rttOrTexture;
        this._blit.onApplyObservable.addOnce(() => {
            this._blit.effect.setFloat("lod", lod);
            this._blit.effect._bindTexture("textureSampler", texture);
        })
        this._renderer.render(this._blit);
    }
}
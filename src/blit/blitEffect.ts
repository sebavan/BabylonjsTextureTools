import { ThinEngine } from "@babylonjs/core/Engines/thinEngine";
import { EffectWrapper, EffectRenderer } from "@babylonjs/core/Materials/effectRenderer";
import { InternalTexture } from "@babylonjs/core/Materials/Textures/internalTexture";

import blitFragment from "./blit.glsl";
import { RenderTargetWrapper } from "@babylonjs/core/Engines/renderTargetWrapper";

export class BlitEffect {
    private readonly _renderer: EffectRenderer;
    private readonly _blit: EffectWrapper;

    constructor(engine: ThinEngine, renderer: EffectRenderer) {
        this._renderer = renderer;
        this._blit = new EffectWrapper({
            name: "Blit",
            engine: engine,
            fragmentShader: blitFragment,
            samplerNames: ["textureSampler"],
            uniformNames: ["invertY"],
        });
    }

    public blit(rttOrTexture: InternalTexture | RenderTargetWrapper, invertY = false): void {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const texture = rttOrTexture instanceof RenderTargetWrapper ? rttOrTexture.texture! : rttOrTexture;
        this._blit.onApplyObservable.addOnce(() => {
            this._blit.effect.setFloat("invertY", invertY ? 1.0 : 0.0);
            this._blit.effect._bindTexture("textureSampler", texture);
        })
        this._renderer.render(this._blit);
    }
}
import "@babylonjs/core/Engines/Extensions/engine.renderTarget";
import "@babylonjs/core/Engines/Extensions/engine.renderTargetCube";

import "@babylonjs/core/Shaders/ShadersInclude/helperFunctions";
import "@babylonjs/core/Shaders/ShadersInclude/pbrHelperFunctions";
import "@babylonjs/core/Shaders/ShadersInclude/pbrBRDFFunctions";
import "@babylonjs/core/Shaders/ShadersInclude/hdrFilteringFunctions";
import "@babylonjs/core/Shaders/ShadersInclude/importanceSampling";
import "@babylonjs/core/Maths/math.vector";
import Module from "./LTCGenerator";
import { Nullable } from "@babylonjs/core/types";

export class LTCEffect {

    constructor(private N: number, private Nsample: number, private MIN_ALPHA: number) {
    }

    public render(): Nullable<Float32Array> {
        if(Module) {
            const float32Array = Module.BuildLTC(this.N, this.Nsample, this.MIN_ALPHA);
            const numElements = float32Array.length;
            const ptr = float32Array.byteOffset;
            const array = new Float32Array(Module.HEAPF32.buffer, ptr, numElements);
            return array;
        }

        return null;
    }

    public save(data: Float32Array) : void {

    }
}


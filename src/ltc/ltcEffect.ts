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
import { ToHalfFloat } from "@babylonjs/core/Misc/textureTools";
import { Tools } from "@babylonjs/core/Misc/tools";

export class LTCEffect {
    constructor(
        private N: number,
        private Nsample: number,
        private MIN_ALPHA: number
    ) {}

    public render(): Nullable<Float32Array> {
        if (Module) {
            const float32Array = Module.BuildLTC(
                this.N,
                this.Nsample,
                this.MIN_ALPHA
            );
            const numElements = float32Array.length;
            const ptr = float32Array.byteOffset;
            const array = new Float32Array(
                Module.HEAPF32.buffer,
                ptr,
                numElements
            );
            return array;
        }

        return null;
    }

    public save(data: Float32Array): void {
        const dataSizeHalf = this.N * this.N * 4;
        // Array with 6 channels per pixel.
        const result = new Uint16Array(this.N * this.N * 8);

        for (let pixelIndex = 0; pixelIndex < this.N * this.N; pixelIndex++) {
            // LTC1 R value
            result[pixelIndex * 8] = ToHalfFloat(data[pixelIndex * 4]);

            // LTC1 G value
            result[pixelIndex * 8 + 1] = ToHalfFloat(data[pixelIndex * 4 + 1]);

            // LTC1 B value
            result[pixelIndex * 8 + 2] = ToHalfFloat(data[pixelIndex * 4 + 2]);

            // LTC1 A value
            result[pixelIndex * 8 + 3] = ToHalfFloat(data[pixelIndex * 4 + 3]);

            // LTC2 R value
            result[pixelIndex * 8 + 4] = ToHalfFloat(data[(pixelIndex * 4) + dataSizeHalf]);

            // LTC2 G value
            result[pixelIndex * 8 + 5] = ToHalfFloat(data[(pixelIndex * 4 + 1) + dataSizeHalf]);

            // LTC2 B value
            result[pixelIndex * 8 + 6] = ToHalfFloat(data[(pixelIndex * 4 + 2) + dataSizeHalf]);

            // LTC2 A value
            result[pixelIndex * 8 + 7] = ToHalfFloat(data[(pixelIndex * 4 + 3) + dataSizeHalf]);
        }

        console.log(result);
        Tools.DownloadBlob(new Blob([result.buffer]), "areaLightsLTC.bin");
    }
}

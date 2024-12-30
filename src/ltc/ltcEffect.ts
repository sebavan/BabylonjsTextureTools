import "@babylonjs/core/Engines/Extensions/engine.renderTarget";
import "@babylonjs/core/Engines/Extensions/engine.renderTargetCube";

import "@babylonjs/core/Shaders/ShadersInclude/helperFunctions";
import "@babylonjs/core/Shaders/ShadersInclude/pbrHelperFunctions";
import "@babylonjs/core/Shaders/ShadersInclude/pbrBRDFFunctions";
import "@babylonjs/core/Shaders/ShadersInclude/hdrFilteringFunctions";
import "@babylonjs/core/Shaders/ShadersInclude/importanceSampling";
import "@babylonjs/core/Maths/math.vector";

async function loadWasm(fileName: string): Promise<WebAssembly.Instance> 
{ 
    const response = await fetch(fileName); 
    const buffer = await response.arrayBuffer(); 
    const module = await WebAssembly.compile(buffer); 
    const instance = await WebAssembly.instantiate(module); 
    return instance;
}

export class LTCEffect {

    private wasmInstance: Promise<WebAssembly.Instance>;

    constructor() {
        this.wasmInstance = loadWasm("wasm/ltcGenerator.wasm");
    }

    public async render(N: number): Promise<void> {
        const generateBRDF = (await this.wasmInstance).exports.myFunction as Function; 
        const result = generateBRDF(N);
    }
}


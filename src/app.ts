import { TextureTools } from "./textureTools/textureTools";
import { BRDFMode } from "./brdf/brdfEffect";
import { HDRCubeTexture } from "@babylonjs/core/Materials/Textures/hdrCubeTexture";
import { CubeTexture } from "@babylonjs/core/Materials/Textures/cubeTexture";
import { FilesInputStore } from "@babylonjs/core/Misc/filesInputStore";
import { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture";
import { Scene } from "@babylonjs/core/scene";

import "@babylonjs/core/Materials/Textures/Loaders/ddsTextureLoader";
import "@babylonjs/core/Materials/Textures/Loaders/ktxTextureLoader";

import("@babylonjs/core/Shaders/hdrIrradianceFiltering.vertex");
import("@babylonjs/core/Shaders/hdrIrradianceFiltering.fragment");
import("@babylonjs/core/Shaders/hdrFiltering.vertex");
import("@babylonjs/core/Shaders/hdrFiltering.fragment");

import "./ltc/ltcEffect";


// Custom types
const enum TextureMode {
    brdf,
    ibl,
    iblsh,
    ltc
}

// Find our elements
const mainCanvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const headerTitle = document.getElementById("headerTitle") as HTMLCanvasElement;
const iblTools = document.getElementById("iblTools") as HTMLCanvasElement;
const iblSHTools = document.getElementById("iblSHTools") as HTMLCanvasElement;
const iblInvite = document.getElementById("iblInvite") as HTMLCanvasElement;
const iblInviteText = document.getElementById("iblInviteText") as HTMLCanvasElement;
const ltcInvite = document.getElementById("ltcInvite") as HTMLCanvasElement;
const ltcInviteText = document.getElementById("ltcInviteText") as HTMLCanvasElement;
const brdfTools = document.getElementById("brdfTools") as HTMLCanvasElement;
const ltcTools = document.getElementById("ltcTools") as HTMLCanvasElement;

const iblFooter = document.getElementById("iblFooter") as HTMLDivElement;
const correlatedEC = document.getElementById("correlatedEC") as HTMLElement;
const correlated = document.getElementById("correlated") as HTMLElement;
const uncorrelated = document.getElementById("uncorrelated") as HTMLElement;
const toggleSheen = document.getElementById("toggleSheen") as HTMLElement;
const saveBRDF = document.getElementById("saveBRDF") as HTMLElement;
const saveLTC  = document.getElementById("saveLTC") as HTMLElement;

const ltcFooter = document.getElementById("ltcFooter") as HTMLDivElement;
const brdfFooter = document.getElementById("brdfFooter") as HTMLDivElement;
const iblDiffuse = document.getElementById("iblDiffuse") as HTMLElement;
const iblSpecular0 = document.getElementById("iblSpecular0") as HTMLElement;
const iblSpecular1 = document.getElementById("iblSpecular1") as HTMLElement;
const iblSpecular2 = document.getElementById("iblSpecular2") as HTMLElement;
const iblSpecular3 = document.getElementById("iblSpecular3") as HTMLElement;
const iblSpecular4 = document.getElementById("iblSpecular4") as HTMLElement;
const iblSpecular5 = document.getElementById("iblSpecular5") as HTMLElement;
const iblSpecular6 = document.getElementById("iblSpecular6") as HTMLElement;
const iblSpecular64 = document.getElementById("iblSpecular64") as HTMLElement;
const save256 = document.getElementById("save256") as HTMLElement;

// Texture tools current state.
const textureCanvas = new TextureTools(mainCanvas);
// Keep a dummy scene to avoid procedural textures issues
new Scene(textureCanvas.engine);

let brdfMode = BRDFMode.CorrelatedGGXEnergieConservation;
let brdfSheen = true;
let cubeTexture: BaseTexture | undefined;
let textureMode = TextureMode.ibl;

// Switch IBL and BRDF mode
const setMode = (mode: TextureMode): void => {
    iblInvite.style.display = "none";
    ltcInvite.style.display = "none";

    textureMode = mode;

    switch (mode) {
        case TextureMode.brdf:
            headerTitle.innerText = "BRDF";
            iblFooter.style.display = "none";
            ltcFooter.style.display = "none"
            brdfFooter.style.display = "block";
            break;
        case TextureMode.ibl:
            headerTitle.innerText = "IBL";
            iblFooter.style.display = "block";
            brdfFooter.style.display = "none";
            ltcFooter.style.display = "none";
            iblInvite.style.display = "block";
            iblInviteText.innerText = "Drag and drop an hdr file here to start processing.";
            break;
        case TextureMode.iblsh:
            textureCanvas.clear();
            headerTitle.innerText = "IBL SH";
            iblFooter.style.display = "block";
            brdfFooter.style.display = "none";
            ltcFooter.style.display = "none";
            iblInvite.style.display = "block";
            iblInviteText.innerText = "Drag and drop an hdr file here to start processing.";
            break;
        case TextureMode.ltc:
            textureCanvas.clear();
            headerTitle.innerText = "LTC";
            iblFooter.style.display = "none";
            brdfFooter.style.display = "none";
            ltcFooter.style.display = "block";
            ltcInviteText.innerText = "Click to generate LTC data";
            ltcInvite.style.display = "block";
            break;
    }
}

// Specular IBL generation
const generateSpecularIBL = function(size = 512): void {
    if (cubeTexture) {
        iblInviteText.innerText = "Processing...";
        setTimeout(() => {
            cubeTexture && textureCanvas.saveSpecularIBL(cubeTexture, size);
            iblInvite.style.display = "none";
        }, 50);
    }
}

// Blit IBL generation result
const renderSpecularIBL = function(lod: number): void {
    textureCanvas.blitSpecularIBL(lod);
}

const renderLTCData = function() : void {
    ltcInviteText.innerText = "Generating LTC texture. See console log for progress.";

    setTimeout(() => {
        const ltcData = textureCanvas.renderLTC();
        if (ltcData) {
            textureCanvas.saveLTC(ltcData);
        }
    }, 50);

    
}

// BRDF generation
const renderBRDF = (): void => {
    textureCanvas.renderBRDF(brdfMode, brdfSheen);
};

// Initializes
setMode(TextureMode.ibl);

// User Events
brdfTools.onclick = (): void => {
    setMode(TextureMode.brdf);
};
iblTools.onclick = (): void => {
    setMode(TextureMode.ibl);
};
iblSHTools.onclick = (): void => {
    setMode(TextureMode.iblsh);
};
ltcTools.onclick = (): void => {
    setMode(TextureMode.ltc)
}

correlatedEC.onclick = (): void => {
    brdfMode = BRDFMode.CorrelatedGGXEnergieConservation;
    renderBRDF();
};
correlated.onclick = (): void => {
    brdfMode = BRDFMode.CorrelatedGGX;
    renderBRDF();
};
uncorrelated.onclick = (): void => {
    brdfMode = BRDFMode.UncorrelatedGGX;
    renderBRDF();
};
toggleSheen.onclick = (): void => {
    brdfSheen = !brdfSheen;
    renderBRDF();
};
saveBRDF.onclick = (): void => {
    textureCanvas.saveBRDF(brdfMode, brdfSheen);
};

saveLTC.onclick = (): void => {
    renderLTCData();
}

iblDiffuse.onclick = (): void => {
    if (cubeTexture) {
        textureCanvas.renderDiffuseIBL(cubeTexture);
    }
};
iblSpecular0.onclick = (): void => {
    renderSpecularIBL(0);
};
iblSpecular1.onclick = (): void => {
    renderSpecularIBL(1);
};
iblSpecular2.onclick = (): void => {
    renderSpecularIBL(2);
};
iblSpecular3.onclick = (): void => {
    renderSpecularIBL(3);
};
iblSpecular4.onclick = (): void => {
    renderSpecularIBL(4);
};
iblSpecular5.onclick = (): void => {
    renderSpecularIBL(5);
};
iblSpecular6.onclick = (): void => {
    renderSpecularIBL(6);
};
iblSpecular64.onclick = (): void => {
    renderSpecularIBL(6.4);
};
save256.onclick = (): void => {
    generateSpecularIBL(256);
};

// File Drag and Drop
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loadFiles = function(event: any): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let _filesToLoad: any[] | undefined;

    // Handling data transfer via drag'n'drop
    if (event && event.dataTransfer && event.dataTransfer.files) {
        _filesToLoad = event.dataTransfer.files;
    }

    // Handling files from input files
    if (event && event.target && event.target.files) {
        _filesToLoad = event.target.files;
    }

    if (!_filesToLoad || _filesToLoad.length === 0) {
        return;
    }

    if (_filesToLoad && _filesToLoad.length > 0) {
        const files = new Array<File>();
        const items = event.dataTransfer ? event.dataTransfer.items : null;

        for (let i = 0; i < _filesToLoad.length; i++) {
            const fileToLoad = _filesToLoad[i];

            let entry;
            if (items) {
                const item = items[i];
                if (item.getAsEntry) {
                    entry = item.getAsEntry();
                } else if (item.webkitGetAsEntry) {
                    entry = item.webkitGetAsEntry();
                }
            }

            if (!entry) {
                files.push(fileToLoad);
            } else if (!entry.isDirectory) {
                files.push(fileToLoad);
            }
        }

        textureCanvas.engine.clearInternalTexturesCache();

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const name = files[i].name.toLowerCase();
            const extension = name.split('.').pop();
    
            if (extension === "dds" || extension === "ktx") {
                FilesInputStore.FilesToLoad[name] = file;
                cubeTexture = new CubeTexture("file:" + name, textureCanvas.engine, null, false, null, () => {
                    generateSpecularIBL();
                });
                return;
            }
            else if (extension === "hdr") {
                FilesInputStore.FilesToLoad[name] = file;
                const generateIrradiance = textureMode === TextureMode.ibl;

                cubeTexture = new HDRCubeTexture("file:" + name, textureCanvas.engine, 512, false, false, false, true, () => {
                    generateSpecularIBL();
                }, () => {
                    console.log("Error loading HDR file");
                }, false, generateIrradiance, generateIrradiance);
                return;
            }
            else if (extension === "jpg" || extension === "png") {
                const indexPX = name.indexOf("_px");
                if (indexPX > -1) {
                    for (let j = 0; j < files.length; j++) {
                        const sbFile = files[j];
                        const sbName = files[j].name.toLowerCase();
                        FilesInputStore.FilesToLoad[sbName] = sbFile;
                    }

                    const prefix = name.substr(0, indexPX);
                    cubeTexture = new CubeTexture("file:" + prefix, textureCanvas.engine, null, false, null, () => {
                        generateSpecularIBL();
                    });
                    return;
                }
            }
        }

        iblInviteText.innerText = "No Texture to process. Try with an HDR file."
    }
}

const drag = function(e: DragEvent): void {
    e.stopPropagation();
    e.preventDefault();
}

const drop = function(eventDrop: DragEvent): void {
    eventDrop.stopPropagation();
    eventDrop.preventDefault();

    loadFiles(eventDrop);
}

const _dragEnterHandler = (e: DragEvent): void => { drag(e); };
const _dragOverHandler = (e: DragEvent): void => { drag(e); };
const _dropHandler = (e: DragEvent): void => { drop(e); };

mainCanvas.addEventListener("dragenter", _dragEnterHandler, false);
mainCanvas.addEventListener("dragover", _dragOverHandler, false);
mainCanvas.addEventListener("drop", _dropHandler, false);
iblInvite.addEventListener("dragenter", _dragEnterHandler, false);
iblInvite.addEventListener("dragover", _dragOverHandler, false);
iblInvite.addEventListener("drop", _dropHandler, false);
iblInviteText.addEventListener("dragenter", _dragEnterHandler, false);
iblInviteText.addEventListener("dragover", _dragOverHandler, false);
iblInviteText.addEventListener("drop", _dropHandler, false);
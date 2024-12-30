import { Vector3 } from "@babylonjs/core";
import { BRDF } from "./brdf";

export class DisneyDiffuseBRDF implements BRDF {

    sample(V: Vector3, alpha: number, U1: number, U2: number): Vector3 {
        throw new Error("Method not implemented.");
    }
    eval(V: Vector3, L: Vector3, alpha: number, pdf: number): number {
        throw new Error("Method not implemented.");
    }

}
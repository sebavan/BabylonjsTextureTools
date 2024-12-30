import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export interface BRDF {
    sample(V: Vector3, alpha: number, U1: number, U2: number) : Vector3;
    eval(V: Vector3, L: Vector3, alpha: number, pdf: number) : number;
}
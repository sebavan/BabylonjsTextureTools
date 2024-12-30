import { Vector3 } from "@babylonjs/core";
import { BRDF } from "./brdf";

export class BeckmannBRDF implements BRDF {
    
    sample(V: Vector3, alpha: number, U1: number, U2: number): Vector3 {
        const phi = 2.0*3.14159 * U1;
        const r = alpha*Math.sqrt(-Math.log(U2));
        const N = (new Vector3(r* Math.cos(phi), r* Math.sin(phi), 1.0)).normalize();
        const NdotV = Vector3.Dot(N, V) * 2.0;
        const L =  N.multiplyByFloats(NdotV, NdotV, NdotV).add(V.negate());
        return L;
    }

    private lambda(alpha: number, cosTheta: number): number
    {
        const a = 1.0 / alpha / Math.tan(Math.acos(cosTheta));
        return (cosTheta < 1.0) ? (1.0 - 1.259*a + 0.396*a*a) / (3.535*a + 2.181*a*a) : 0.0;
    }

    eval(V: Vector3, L: Vector3, alpha: number, pdf: number): number {
        if (V.z <= 0)
        {
            pdf = 0;
            return 0;
        }

        // masking
        let LambdaV = this.lambda(alpha, V.z);

        // shadowing
        let G2 = 0.0;
        if (L.z <= 0.0)
            G2 = 0;
        else
        {
            const LambdaL = this.lambda(alpha, L.z);
            G2 = 1.0/(1.0 + LambdaV + LambdaL);
        }

        // D
        const H = (V.add(L)).normalizeToNew();
        const slopex = H.x/H.z;
        const slopey = H.y/H.z;
        let D = Math.exp(-(slopex*slopex + slopey*slopey)/(alpha*alpha)) / (3.14159 * alpha*alpha * H.z*H.z*H.z*H.z);

        pdf = Math.abs(D * H.z / 4.0 / Vector3.Dot(V, H));
        let res = D * G2 / 4.0 / V.z;
        return res;
    }
}
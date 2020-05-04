import { Effect } from "@babylonjs/core/Materials/effect";

import hammersley from "./hammersley.glsl";
import importanceSampling from "./importanceSampling.glsl";

export function setupSharedShaders(): void {
    Effect.IncludesShadersStore["hammersley"] = hammersley;
    Effect.IncludesShadersStore["importanceSampling"] = importanceSampling;
}
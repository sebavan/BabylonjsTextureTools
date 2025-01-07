// my_module.d.ts
declare const Module: {
    onRuntimeInitialized: () => void;
    HEAPF32: Float32Array;
    BuildLTC: any;
};
export default Module;

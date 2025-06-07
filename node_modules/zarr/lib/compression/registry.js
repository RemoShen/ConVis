const registry = new Map();
export function addCodec(id, importFn) {
    registry.set(id, importFn);
}
export async function getCodec(config) {
    if (!registry.has(config.id)) {
        throw new Error(`Compression codec ${config.id} is not supported by Zarr.js yet.`);
    }
    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    const codec = await registry.get(config.id)();
    return codec.fromConfig(config);
}
//# sourceMappingURL=registry.js.map
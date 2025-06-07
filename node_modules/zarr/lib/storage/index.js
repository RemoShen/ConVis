import { normalizeStoragePath, normalizeChunks, normalizeDtype, normalizeShape, normalizeOrder, normalizeFillValue } from '../util';
import { ARRAY_META_KEY, GROUP_META_KEY } from '../names';
import { ContainsArrayError, ContainsGroupError } from '../errors';
/**
 * Return true if the store contains an array at the given logical path.
 */
export async function containsArray(store, path = null) {
    path = normalizeStoragePath(path);
    const prefix = pathToPrefix(path);
    const key = prefix + ARRAY_META_KEY;
    return store.containsItem(key);
}
/**
 * Return true if the store contains a group at the given logical path.
 */
export async function containsGroup(store, path = null) {
    path = normalizeStoragePath(path);
    const prefix = pathToPrefix(path);
    const key = prefix + GROUP_META_KEY;
    return store.containsItem(key);
}
export function pathToPrefix(path) {
    // assume path already normalized
    if (path.length > 0) {
        return path + '/';
    }
    return '';
}
async function listDirFromKeys(store, path) {
    // assume path already normalized
    const prefix = pathToPrefix(path);
    const children = new Set();
    for (const key in await store.keys()) {
        if (key.startsWith(prefix) && key.length > prefix.length) {
            const suffix = key.slice(prefix.length);
            const child = suffix.split('/')[0];
            children.add(child);
        }
    }
    return Array.from(children).sort();
}
async function requireParentGroup(store, path, chunkStore, overwrite) {
    // Assume path is normalized
    if (path.length === 0) {
        return;
    }
    const segments = path.split("/");
    let p = "";
    for (const s of segments.slice(0, segments.length - 1)) {
        p += s;
        if (await containsArray(store, p)) {
            await initGroupMetadata(store, p, overwrite);
        }
        else if (!await containsGroup(store, p)) {
            await initGroupMetadata(store, p);
        }
        p += "/";
    }
}
/**
 * Obtain a directory listing for the given path. If `store` provides a `listDir`
 *  method, this will be called, otherwise will fall back to implementation via the
 *  `MutableMapping` interface.
 * @param store
 */
export async function listDir(store, path = null) {
    path = normalizeStoragePath(path);
    if (store.listDir) {
        return store.listDir(path);
    }
    else {
        return listDirFromKeys(store, path);
    }
}
async function initGroupMetadata(store, path = null, overwrite = false) {
    path = normalizeStoragePath(path);
    // Guard conditions
    if (overwrite) {
        throw Error("Group overwriting not implemented yet :(");
    }
    else if (await containsArray(store, path)) {
        throw new ContainsArrayError(path);
    }
    else if (await containsGroup(store, path)) {
        throw new ContainsGroupError(path);
    }
    const metadata = { zarr_format: 2 };
    const key = pathToPrefix(path) + GROUP_META_KEY;
    await store.setItem(key, JSON.stringify(metadata));
}
/**
 *  Initialize a group store. Note that this is a low-level function and there should be no
 *  need to call this directly from user code.
 */
export async function initGroup(store, path = null, chunkStore = null, overwrite = false) {
    path = normalizeStoragePath(path);
    await requireParentGroup(store, path, chunkStore, overwrite);
    await initGroupMetadata(store, path, overwrite);
}
async function initArrayMetadata(store, shape, chunks, dtype, path, compressor, fillValue, order, overwrite, chunkStore, filters, dimensionSeparator) {
    // Guard conditions
    if (overwrite) {
        throw Error("Array overwriting not implemented yet :(");
    }
    else if (await containsArray(store, path)) {
        throw new ContainsArrayError(path);
    }
    else if (await containsGroup(store, path)) {
        throw new ContainsGroupError(path);
    }
    // Normalize metadata,  does type checking too.
    dtype = normalizeDtype(dtype);
    shape = normalizeShape(shape);
    chunks = normalizeChunks(chunks, shape);
    order = normalizeOrder(order);
    fillValue = normalizeFillValue(fillValue);
    if (filters !== null && filters.length > 0) {
        throw Error("Filters are not supported yet");
    }
    let serializedFillValue = fillValue;
    if (typeof fillValue === "number") {
        if (Number.isNaN(fillValue))
            serializedFillValue = "NaN";
        if (Number.POSITIVE_INFINITY === fillValue)
            serializedFillValue = "Infinity";
        if (Number.NEGATIVE_INFINITY === fillValue)
            serializedFillValue = "-Infinity";
    }
    filters = null;
    const metadata = {
        zarr_format: 2,
        shape: shape,
        chunks: chunks,
        dtype: dtype,
        fill_value: serializedFillValue,
        order: order,
        compressor: compressor,
        filters: filters,
    };
    if (dimensionSeparator) {
        metadata.dimension_separator = dimensionSeparator;
    }
    const metaKey = pathToPrefix(path) + ARRAY_META_KEY;
    await store.setItem(metaKey, JSON.stringify(metadata));
}
/**
 *
 * Initialize an array store with the given configuration. Note that this is a low-level
 * function and there should be no need to call this directly from user code
 */
export async function initArray(store, shape, chunks, dtype, path = null, compressor = null, fillValue = null, order = "C", overwrite = false, chunkStore = null, filters = null, dimensionSeparator) {
    path = normalizeStoragePath(path);
    await requireParentGroup(store, path, chunkStore, overwrite);
    await initArrayMetadata(store, shape, chunks, dtype, path, compressor, fillValue, order, overwrite, chunkStore, filters, dimensionSeparator);
}
//# sourceMappingURL=index.js.map
import { containsGroup, pathToPrefix } from '../storage/index';
import { normalizeStoragePath, isTotalSlice, arrayEquals1D, byteSwap, byteSwapInplace, convertColMajorToRowMajor } from '../util';
import { ARRAY_META_KEY, ATTRS_META_KEY } from '../names';
import { Attributes } from "../attributes";
import { parseMetadata } from "../metadata";
import { BasicIndexer, isContiguousSelection, normalizeIntegerSelection } from './indexing';
import { NestedArray } from "../nestedArray";
import { RawArray } from "../rawArray";
import { getTypedArrayCtr } from '../nestedArray/types';
import { ValueError, PermissionError, BoundsCheckError, ContainsGroupError, isKeyError } from '../errors';
import { getCodec } from "../compression/registry";
import PQueue from 'p-queue';
export class ZarrArray {
    /**
     * Instantiate an array from an initialized store.
     * @param store Array store, already initialized.
     * @param path Storage path.
     * @param metadata The initial value for the metadata
     * @param readOnly True if array should be protected against modification.
     * @param chunkStore Separate storage for chunks. If not provided, `store` will be used for storage of both chunks and metadata.
     * @param cacheMetadata If true (default), array configuration metadata will be cached for the lifetime of the object.
     * If false, array metadata will be reloaded prior to all data access and modification operations (may incur overhead depending on storage and data access pattern).
     * @param cacheAttrs If true (default), user attributes will be cached for attribute read operations.
     * If false, user attributes are reloaded from the store prior to all attribute read operations.
     */
    constructor(store, path = null, metadata, readOnly = false, chunkStore = null, cacheMetadata = true, cacheAttrs = true) {
        // N.B., expect at this point store is fully initialized with all
        // configuration metadata fully specified and normalized
        this.store = store;
        this._chunkStore = chunkStore;
        this.path = normalizeStoragePath(path);
        this.keyPrefix = pathToPrefix(this.path);
        this.readOnly = readOnly;
        this.cacheMetadata = cacheMetadata;
        this.cacheAttrs = cacheAttrs;
        this.meta = metadata;
        if (this.meta.compressor !== null) {
            this.compressor = getCodec(this.meta.compressor);
        }
        else {
            this.compressor = null;
        }
        const attrKey = this.keyPrefix + ATTRS_META_KEY;
        this.attrs = new Attributes(this.store, attrKey, this.readOnly, cacheAttrs);
    }
    /**
     * A `Store` providing the underlying storage for array chunks.
     */
    get chunkStore() {
        if (this._chunkStore) {
            return this._chunkStore;
        }
        return this.store;
    }
    /**
     * Array name following h5py convention.
     */
    get name() {
        if (this.path.length > 0) {
            if (this.path[0] !== "/") {
                return "/" + this.path;
            }
            return this.path;
        }
        return null;
    }
    /**
     * Final component of name.
     */
    get basename() {
        const name = this.name;
        if (name === null) {
            return null;
        }
        const parts = name.split("/");
        return parts[parts.length - 1];
    }
    /**
     * "A list of integers describing the length of each dimension of the array.
     */
    get shape() {
        // this.refreshMetadata();
        return this.meta.shape;
    }
    /**
     * A list of integers describing the length of each dimension of a chunk of the array.
     */
    get chunks() {
        return this.meta.chunks;
    }
    /**
     * Integer describing how many element a chunk contains
     */
    get chunkSize() {
        return this.chunks.reduce((x, y) => x * y, 1);
    }
    /**
     *  The NumPy data type.
     */
    get dtype() {
        return this.meta.dtype;
    }
    /**
     *  A value used for uninitialized portions of the array.
     */
    get fillValue() {
        const fillTypeValue = this.meta.fill_value;
        // TODO extract into function
        if (fillTypeValue === "NaN") {
            return NaN;
        }
        else if (fillTypeValue === "Infinity") {
            return Infinity;
        }
        else if (fillTypeValue === "-Infinity") {
            return -Infinity;
        }
        return this.meta.fill_value;
    }
    /**
     *  Number of dimensions.
     */
    get nDims() {
        return this.meta.shape.length;
    }
    /**
     *  The total number of elements in the array.
     */
    get size() {
        // this.refreshMetadata()
        return this.meta.shape.reduce((x, y) => x * y, 1);
    }
    get length() {
        return this.shape[0];
    }
    get _chunkDataShape() {
        if (this.shape.length === 0) {
            return [1];
        }
        else {
            const s = [];
            for (let i = 0; i < this.shape.length; i++) {
                s[i] = Math.ceil(this.shape[i] / this.chunks[i]);
            }
            return s;
        }
    }
    /**
     * A tuple of integers describing the number of chunks along each
     * dimension of the array.
     */
    get chunkDataShape() {
        // this.refreshMetadata();
        return this._chunkDataShape;
    }
    /**
     * Total number of chunks.
     */
    get numChunks() {
        // this.refreshMetadata();
        return this.chunkDataShape.reduce((x, y) => x * y, 1);
    }
    /**
     * Instantiate an array from an initialized store.
     * @param store Array store, already initialized.
     * @param path Storage path.
     * @param readOnly True if array should be protected against modification.
     * @param chunkStore Separate storage for chunks. If not provided, `store` will be used for storage of both chunks and metadata.
     * @param cacheMetadata If true (default), array configuration metadata will be cached for the lifetime of the object.
     * If false, array metadata will be reloaded prior to all data access and modification operations (may incur overhead depending on storage and data access pattern).
     * @param cacheAttrs If true (default), user attributes will be cached for attribute read operations.
     * If false, user attributes are reloaded from the store prior to all attribute read operations.
     */
    static async create(store, path = null, readOnly = false, chunkStore = null, cacheMetadata = true, cacheAttrs = true) {
        const metadata = await this.loadMetadataForConstructor(store, path);
        return new ZarrArray(store, path, metadata, readOnly, chunkStore, cacheMetadata, cacheAttrs);
    }
    static async loadMetadataForConstructor(store, path) {
        try {
            path = normalizeStoragePath(path);
            const keyPrefix = pathToPrefix(path);
            const metaStoreValue = await store.getItem(keyPrefix + ARRAY_META_KEY);
            return parseMetadata(metaStoreValue);
        }
        catch (error) {
            if (await containsGroup(store, path)) {
                throw new ContainsGroupError(path !== null && path !== void 0 ? path : '');
            }
            throw new Error("Failed to load metadata for ZarrArray:" + error.toString());
        }
    }
    /**
     * (Re)load metadata from store
     */
    async reloadMetadata() {
        const metaKey = this.keyPrefix + ARRAY_META_KEY;
        const metaStoreValue = this.store.getItem(metaKey);
        this.meta = parseMetadata(await metaStoreValue);
        return this.meta;
    }
    async refreshMetadata() {
        if (!this.cacheMetadata) {
            await this.reloadMetadata();
        }
    }
    get(selection = null, opts = {}) {
        return this.getBasicSelection(selection, false, opts);
    }
    getRaw(selection = null, opts = {}) {
        return this.getBasicSelection(selection, true, opts);
    }
    async getBasicSelection(selection, asRaw = false, { concurrencyLimit = 10, progressCallback, storeOptions } = {}) {
        // Refresh metadata
        if (!this.cacheMetadata) {
            await this.reloadMetadata();
        }
        // Check fields (TODO?)
        if (this.shape.length === 0) {
            throw new Error("Shape [] indexing is not supported yet");
        }
        else {
            return this.getBasicSelectionND(selection, asRaw, concurrencyLimit, progressCallback, storeOptions);
        }
    }
    getBasicSelectionND(selection, asRaw, concurrencyLimit, progressCallback, storeOptions) {
        const indexer = new BasicIndexer(selection, this);
        return this.getSelection(indexer, asRaw, concurrencyLimit, progressCallback, storeOptions);
    }
    async getSelection(indexer, asRaw, concurrencyLimit, progressCallback, storeOptions) {
        // We iterate over all chunks which overlap the selection and thus contain data
        // that needs to be extracted. Each chunk is processed in turn, extracting the
        // necessary data and storing into the correct location in the output array.
        // N.B., it is an important optimisation that we only visit chunks which overlap
        // the selection. This minimises the number of iterations in the main for loop.
        // check fields are sensible (TODO?)
        const outDtype = this.dtype;
        const outShape = indexer.shape;
        const outSize = indexer.shape.reduce((x, y) => x * y, 1);
        if (asRaw && (outSize === this.chunkSize)) {
            // Optimization: if output strided array _is_ chunk exactly,
            // decode directly as new TypedArray and return
            const itr = indexer.iter();
            const proj = itr.next(); // ensure there is only one projection
            if (proj.done === false && itr.next().done === true) {
                const chunkProjection = proj.value;
                const out = await this.decodeDirectToRawArray(chunkProjection, outShape, outSize);
                return out;
            }
        }
        const out = asRaw
            ? new RawArray(null, outShape, outDtype)
            : new NestedArray(null, outShape, outDtype);
        if (outSize === 0) {
            return out;
        }
        // create promise queue with concurrency control
        const queue = new PQueue({ concurrency: concurrencyLimit });
        const allTasks = [];
        if (progressCallback) {
            let progress = 0;
            let queueSize = 0;
            for (const _ of indexer.iter())
                queueSize += 1;
            progressCallback({ progress: 0, queueSize: queueSize });
            for (const proj of indexer.iter()) {
                allTasks.push(queue.add(async () => {
                    await this.chunkGetItem(proj.chunkCoords, proj.chunkSelection, out, proj.outSelection, indexer.dropAxes, storeOptions);
                    progress += 1;
                    progressCallback({ progress: progress, queueSize: queueSize });
                }));
            }
        }
        else {
            for (const proj of indexer.iter()) {
                allTasks.push(queue.add(() => this.chunkGetItem(proj.chunkCoords, proj.chunkSelection, out, proj.outSelection, indexer.dropAxes, storeOptions)));
            }
        }
        // guarantees that all work on queue has finished and throws if any of the tasks errored.
        await Promise.all(allTasks);
        // Return scalar instead of zero-dimensional array.
        if (out.shape.length === 0) {
            return out.data[0];
        }
        return out;
    }
    /**
     * Obtain part or whole of a chunk.
     * @param chunkCoords Indices of the chunk.
     * @param chunkSelection Location of region within the chunk to extract.
     * @param out Array to store result in.
     * @param outSelection Location of region within output array to store results in.
     * @param dropAxes Axes to squeeze out of the chunk.
     */
    async chunkGetItem(chunkCoords, chunkSelection, out, outSelection, dropAxes, storeOptions) {
        if (chunkCoords.length !== this._chunkDataShape.length) {
            throw new ValueError(`Inconsistent shapes: chunkCoordsLength: ${chunkCoords.length}, cDataShapeLength: ${this.chunkDataShape.length}`);
        }
        const cKey = this.chunkKey(chunkCoords);
        try {
            const cdata = await this.chunkStore.getItem(cKey, storeOptions);
            const decodedChunk = await this.decodeChunk(cdata);
            if (out instanceof NestedArray) {
                if (isContiguousSelection(outSelection) && isTotalSlice(chunkSelection, this.chunks) && !this.meta.filters) {
                    // Optimization: we want the whole chunk, and the destination is
                    // contiguous, so we can decompress directly from the chunk
                    // into the destination array
                    // TODO check order
                    // TODO filters..
                    out.set(outSelection, this.toNestedArray(decodedChunk));
                    return;
                }
                // Decode chunk
                const chunk = this.toNestedArray(decodedChunk);
                const tmp = chunk.get(chunkSelection);
                if (dropAxes !== null) {
                    throw new Error("Drop axes is not supported yet");
                }
                out.set(outSelection, tmp);
            }
            else {
                /* RawArray
                Copies chunk by index directly into output. Doesn't matter if selection is contiguous
                since store/output are different shapes/strides.
                */
                out.set(outSelection, this.chunkBufferToRawArray(decodedChunk), chunkSelection);
            }
        }
        catch (error) {
            if (isKeyError(error)) {
                // fill with scalar if cKey doesn't exist in store
                if (this.fillValue !== null) {
                    out.set(outSelection, this.fillValue);
                }
            }
            else {
                // Different type of error - rethrow
                throw error;
            }
        }
    }
    async getRawChunk(chunkCoords, opts) {
        if (chunkCoords.length !== this.shape.length) {
            throw new Error(`Chunk coordinates ${chunkCoords.join(".")} do not correspond to shape ${this.shape}.`);
        }
        try {
            for (let i = 0; i < chunkCoords.length; i++) {
                const dimLength = Math.ceil(this.shape[i] / this.chunks[i]);
                chunkCoords[i] = normalizeIntegerSelection(chunkCoords[i], dimLength);
            }
        }
        catch (error) {
            if (error instanceof BoundsCheckError) {
                throw new BoundsCheckError(`index ${chunkCoords.join(".")} is out of bounds for shape: ${this.shape} and chunks ${this.chunks}`);
            }
            else {
                throw error;
            }
        }
        const cKey = this.chunkKey(chunkCoords);
        const cdata = this.chunkStore.getItem(cKey, opts === null || opts === void 0 ? void 0 : opts.storeOptions);
        const buffer = await this.decodeChunk(await cdata);
        const outShape = this.chunks.filter(d => d !== 1); // squeeze chunk dim if 1
        return new RawArray(buffer, outShape, this.dtype);
    }
    chunkKey(chunkCoords) {
        var _a;
        const sep = (_a = this.meta.dimension_separator) !== null && _a !== void 0 ? _a : ".";
        return this.keyPrefix + chunkCoords.join(sep);
    }
    ensureByteArray(chunkData) {
        if (typeof chunkData === "string") {
            return new Uint8Array(Buffer.from(chunkData).buffer);
        }
        return new Uint8Array(chunkData);
    }
    toTypedArray(buffer) {
        return new (getTypedArrayCtr(this.dtype))(buffer);
    }
    toNestedArray(data) {
        const buffer = this.ensureByteArray(data).buffer;
        return new NestedArray(buffer, this.chunks, this.dtype);
    }
    async decodeChunk(chunkData) {
        let bytes = this.ensureByteArray(chunkData);
        if (this.compressor !== null) {
            bytes = await (await this.compressor).decode(bytes);
        }
        if (this.dtype.includes('>')) {
            // Need to flip bytes for Javascript TypedArrays
            // We flip bytes in-place to avoid creating an extra copy of the decoded buffer.
            byteSwapInplace(this.toTypedArray(bytes.buffer));
        }
        if (this.meta.order === "F" && this.nDims > 1) {
            // We need to transpose the array, because this library only support C-order.
            const src = this.toTypedArray(bytes.buffer);
            const out = new (getTypedArrayCtr(this.dtype))(src.length);
            convertColMajorToRowMajor(src, out, this.chunks);
            return out.buffer;
        }
        // TODO filtering etc
        return bytes.buffer;
    }
    chunkBufferToRawArray(buffer) {
        return new RawArray(buffer, this.chunks, this.dtype);
    }
    async decodeDirectToRawArray({ chunkCoords }, outShape, outSize) {
        const cKey = this.chunkKey(chunkCoords);
        try {
            const cdata = await this.chunkStore.getItem(cKey);
            return new RawArray(await this.decodeChunk(cdata), outShape, this.dtype);
        }
        catch (error) {
            if (isKeyError(error)) {
                // fill with scalar if item doesn't exist
                const data = new (getTypedArrayCtr(this.dtype))(outSize);
                return new RawArray(data.fill(this.fillValue), outShape);
            }
            else {
                // Different type of error - rethrow
                throw error;
            }
        }
    }
    async set(selection = null, value, opts = {}) {
        await this.setBasicSelection(selection, value, opts);
    }
    async setBasicSelection(selection, value, { concurrencyLimit = 10, progressCallback } = {}) {
        if (this.readOnly) {
            throw new PermissionError("Object is read only");
        }
        if (!this.cacheMetadata) {
            await this.reloadMetadata();
        }
        if (this.shape.length === 0) {
            throw new Error("Shape [] indexing is not supported yet");
        }
        else {
            await this.setBasicSelectionND(selection, value, concurrencyLimit, progressCallback);
        }
    }
    async setBasicSelectionND(selection, value, concurrencyLimit, progressCallback) {
        const indexer = new BasicIndexer(selection, this);
        await this.setSelection(indexer, value, concurrencyLimit, progressCallback);
    }
    getChunkValue(proj, indexer, value, selectionShape) {
        let chunkValue;
        if (selectionShape.length === 0) {
            chunkValue = value;
        }
        else if (typeof value === "number") {
            chunkValue = value;
        }
        else {
            chunkValue = value.get(proj.outSelection);
            // tslint:disable-next-line: strict-type-predicates
            if (indexer.dropAxes !== null) {
                throw new Error("Handling drop axes not supported yet");
            }
        }
        return chunkValue;
    }
    async setSelection(indexer, value, concurrencyLimit, progressCallback) {
        // We iterate over all chunks which overlap the selection and thus contain data
        // that needs to be replaced. Each chunk is processed in turn, extracting the
        // necessary data from the value array and storing into the chunk array.
        // N.B., it is an important optimisation that we only visit chunks which overlap
        // the selection. This minimises the number of iterations in the main for loop.
        // TODO? check fields are sensible
        // Determine indices of chunks overlapping the selection
        const selectionShape = indexer.shape;
        // Check value shape
        if (selectionShape.length === 0) {
            // Setting a single value
        }
        else if (typeof value === "number") {
            // Setting a scalar value
        }
        else if (value instanceof NestedArray) {
            // TODO: non stringify equality check
            if (!arrayEquals1D(value.shape, selectionShape)) {
                throw new ValueError(`Shape mismatch in source NestedArray and set selection: ${value.shape} and ${selectionShape}`);
            }
        }
        else {
            // TODO support TypedArrays, buffers, etc
            throw new Error("Unknown data type for setting :(");
        }
        const queue = new PQueue({ concurrency: concurrencyLimit });
        const allTasks = [];
        if (progressCallback) {
            let queueSize = 0;
            for (const _ of indexer.iter())
                queueSize += 1;
            let progress = 0;
            progressCallback({ progress: 0, queueSize: queueSize });
            for (const proj of indexer.iter()) {
                const chunkValue = this.getChunkValue(proj, indexer, value, selectionShape);
                allTasks.push(queue.add(async () => {
                    await this.chunkSetItem(proj.chunkCoords, proj.chunkSelection, chunkValue);
                    progress += 1;
                    progressCallback({ progress: progress, queueSize: queueSize });
                }));
            }
        }
        else {
            for (const proj of indexer.iter()) {
                const chunkValue = this.getChunkValue(proj, indexer, value, selectionShape);
                allTasks.push(queue.add(() => this.chunkSetItem(proj.chunkCoords, proj.chunkSelection, chunkValue)));
            }
        }
        // guarantees that all work on queue has finished and throws if any of the tasks errored.
        await Promise.all(allTasks);
    }
    async chunkSetItem(chunkCoords, chunkSelection, value) {
        if (this.meta.order === "F" && this.nDims > 1) {
            throw new Error("Setting content for arrays in F-order is not supported.");
        }
        // Obtain key for chunk storage
        const chunkKey = this.chunkKey(chunkCoords);
        let chunk = null;
        const dtypeConstr = getTypedArrayCtr(this.dtype);
        const chunkSize = this.chunkSize;
        if (isTotalSlice(chunkSelection, this.chunks)) {
            // Totally replace chunk
            // Optimization: we are completely replacing the chunk, so no need
            // to access the existing chunk data
            if (typeof value === "number") {
                // TODO get the right type here
                chunk = new dtypeConstr(chunkSize);
                chunk.fill(value);
            }
            else {
                chunk = value.flatten();
            }
        }
        else {
            // partially replace the contents of this chunk
            // Existing chunk data
            let chunkData;
            try {
                // Chunk is initialized if this does not error
                const chunkStoreData = await this.chunkStore.getItem(chunkKey);
                const dBytes = await this.decodeChunk(chunkStoreData);
                chunkData = this.toTypedArray(dBytes);
            }
            catch (error) {
                if (isKeyError(error)) {
                    // Chunk is not initialized
                    chunkData = new dtypeConstr(chunkSize);
                    if (this.fillValue !== null) {
                        chunkData.fill(this.fillValue);
                    }
                }
                else {
                    // Different type of error - rethrow
                    throw error;
                }
            }
            const chunkNestedArray = new NestedArray(chunkData, this.chunks, this.dtype);
            chunkNestedArray.set(chunkSelection, value);
            chunk = chunkNestedArray.flatten();
        }
        const chunkData = await this.encodeChunk(chunk);
        this.chunkStore.setItem(chunkKey, chunkData);
    }
    async encodeChunk(chunk) {
        if (this.dtype.includes('>')) {
            /*
             * If big endian, flip bytes before applying compression and setting store.
             *
             * Here we create a copy (not in-place byteswapping) to avoid flipping the
             * bytes in the buffers of user-created Raw- and NestedArrays.
            */
            chunk = byteSwap(chunk);
        }
        if (this.compressor !== null) {
            const bytes = new Uint8Array(chunk.buffer);
            const cbytes = await (await this.compressor).encode(bytes);
            return cbytes.buffer;
        }
        // TODO: filters, etc
        return chunk.buffer;
    }
}
//# sourceMappingURL=index.js.map
import { createProxy } from './mutableMapping';
import { normalizeStoragePath } from './util';
import { containsArray, pathToPrefix, containsGroup, initGroup } from './storage/index';
import { ContainsArrayError, GroupNotFoundError, PermissionError, KeyError, ValueError, ContainsGroupError } from './errors';
import { GROUP_META_KEY, ATTRS_META_KEY } from './names';
import { parseMetadata } from './metadata';
import { Attributes } from './attributes';
import { array, empty, zeros, ones, full, create, normalizeStoreArgument } from './creation';
import { ZarrArray } from './core';
export class Group {
    constructor(store, path = null, metadata, readOnly = false, chunkStore = null, cacheAttrs = true) {
        this.store = store;
        this._chunkStore = chunkStore;
        this.path = normalizeStoragePath(path);
        this.keyPrefix = pathToPrefix(this.path);
        this.readOnly = readOnly;
        this.meta = metadata;
        // Initialize attributes
        const attrKey = this.keyPrefix + ATTRS_META_KEY;
        this.attrs = new Attributes(this.store, attrKey, this.readOnly, cacheAttrs);
    }
    /**
     * Group name following h5py convention.
     */
    get name() {
        if (this.path.length > 0) {
            if (this.path[0] !== "/") {
                return "/" + this.path;
            }
            return this.path;
        }
        return "/";
    }
    /**
     * Final component of name.
     */
    get basename() {
        const parts = this.name.split("/");
        return parts[parts.length - 1];
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
    static async create(store, path = null, readOnly = false, chunkStore = null, cacheAttrs = true) {
        const metadata = await this.loadMetadataForConstructor(store, path);
        return new Group(store, path, metadata, readOnly, chunkStore, cacheAttrs);
    }
    static async loadMetadataForConstructor(store, path) {
        path = normalizeStoragePath(path);
        const keyPrefix = pathToPrefix(path);
        try {
            const metaStoreValue = await store.getItem(keyPrefix + GROUP_META_KEY);
            return parseMetadata(metaStoreValue);
        }
        catch (error) {
            if (await containsArray(store, path)) {
                throw new ContainsArrayError(path);
            }
            throw new GroupNotFoundError(path);
        }
    }
    itemPath(item) {
        const absolute = typeof item === "string" && item.length > 0 && item[0] === '/';
        const path = normalizeStoragePath(item);
        // Absolute path
        if (!absolute && this.path.length > 0) {
            return this.keyPrefix + path;
        }
        return path;
    }
    /**
     * Create a sub-group.
     */
    async createGroup(name, overwrite = false) {
        if (this.readOnly) {
            throw new PermissionError("group is read only");
        }
        const path = this.itemPath(name);
        await initGroup(this.store, path, this._chunkStore, overwrite);
        return Group.create(this.store, path, this.readOnly, this._chunkStore, this.attrs.cache);
    }
    /**
     * Obtain a sub-group, creating one if it doesn't exist.
     */
    async requireGroup(name, overwrite = false) {
        if (this.readOnly) {
            throw new PermissionError("group is read only");
        }
        const path = this.itemPath(name);
        if (!await containsGroup(this.store, path)) {
            await initGroup(this.store, path, this._chunkStore, overwrite);
        }
        return Group.create(this.store, path, this.readOnly, this._chunkStore, this.attrs.cache);
    }
    getOptsForArrayCreation(name, opts = {}) {
        const path = this.itemPath(name);
        opts.path = path;
        if (opts.cacheAttrs === undefined) {
            opts.cacheAttrs = this.attrs.cache;
        }
        opts.store = this.store;
        opts.chunkStore = this.chunkStore;
        return opts;
    }
    /**
     * Creates an array
     */
    array(name, data, opts, overwrite) {
        if (this.readOnly) {
            throw new PermissionError("group is read only");
        }
        opts = this.getOptsForArrayCreation(name, opts);
        opts.overwrite = overwrite === undefined ? opts.overwrite : overwrite;
        return array(data, opts);
    }
    empty(name, shape, opts = {}) {
        if (this.readOnly) {
            throw new PermissionError("group is read only");
        }
        opts = this.getOptsForArrayCreation(name, opts);
        return empty(shape, opts);
    }
    zeros(name, shape, opts = {}) {
        if (this.readOnly) {
            throw new PermissionError("group is read only");
        }
        opts = this.getOptsForArrayCreation(name, opts);
        return zeros(shape, opts);
    }
    ones(name, shape, opts = {}) {
        if (this.readOnly) {
            throw new PermissionError("group is read only");
        }
        opts = this.getOptsForArrayCreation(name, opts);
        return ones(shape, opts);
    }
    full(name, shape, fillValue, opts = {}) {
        if (this.readOnly) {
            throw new PermissionError("group is read only");
        }
        opts = this.getOptsForArrayCreation(name, opts);
        return full(shape, fillValue, opts);
    }
    createDataset(name, shape, data, opts) {
        if (this.readOnly) {
            throw new PermissionError("group is read only");
        }
        opts = this.getOptsForArrayCreation(name, opts);
        let z;
        if (data === undefined) {
            if (shape === undefined) {
                throw new ValueError("Shape must be set if no data is passed to CreateDataset");
            }
            z = create({ shape, ...opts });
        }
        else {
            z = array(data, opts);
        }
        return z;
    }
    async getItem(item) {
        const path = this.itemPath(item);
        if (await containsArray(this.store, path)) {
            return ZarrArray.create(this.store, path, this.readOnly, this.chunkStore, undefined, this.attrs.cache);
        }
        else if (await containsGroup(this.store, path)) {
            return Group.create(this.store, path, this.readOnly, this._chunkStore, this.attrs.cache);
        }
        throw new KeyError(item);
    }
    async setItem(item, value) {
        await this.array(item, value, {}, true);
        return true;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async deleteItem(_item) {
        if (this.readOnly) {
            throw new PermissionError("group is read only");
        }
        throw new Error("Method not implemented.");
    }
    async containsItem(item) {
        const path = this.itemPath(item);
        return await containsArray(this.store, path) || containsGroup(this.store, path);
    }
    proxy() {
        return createProxy(this);
    }
}
/**
 * Create a group.
 * @param store Store or path to directory in file system.
 * @param path Group path within store.
 * @param chunkStore Separate storage for chunks. If not provided, `store` will be used for storage of both chunks and metadata.
 * @param overwrite If `true`, delete any pre-existing data in `store` at `path` before creating the group.
 * @param cacheAttrs If `true` (default), user attributes will be cached for attribute read operations.
 *   If `false`, user attributes are reloaded from the store prior to all attribute read operations.
 */
export async function group(store, path = null, chunkStore, overwrite = false, cacheAttrs = true) {
    store = normalizeStoreArgument(store);
    path = normalizeStoragePath(path);
    if (overwrite || await containsGroup(store)) {
        await initGroup(store, path, chunkStore, overwrite);
    }
    return Group.create(store, path, false, chunkStore, cacheAttrs);
}
/**
 * Open a group using file-mode-like semantics.
 * @param store Store or path to directory in file system or name of zip file.
 * @param path Group path within store.
 * @param mode Persistence mode, see `PersistenceMode` type.
 * @param chunkStore Store or path to directory in file system or name of zip file.
 * @param cacheAttrs If `true` (default), user attributes will be cached for attribute read operations
 *   If False, user attributes are reloaded from the store prior to all attribute read operations.
 *
 */
export async function openGroup(store, path = null, mode = "a", chunkStore, cacheAttrs = true) {
    store = normalizeStoreArgument(store);
    if (chunkStore !== undefined) {
        chunkStore = normalizeStoreArgument(store);
    }
    path = normalizeStoragePath(path);
    if (mode === "r" || mode === "r+") {
        if (!await containsGroup(store, path)) {
            if (await containsArray(store, path)) {
                throw new ContainsArrayError(path);
            }
            throw new GroupNotFoundError(path);
        }
    }
    else if (mode === "w") {
        await initGroup(store, path, chunkStore, true);
    }
    else if (mode === "a") {
        if (!await containsGroup(store, path)) {
            if (await containsArray(store, path)) {
                throw new ContainsArrayError(path);
            }
            await initGroup(store, path, chunkStore);
        }
    }
    else if (mode === "w-" || mode === "x") {
        if (await containsArray(store, path)) {
            throw new ContainsArrayError(path);
        }
        else if (await containsGroup(store, path)) {
            throw new ContainsGroupError(path);
        }
        else {
            await initGroup(store, path, chunkStore);
        }
    }
    else {
        throw new ValueError(`Invalid mode argument: ${mode}`);
    }
    const readOnly = mode === "r";
    return Group.create(store, path, readOnly, chunkStore, cacheAttrs);
}
//# sourceMappingURL=hierarchy.js.map
import { Store } from "../storage/types";
import { ZarrArrayMetadata, UserAttributes, FillType } from '../types';
import { Attributes } from "../attributes";
import { ArraySelection, Slice } from "./types";
import { NestedArray } from "../nestedArray";
import { RawArray } from "../rawArray";
import { TypedArray } from '../nestedArray/types';
export interface GetOptions<StoreGetOptions> {
    concurrencyLimit?: number;
    progressCallback?: (progressUpdate: {
        progress: number;
        queueSize: number;
    }) => void;
    storeOptions?: StoreGetOptions;
}
export interface SetOptions {
    concurrencyLimit?: number;
    progressCallback?: (progressUpdate: {
        progress: number;
        queueSize: number;
    }) => void;
}
export interface GetRawChunkOptions<StoreGetOptions> {
    storeOptions: StoreGetOptions;
}
export declare class ZarrArray<StoreGetOptions = any> {
    store: Store<StoreGetOptions>;
    private compressor;
    private _chunkStore;
    /**
     * A `Store` providing the underlying storage for array chunks.
     */
    get chunkStore(): Store<StoreGetOptions>;
    path: string;
    keyPrefix: string;
    readOnly: boolean;
    cacheMetadata: boolean;
    cacheAttrs: boolean;
    meta: ZarrArrayMetadata;
    attrs: Attributes<UserAttributes>;
    /**
     * Array name following h5py convention.
     */
    get name(): string | null;
    /**
     * Final component of name.
     */
    get basename(): string | null;
    /**
     * "A list of integers describing the length of each dimension of the array.
     */
    get shape(): number[];
    /**
     * A list of integers describing the length of each dimension of a chunk of the array.
     */
    get chunks(): number[];
    /**
     * Integer describing how many element a chunk contains
     */
    private get chunkSize();
    /**
     *  The NumPy data type.
     */
    get dtype(): import("../types").DtypeString;
    /**
     *  A value used for uninitialized portions of the array.
     */
    get fillValue(): FillType;
    /**
     *  Number of dimensions.
     */
    get nDims(): number;
    /**
     *  The total number of elements in the array.
     */
    get size(): number;
    get length(): number;
    private get _chunkDataShape();
    /**
     * A tuple of integers describing the number of chunks along each
     * dimension of the array.
     */
    get chunkDataShape(): number[];
    /**
     * Total number of chunks.
     */
    get numChunks(): number;
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
    static create<StoreGetOptions>(store: Store<StoreGetOptions>, path?: null | string, readOnly?: boolean, chunkStore?: Store<StoreGetOptions> | null, cacheMetadata?: boolean, cacheAttrs?: boolean): Promise<ZarrArray<StoreGetOptions>>;
    private static loadMetadataForConstructor;
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
    private constructor();
    /**
     * (Re)load metadata from store
     */
    reloadMetadata(): Promise<ZarrArrayMetadata>;
    private refreshMetadata;
    get(selection?: undefined | Slice | ":" | "..." | null | (Slice | null | ":" | "...")[], opts?: GetOptions<StoreGetOptions>): Promise<NestedArray<TypedArray> | number>;
    get(selection?: ArraySelection, opts?: GetOptions<StoreGetOptions>): Promise<NestedArray<TypedArray> | number>;
    getRaw(selection?: undefined | Slice | ":" | "..." | null | (Slice | null | ":" | "...")[], opts?: GetOptions<StoreGetOptions>): Promise<RawArray | number>;
    getRaw(selection?: ArraySelection, opts?: GetOptions<StoreGetOptions>): Promise<RawArray | number>;
    getBasicSelection(selection: Slice | ":" | "..." | null | (Slice | null | ":" | "...")[], asRaw?: false, opts?: GetOptions<StoreGetOptions>): Promise<NestedArray<TypedArray> | number>;
    getBasicSelection(selection: ArraySelection, asRaw?: false, opts?: GetOptions<StoreGetOptions>): Promise<NestedArray<TypedArray> | number>;
    getBasicSelection(selection: Slice | ":" | "..." | null | (Slice | null | ":" | "...")[], asRaw?: true, opts?: GetOptions<StoreGetOptions>): Promise<RawArray | number>;
    getBasicSelection(selection: ArraySelection, asRaw?: true, opts?: GetOptions<StoreGetOptions>): Promise<RawArray | number>;
    private getBasicSelectionND;
    private getSelection;
    /**
     * Obtain part or whole of a chunk.
     * @param chunkCoords Indices of the chunk.
     * @param chunkSelection Location of region within the chunk to extract.
     * @param out Array to store result in.
     * @param outSelection Location of region within output array to store results in.
     * @param dropAxes Axes to squeeze out of the chunk.
     */
    private chunkGetItem;
    getRawChunk(chunkCoords: number[], opts?: GetRawChunkOptions<StoreGetOptions>): Promise<RawArray>;
    private chunkKey;
    private ensureByteArray;
    private toTypedArray;
    private toNestedArray;
    private decodeChunk;
    private chunkBufferToRawArray;
    private decodeDirectToRawArray;
    set(selection: ArraySelection | undefined, value: any, opts?: SetOptions): Promise<void>;
    setBasicSelection(selection: ArraySelection, value: any, { concurrencyLimit, progressCallback }?: SetOptions): Promise<void>;
    private setBasicSelectionND;
    private getChunkValue;
    private setSelection;
    private chunkSetItem;
    private encodeChunk;
}

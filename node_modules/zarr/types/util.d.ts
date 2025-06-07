import { Order, FillType, ChunksArgument, DtypeString } from "./types";
import { DimensionSelection } from "./core/types";
import { TypedArray } from "./nestedArray/types";
/**
 * This should be true only if this javascript is getting executed in Node.
 */
export declare const IS_NODE: string | false;
export declare function noop(): void;
export declare function humanReadableSize(size: number): string;
export declare function normalizeStoragePath(path: string | String | null): string;
export declare function normalizeShape(shape: number | number[]): number[];
export declare function normalizeChunks(chunks: ChunksArgument, shape: number[]): number[];
export declare function normalizeOrder(order: string): Order;
export declare function normalizeDtype(dtype: DtypeString): DtypeString;
export declare function normalizeFillValue(fillValue: FillType): FillType;
/**
 * Determine whether `item` specifies a complete slice of array with the
 *  given `shape`. Used to optimize __setitem__ operations on chunks
 * @param item
 * @param shape
 */
export declare function isTotalSlice(item: DimensionSelection | DimensionSelection[], shape: number[]): boolean;
/**
 * Checks for === equality of all elements.
 */
export declare function arrayEquals1D(a: ArrayLike<any>, b: ArrayLike<any>): boolean;
export declare function getStrides(shape: number[]): number[];
export declare function resolveUrl(root: string | URL, path: string): string;
/**
 * Swaps byte order in-place for a given TypedArray.
 * Used to flip endian-ness when getting/setting chunks from/to zarr store.
 * @param src TypedArray
 */
export declare function byteSwapInplace(src: TypedArray): void;
/**
 * Creates a copy of a TypedArray and swaps bytes.
 * Used to flip endian-ness when getting/setting chunks from/to zarr store.
 * @param src TypedArray
 */
export declare function byteSwap(src: TypedArray): TypedArray;
/**
 * Rewrites a copy of a TypedArray while converting it from column-major (F-order) to row-major (C-order).
 * @param src TypedArray
 * @param out TypedArray
 * @param shape number[]
 */
export declare function convertColMajorToRowMajor(src: TypedArray, out: TypedArray, shape: number[]): void;
export declare function isArrayBufferLike(obj: unknown | null): obj is ArrayBufferLike;

import { Slice, SliceArgument, SliceIndices } from "./types";
export declare function slice(start: SliceArgument, stop?: SliceArgument | undefined, step?: number | null): Slice;
/**
 * Port of slice.indices(n) and PySlice_Unpack
 * https://github.com/python/cpython/blob/master/Objects/sliceobject.c#L166
 *  https://github.com/python/cpython/blob/master/Objects/sliceobject.c#L198
 *
 * Behaviour might be slightly different as it's a weird hybrid implementation.
 */
export declare function sliceIndices(slice: Slice, length: number): SliceIndices;

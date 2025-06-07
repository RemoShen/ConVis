import { ZarrArray } from './index';
import { Slice, ArraySelection, Indexer, DimIndexer, ChunkProjection, NormalizedArraySelection, SliceIndices, DimensionArraySelection } from './types';
/**
 * Returns both the sliceIndices per dimension and the output shape after slicing.
 */
export declare function selectionToSliceIndices(selection: NormalizedArraySelection, shape: number[]): [(number | SliceIndices)[], number[]];
/**
 * This translates "...", ":", null into a list of slices or non-negative integer selections of length shape
 */
export declare function normalizeArraySelection(selection: ArraySelection | number, shape: number[], convertIntegerSelectionToSlices?: boolean): NormalizedArraySelection;
export declare function replaceEllipsis(selection: ArraySelection | number, shape: number[]): DimensionArraySelection[];
export declare function normalizeIntegerSelection(dimSelection: number, dimLength: number): number;
export declare function isIntegerArray(s: any): boolean;
export declare function isSlice(s: (Slice | number | number[] | "..." | ":" | null)): boolean;
export declare function isContiguousSelection(selection: ArraySelection): boolean;
export declare class BasicIndexer implements Indexer {
    dimIndexers: DimIndexer[];
    shape: number[];
    dropAxes: null;
    constructor(selection: ArraySelection, array: ZarrArray);
    iter(): Generator<ChunkProjection, void, unknown>;
}

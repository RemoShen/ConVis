import { ArraySelection } from '../core/types';
import { TypedArray, TypedArrayConstructor, NestedArrayData } from './types';
/**
 * Digs down into the dimensions of given array to find the TypedArray and returns its constructor.
 * Better to use sparingly.
 */
export declare function getNestedArrayConstructor<T extends TypedArray>(arr: any): TypedArrayConstructor<T>;
/**
 * Returns both the slice result and new output shape
 * @param arr NestedArray to slice
 * @param shape The shape of the NestedArray
 * @param selection
 */
export declare function sliceNestedArray(arr: NestedArrayData, shape: number[], selection: number | ArraySelection): [NestedArrayData | number, number[]];
export declare function setNestedArrayToScalar(dstArr: NestedArrayData, value: number, destShape: number[], selection: number | ArraySelection): void;
export declare function setNestedArray(dstArr: NestedArrayData, sourceArr: NestedArrayData, destShape: number[], sourceShape: number[], selection: number | ArraySelection): void;
export declare function flattenNestedArray(arr: NestedArrayData, shape: number[], constr?: TypedArrayConstructor<TypedArray>): TypedArray;

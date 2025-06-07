import { ArraySelection } from '../core/types';
import { TypedArray } from '../nestedArray/types';
export declare function setRawArrayToScalar(dstArr: TypedArray, dstStrides: number[], dstShape: number[], dstSelection: number | ArraySelection, value: number): void;
export declare function setRawArray(dstArr: TypedArray, dstStrides: number[], dstShape: number[], dstSelection: number | ArraySelection, sourceArr: TypedArray, sourceStrides: number[], sourceShape: number[]): void;
export declare function setRawArrayFromChunkItem(dstArr: TypedArray, dstStrides: number[], dstShape: number[], dstSelection: number | ArraySelection, sourceArr: TypedArray, sourceStrides: number[], sourceShape: number[], sourceSelection: number | ArraySelection): void;

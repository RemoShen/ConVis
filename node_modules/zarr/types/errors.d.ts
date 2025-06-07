export interface ZarrError {
    __zarr__: string;
}
export declare function isKeyError(o: unknown): boolean;
export declare class ContainsArrayError extends Error implements ZarrError {
    __zarr__: string;
    constructor(path: string);
}
export declare class ContainsGroupError extends Error implements ZarrError {
    __zarr__: string;
    constructor(path: string);
}
export declare class ArrayNotFoundError extends Error implements ZarrError {
    __zarr__: string;
    constructor(path: string);
}
export declare class GroupNotFoundError extends Error implements ZarrError {
    __zarr__: string;
    constructor(path: string);
}
export declare class PathNotFoundError extends Error implements ZarrError {
    __zarr__: string;
    constructor(path: string);
}
export declare class PermissionError extends Error implements ZarrError {
    __zarr__: string;
    constructor(message: string);
}
export declare class KeyError extends Error implements ZarrError {
    __zarr__: string;
    constructor(key: string);
}
export declare class TooManyIndicesError extends RangeError implements ZarrError {
    __zarr__: string;
    constructor(selection: any[], shape: number[]);
}
export declare class BoundsCheckError extends RangeError implements ZarrError {
    __zarr__: string;
    constructor(message: string);
}
export declare class InvalidSliceError extends RangeError implements ZarrError {
    __zarr__: string;
    constructor(from: any, to: any, stepSize: any, reason: any);
}
export declare class NegativeStepError extends Error implements ZarrError {
    __zarr__: string;
    constructor();
}
export declare class ValueError extends Error implements ZarrError {
    __zarr__: string;
    constructor(message: string);
}
export declare class HTTPError extends Error implements ZarrError {
    __zarr__: string;
    constructor(code: string);
}

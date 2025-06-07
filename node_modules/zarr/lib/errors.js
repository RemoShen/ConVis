function isZarrError(err) {
    return typeof err === 'object' && err !== null && '__zarr__' in err;
}
export function isKeyError(o) {
    return isZarrError(o) && o.__zarr__ === 'KeyError';
}
// Custom error messages, note we have to patch the prototype of the
// errors to fix `instanceof` calls, see:
// https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
export class ContainsArrayError extends Error {
    constructor(path) {
        super(`path ${path} contains an array`);
        this.__zarr__ = 'ContainsArrayError';
        Object.setPrototypeOf(this, ContainsArrayError.prototype);
    }
}
export class ContainsGroupError extends Error {
    constructor(path) {
        super(`path ${path} contains a group`);
        this.__zarr__ = 'ContainsGroupError';
        Object.setPrototypeOf(this, ContainsGroupError.prototype);
    }
}
export class ArrayNotFoundError extends Error {
    constructor(path) {
        super(`array not found at path ${path}`);
        this.__zarr__ = 'ArrayNotFoundError';
        Object.setPrototypeOf(this, ArrayNotFoundError.prototype);
    }
}
export class GroupNotFoundError extends Error {
    constructor(path) {
        super(`group not found at path ${path}`);
        this.__zarr__ = 'GroupNotFoundError';
        Object.setPrototypeOf(this, GroupNotFoundError.prototype);
    }
}
export class PathNotFoundError extends Error {
    constructor(path) {
        super(`nothing found at path ${path}`);
        this.__zarr__ = 'PathNotFoundError';
        Object.setPrototypeOf(this, PathNotFoundError.prototype);
    }
}
export class PermissionError extends Error {
    constructor(message) {
        super(message);
        this.__zarr__ = 'PermissionError';
        Object.setPrototypeOf(this, PermissionError.prototype);
    }
}
export class KeyError extends Error {
    constructor(key) {
        super(`key ${key} not present`);
        this.__zarr__ = 'KeyError';
        Object.setPrototypeOf(this, KeyError.prototype);
    }
}
export class TooManyIndicesError extends RangeError {
    constructor(selection, shape) {
        super(`too many indices for array; expected ${shape.length}, got ${selection.length}`);
        this.__zarr__ = 'TooManyIndicesError';
        Object.setPrototypeOf(this, TooManyIndicesError.prototype);
    }
}
export class BoundsCheckError extends RangeError {
    constructor(message) {
        super(message);
        this.__zarr__ = 'BoundsCheckError';
        Object.setPrototypeOf(this, BoundsCheckError.prototype);
    }
}
export class InvalidSliceError extends RangeError {
    constructor(from, to, stepSize, reason) {
        super(`slice arguments slice(${from}, ${to}, ${stepSize}) invalid: ${reason}`);
        this.__zarr__ = 'InvalidSliceError';
        Object.setPrototypeOf(this, InvalidSliceError.prototype);
    }
}
export class NegativeStepError extends Error {
    constructor() {
        super(`Negative step size is not supported when indexing.`);
        this.__zarr__ = 'NegativeStepError';
        Object.setPrototypeOf(this, NegativeStepError.prototype);
    }
}
export class ValueError extends Error {
    constructor(message) {
        super(message);
        this.__zarr__ = 'ValueError';
        Object.setPrototypeOf(this, ValueError.prototype);
    }
}
export class HTTPError extends Error {
    constructor(code) {
        super(code);
        this.__zarr__ = 'HTTPError';
        Object.setPrototypeOf(this, HTTPError.prototype);
    }
}
//# sourceMappingURL=errors.js.map
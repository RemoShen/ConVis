import { getTypedArrayCtr, getTypedArrayDtypeString } from './types';
import { slice } from '../core/slice';
import { ValueError } from '../errors';
import { normalizeShape, IS_NODE, isArrayBufferLike } from '../util';
import { setNestedArray, setNestedArrayToScalar, flattenNestedArray, sliceNestedArray } from './ops';
export class NestedArray {
    constructor(data, shape, dtype) {
        const dataIsTypedArray = data !== null && !!data.BYTES_PER_ELEMENT;
        if (shape === undefined) {
            if (!dataIsTypedArray) {
                throw new ValueError("Shape argument is required unless you pass in a TypedArray");
            }
            shape = [data.length];
        }
        if (dtype === undefined) {
            if (!dataIsTypedArray) {
                throw new ValueError("Dtype argument is required unless you pass in a TypedArray");
            }
            dtype = getTypedArrayDtypeString(data);
        }
        shape = normalizeShape(shape);
        this.shape = shape;
        this.dtype = dtype;
        if (dataIsTypedArray && shape.length !== 1) {
            data = data.buffer;
        }
        // Zero dimension array.. they are a bit weirdly represented now, they will only ever occur internally
        if (this.shape.length === 0) {
            this.data = new (getTypedArrayCtr(dtype))(1);
        }
        else if (
        // tslint:disable-next-line: strict-type-predicates
        (IS_NODE && Buffer.isBuffer(data))
            || isArrayBufferLike(data)
            || data === null) {
            // Create from ArrayBuffer or Buffer
            const numShapeElements = shape.reduce((x, y) => x * y, 1);
            if (data === null) {
                data = new ArrayBuffer(numShapeElements * parseInt(dtype[dtype.length - 1], 10));
            }
            const numDataElements = data.byteLength / parseInt(dtype[dtype.length - 1], 10);
            if (numShapeElements !== numDataElements) {
                throw new Error(`Buffer has ${numDataElements} of dtype ${dtype}, shape is too large or small ${shape} (flat=${numShapeElements})`);
            }
            const typeConstructor = getTypedArrayCtr(dtype);
            this.data = createNestedArray(data, typeConstructor, shape);
        }
        else {
            this.data = data;
        }
    }
    get(selection) {
        const [sliceResult, outShape] = sliceNestedArray(this.data, this.shape, selection);
        if (outShape.length === 0) {
            return sliceResult;
        }
        else {
            return new NestedArray(sliceResult, outShape, this.dtype);
        }
    }
    set(selection = null, value) {
        if (selection === null) {
            selection = [slice(null)];
        }
        if (typeof value === "number") {
            if (this.shape.length === 0) {
                // Zero dimension array..
                this.data[0] = value;
            }
            else {
                setNestedArrayToScalar(this.data, value, this.shape, selection);
            }
        }
        else {
            setNestedArray(this.data, value.data, this.shape, value.shape, selection);
        }
    }
    flatten() {
        if (this.shape.length === 1) {
            return this.data;
        }
        return flattenNestedArray(this.data, this.shape, getTypedArrayCtr(this.dtype));
    }
    /**
     * Currently only supports a single integer as the size, TODO: support start, stop, step.
     */
    static arange(size, dtype = "<i4") {
        const constr = getTypedArrayCtr(dtype);
        const data = rangeTypedArray([size], constr);
        return new NestedArray(data, [size], dtype);
    }
}
/**
 * Creates a TypedArray with values 0 through N where N is the product of the shape.
 */
export function rangeTypedArray(shape, tContructor) {
    const size = shape.reduce((x, y) => x * y, 1);
    const data = new tContructor(size);
    data.set([...Array(size).keys()]); // Sets range 0,1,2,3,4,5
    return data;
}
/**
 * Creates multi-dimensional (rank > 1) array given input data and shape recursively.
 * What it does is create a Array<Array<...<Array<Uint8Array>>> or some other typed array.
 * This is for internal use, there should be no need to call this from user code.
 * @param data a buffer containing the data for this array.
 * @param t constructor for the datatype of choice
 * @param shape list of numbers describing the size in each dimension
 * @param offset in bytes for this dimension
 */
export function createNestedArray(data, t, shape, offset = 0) {
    if (shape.length === 1) {
        // This is only ever reached if called with rank 1 shape, never reached through recursion.
        // We just slice set the array directly from one level above to save some function calls.
        return new t(data.slice(offset, offset + shape[0] * t.BYTES_PER_ELEMENT));
    }
    const arr = new Array(shape[0]);
    if (shape.length === 2) {
        for (let i = 0; i < shape[0]; i++) {
            arr[i] = new t(data.slice(offset + shape[1] * i * t.BYTES_PER_ELEMENT, offset + shape[1] * (i + 1) * t.BYTES_PER_ELEMENT));
        }
        return arr;
    }
    const nextShape = shape.slice(1);
    // Small optimization possible here: this can be precomputed for different levels of depth and passed on.
    const mult = nextShape.reduce((x, y) => x * y, 1);
    for (let i = 0; i < shape[0]; i++) {
        arr[i] = createNestedArray(data, t, nextShape, offset + mult * i * t.BYTES_PER_ELEMENT);
    }
    return arr;
}
//# sourceMappingURL=index.js.map
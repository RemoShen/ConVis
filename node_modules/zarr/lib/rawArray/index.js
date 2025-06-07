import { slice } from '../core/slice';
import { ValueError } from '../errors';
import { normalizeShape, IS_NODE, getStrides, isArrayBufferLike } from '../util';
import { getTypedArrayCtr, getTypedArrayDtypeString } from '../nestedArray/types';
import { setRawArrayFromChunkItem, setRawArrayToScalar, setRawArray } from './ops';
export class RawArray {
    constructor(data, shape, dtype, strides) {
        const dataIsTypedArray = data !== null && !!data.BYTES_PER_ELEMENT;
        if (shape === undefined) {
            if (!dataIsTypedArray) {
                throw new ValueError("Shape argument is required unless you pass in a TypedArray");
            }
            shape = [data.length];
        }
        shape = normalizeShape(shape);
        if (dtype === undefined) {
            if (!dataIsTypedArray) {
                throw new ValueError("Dtype argument is required unless you pass in a TypedArray");
            }
            dtype = getTypedArrayDtypeString(data);
        }
        if (strides === undefined) {
            strides = getStrides(shape);
        }
        this.shape = shape;
        this.dtype = dtype;
        this.strides = strides;
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
            this.data = new typeConstructor(data);
        }
        else {
            this.data = data;
        }
    }
    set(selection = null, value, chunkSelection) {
        if (selection === null) {
            selection = [slice(null)];
        }
        if (typeof value === "number") {
            if (this.shape.length === 0) {
                // Zero dimension array..
                this.data[0] = value;
            }
            else {
                setRawArrayToScalar(this.data, this.strides, this.shape, selection, value);
            }
        }
        else if (value instanceof RawArray && chunkSelection) {
            // Copy directly from decoded chunk to destination array
            setRawArrayFromChunkItem(this.data, this.strides, this.shape, selection, value.data, value.strides, value.shape, chunkSelection);
        }
        else {
            setRawArray(this.data, this.strides, this.shape, selection, value.data, value.strides, value.shape);
        }
    }
}
//# sourceMappingURL=index.js.map
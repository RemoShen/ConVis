import { ValueError } from '../errors';
// eslint-disable-next-line @typescript-eslint/naming-convention
const Float16Array = globalThis.Float16Array;
const DTYPE_TYPEDARRAY_MAPPING = {
    '|b': Int8Array,
    '|b1': Uint8Array,
    '|B': Uint8Array,
    '|u1': Uint8Array,
    '|i1': Int8Array,
    '<b': Int8Array,
    '<B': Uint8Array,
    '<u1': Uint8Array,
    '<i1': Int8Array,
    '<u2': Uint16Array,
    '<i2': Int16Array,
    '<u4': Uint32Array,
    '<i4': Int32Array,
    '<f4': Float32Array,
    '<f2': Float16Array,
    '<f8': Float64Array,
    '>b': Int8Array,
    '>B': Uint8Array,
    '>u1': Uint8Array,
    '>i1': Int8Array,
    '>u2': Uint16Array,
    '>i2': Int16Array,
    '>u4': Uint32Array,
    '>i4': Int32Array,
    '>f4': Float32Array,
    '>f2': Float16Array,
    '>f8': Float64Array
};
export function getTypedArrayCtr(dtype) {
    const ctr = DTYPE_TYPEDARRAY_MAPPING[dtype];
    if (!ctr) {
        if (dtype.slice(1) === 'f2') {
            throw Error(`'${dtype}' is not supported natively in zarr.js. ` +
                `In order to access this dataset you must make Float16Array available as a global. ` +
                `See https://github.com/gzuidhof/zarr.js/issues/127`);
        }
        throw Error(`Dtype not recognized or not supported in zarr.js, got ${dtype}.`);
    }
    return ctr;
}
/*
 * Called by NestedArray and RawArray constructors only.
 * We byte-swap the buffer of a store after decoding
 * since TypedArray views are little endian only.
 *
 * This means NestedArrays and RawArrays will always be little endian,
 * unless a numpy-like library comes around and can handle endianess
 * for buffer views.
 */
export function getTypedArrayDtypeString(t) {
    // Favour the types below instead of small and big B
    if (t instanceof Uint8Array)
        return '|u1';
    if (t instanceof Int8Array)
        return '|i1';
    if (t instanceof Uint16Array)
        return '<u2';
    if (t instanceof Int16Array)
        return '<i2';
    if (t instanceof Uint32Array)
        return '<u4';
    if (t instanceof Int32Array)
        return '<i4';
    if (t instanceof Float32Array)
        return '<f4';
    if (t instanceof Float64Array)
        return '<f8';
    throw new ValueError('Mapping for TypedArray to Dtypestring not known');
}
//# sourceMappingURL=types.js.map
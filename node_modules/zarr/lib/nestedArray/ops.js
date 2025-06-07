import { ValueError } from '../errors';
import { normalizeArraySelection, selectionToSliceIndices } from '../core/indexing';
/**
 * Digs down into the dimensions of given array to find the TypedArray and returns its constructor.
 * Better to use sparingly.
 */
export function getNestedArrayConstructor(arr) {
    // TODO fix typing
    // tslint:disable-next-line: strict-type-predicates
    if (arr.byteLength !== undefined) {
        return (arr).constructor;
    }
    return getNestedArrayConstructor(arr[0]);
}
/**
 * Returns both the slice result and new output shape
 * @param arr NestedArray to slice
 * @param shape The shape of the NestedArray
 * @param selection
 */
export function sliceNestedArray(arr, shape, selection) {
    // This translates "...", ":", null into a list of slices or integer selections
    const normalizedSelection = normalizeArraySelection(selection, shape);
    const [sliceIndices, outShape] = selectionToSliceIndices(normalizedSelection, shape);
    const outArray = _sliceNestedArray(arr, shape, sliceIndices);
    return [outArray, outShape];
}
function _sliceNestedArray(arr, shape, selection) {
    const currentSlice = selection[0];
    // Is this necessary?
    // // This is possible when a slice list is passed shorter than the amount of dimensions
    // // tslint:disable-next-line: strict-type-predicates
    // if (currentSlice === undefined) {
    //     return arr.slice();
    // }
    // When a number is passed that dimension is squeezed
    if (typeof currentSlice === "number") {
        // Assume already normalized integer selection here.
        if (shape.length === 1) {
            return arr[currentSlice];
        }
        else {
            return _sliceNestedArray(arr[currentSlice], shape.slice(1), selection.slice(1));
        }
    }
    const [from, to, step, outputSize] = currentSlice;
    if (outputSize === 0) {
        return new (getNestedArrayConstructor(arr))(0);
    }
    if (shape.length === 1) {
        if (step === 1) {
            return arr.slice(from, to);
        }
        const newArrData = new arr.constructor(outputSize);
        for (let i = 0; i < outputSize; i++) {
            newArrData[i] = arr[from + i * step];
        }
        return newArrData;
    }
    let newArr = new Array(outputSize);
    for (let i = 0; i < outputSize; i++) {
        newArr[i] = _sliceNestedArray(arr[from + i * step], shape.slice(1), selection.slice(1));
    }
    // This is necessary to ensure that the return value is a NestedArray if the last dimension is squeezed
    // e.g. shape [2,1] with slice [:, 0] would otherwise result in a list of numbers instead of a valid NestedArray
    if (outputSize > 0 && typeof newArr[0] === "number") {
        const typedArrayConstructor = arr[0].constructor;
        newArr = typedArrayConstructor.from(newArr);
    }
    return newArr;
}
export function setNestedArrayToScalar(dstArr, value, destShape, selection) {
    // This translates "...", ":", null, etc into a list of slices.
    const normalizedSelection = normalizeArraySelection(selection, destShape, true);
    // Above we force the results to be SliceIndicesIndices only, without integer selections making this cast is safe.
    const [sliceIndices, _outShape] = selectionToSliceIndices(normalizedSelection, destShape);
    _setNestedArrayToScalar(dstArr, value, destShape, sliceIndices);
}
export function setNestedArray(dstArr, sourceArr, destShape, sourceShape, selection) {
    // This translates "...", ":", null, etc into a list of slices.
    const normalizedSelection = normalizeArraySelection(selection, destShape, false);
    const [sliceIndices, outShape] = selectionToSliceIndices(normalizedSelection, destShape);
    // TODO: replace with non stringify equality check
    if (JSON.stringify(outShape) !== JSON.stringify(sourceShape)) {
        throw new ValueError(`Shape mismatch in target and source NestedArray: ${outShape} and ${sourceShape}`);
    }
    _setNestedArray(dstArr, sourceArr, destShape, sliceIndices);
}
function _setNestedArray(dstArr, sourceArr, shape, selection) {
    const currentSlice = selection[0];
    if (typeof sourceArr === "number") {
        _setNestedArrayToScalar(dstArr, sourceArr, shape, selection.map(x => typeof x === "number" ? [x, x + 1, 1, 1] : x));
        return;
    }
    // This dimension is squeezed.
    if (typeof currentSlice === "number") {
        _setNestedArray(dstArr[currentSlice], sourceArr, shape.slice(1), selection.slice(1));
        return;
    }
    const [from, _to, step, outputSize] = currentSlice;
    if (shape.length === 1) {
        if (step === 1) {
            dstArr.set(sourceArr, from);
        }
        else {
            for (let i = 0; i < outputSize; i++) {
                dstArr[from + i * step] = (sourceArr)[i];
            }
        }
        return;
    }
    for (let i = 0; i < outputSize; i++) {
        _setNestedArray(dstArr[from + i * step], sourceArr[i], shape.slice(1), selection.slice(1));
    }
}
function _setNestedArrayToScalar(dstArr, value, shape, selection) {
    const currentSlice = selection[0];
    const [from, to, step, outputSize] = currentSlice;
    if (shape.length === 1) {
        if (step === 1) {
            dstArr.fill(value, from, to);
        }
        else {
            for (let i = 0; i < outputSize; i++) {
                dstArr[from + i * step] = value;
            }
        }
        return;
    }
    for (let i = 0; i < outputSize; i++) {
        _setNestedArrayToScalar(dstArr[from + i * step], value, shape.slice(1), selection.slice(1));
    }
}
export function flattenNestedArray(arr, shape, constr) {
    if (constr === undefined) {
        constr = getNestedArrayConstructor(arr);
    }
    const size = shape.reduce((x, y) => x * y, 1);
    const outArr = new constr(size);
    _flattenNestedArray(arr, shape, outArr, 0);
    return outArr;
}
function _flattenNestedArray(arr, shape, outArr, offset) {
    if (shape.length === 1) {
        // This is only ever reached if called with rank 1 shape, never reached through recursion.
        // We just slice set the array directly from one level above to save some function calls.
        outArr.set(arr, offset);
        return;
    }
    if (shape.length === 2) {
        for (let i = 0; i < shape[0]; i++) {
            outArr.set(arr[i], offset + shape[1] * i);
        }
        return arr;
    }
    const nextShape = shape.slice(1);
    // Small optimization possible here: this can be precomputed for different levels of depth and passed on.
    const mult = nextShape.reduce((x, y) => x * y, 1);
    for (let i = 0; i < shape[0]; i++) {
        _flattenNestedArray(arr[i], nextShape, outArr, offset + mult * i);
    }
    return arr;
}
//# sourceMappingURL=ops.js.map
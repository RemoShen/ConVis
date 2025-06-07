import { TooManyIndicesError, BoundsCheckError, NegativeStepError } from '../errors';
import { sliceIndices, slice } from "./slice";
function ensureArray(selection) {
    if (!Array.isArray(selection)) {
        return [selection];
    }
    return selection;
}
function checkSelectionLength(selection, shape) {
    if (selection.length > shape.length) {
        throw new TooManyIndicesError(selection, shape);
    }
}
/**
 * Returns both the sliceIndices per dimension and the output shape after slicing.
 */
export function selectionToSliceIndices(selection, shape) {
    const sliceIndicesResult = [];
    const outShape = [];
    for (let i = 0; i < selection.length; i++) {
        const s = selection[i];
        if (typeof s === "number") {
            sliceIndicesResult.push(s);
        }
        else {
            const x = sliceIndices(s, shape[i]);
            const dimLength = x[3];
            outShape.push(dimLength);
            sliceIndicesResult.push(x);
        }
    }
    return [sliceIndicesResult, outShape];
}
/**
 * This translates "...", ":", null into a list of slices or non-negative integer selections of length shape
 */
export function normalizeArraySelection(selection, shape, convertIntegerSelectionToSlices = false) {
    selection = replaceEllipsis(selection, shape);
    for (let i = 0; i < selection.length; i++) {
        const dimSelection = selection[i];
        if (typeof dimSelection === "number") {
            if (convertIntegerSelectionToSlices) {
                selection[i] = slice(dimSelection, dimSelection + 1, 1);
            }
            else {
                selection[i] = normalizeIntegerSelection(dimSelection, shape[i]);
            }
        }
        else if (isIntegerArray(dimSelection)) {
            throw new TypeError("Integer array selections are not supported (yet)");
        }
        else if (dimSelection === ":" || dimSelection === null) {
            selection[i] = slice(null, null, 1);
        }
    }
    return selection;
}
export function replaceEllipsis(selection, shape) {
    selection = ensureArray(selection);
    let ellipsisIndex = -1;
    let numEllipsis = 0;
    for (let i = 0; i < selection.length; i++) {
        if (selection[i] === "...") {
            ellipsisIndex = i;
            numEllipsis += 1;
        }
    }
    if (numEllipsis > 1) {
        throw new RangeError("an index can only have a single ellipsis ('...')");
    }
    if (numEllipsis === 1) {
        // count how many items to left and right of ellipsis
        const numItemsLeft = ellipsisIndex;
        const numItemsRight = selection.length - (numItemsLeft + 1);
        const numItems = selection.length - 1; // All non-ellipsis items
        if (numItems >= shape.length) {
            // Ellipsis does nothing, just remove it
            selection = selection.filter((x) => x !== "...");
        }
        else {
            // Replace ellipsis with as many slices are needed for number of dims
            const numNewItems = shape.length - numItems;
            let newItem = selection.slice(0, numItemsLeft).concat(new Array(numNewItems).fill(null));
            if (numItemsRight > 0) {
                newItem = newItem.concat(selection.slice(selection.length - numItemsRight));
            }
            selection = newItem;
        }
    }
    // Fill out selection if not completely specified
    if (selection.length < shape.length) {
        const numMissing = shape.length - selection.length;
        selection = selection.concat(new Array(numMissing).fill(null));
    }
    checkSelectionLength(selection, shape);
    return selection;
}
export function normalizeIntegerSelection(dimSelection, dimLength) {
    // Note: Maybe we should convert to integer or warn if dimSelection is not an integer
    // handle wraparound
    if (dimSelection < 0) {
        dimSelection = dimLength + dimSelection;
    }
    // handle out of bounds
    if (dimSelection >= dimLength || dimSelection < 0) {
        throw new BoundsCheckError(`index out of bounds for dimension with length ${dimLength}`);
    }
    return dimSelection;
}
function isInteger(s) {
    return typeof s === "number";
}
export function isIntegerArray(s) {
    if (!Array.isArray(s)) {
        return false;
    }
    for (const e of s) {
        if (typeof e !== "number") {
            return false;
        }
    }
    return true;
}
export function isSlice(s) {
    if (s !== null && s["_slice"] === true) {
        return true;
    }
    return false;
}
function isContiguousSlice(s) {
    return isSlice(s) && (s.step === null || s.step === 1);
}
function isPositiveSlice(s) {
    return isSlice(s) && (s.step === null || s.step >= 1);
}
export function isContiguousSelection(selection) {
    selection = ensureArray(selection);
    for (let i = 0; i < selection.length; i++) {
        const s = selection[i];
        if (!(isIntegerArray(s) || isContiguousSlice(s) || s === "...")) {
            return false;
        }
    }
    return true;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function isBasicSelection(selection) {
    selection = ensureArray(selection);
    for (let i = 0; i < selection.length; i++) {
        const s = selection[i];
        if (!(isInteger(s) || isPositiveSlice(s))) {
            return false;
        }
    }
    return true;
}
function* product(...iterables) {
    if (iterables.length === 0) {
        return;
    }
    // make a list of iterators from the iterables
    const iterators = iterables.map(it => it());
    const results = iterators.map(it => it.next());
    // Disabled to allow empty inputs
    // if (results.some(r => r.done)) {
    //     throw new Error("Input contains an empty iterator.");
    // }
    for (let i = 0;;) {
        if (results[i].done) {
            // reset the current iterator
            iterators[i] = iterables[i]();
            results[i] = iterators[i].next();
            // advance, and exit if we've reached the end
            if (++i >= iterators.length) {
                return;
            }
        }
        else {
            yield results.map(({ value }) => value);
            i = 0;
        }
        results[i] = iterators[i].next();
    }
}
export class BasicIndexer {
    constructor(selection, array) {
        selection = normalizeArraySelection(selection, array.shape);
        // Setup per-dimension indexers
        this.dimIndexers = [];
        const arrayShape = array.shape;
        for (let i = 0; i < arrayShape.length; i++) {
            let dimSelection = selection[i];
            const dimLength = arrayShape[i];
            const dimChunkLength = array.chunks[i];
            if (dimSelection === null) {
                dimSelection = slice(null);
            }
            if (isInteger(dimSelection)) {
                this.dimIndexers.push(new IntDimIndexer(dimSelection, dimLength, dimChunkLength));
            }
            else if (isSlice(dimSelection)) {
                this.dimIndexers.push(new SliceDimIndexer(dimSelection, dimLength, dimChunkLength));
            }
            else {
                throw new RangeError(`Unspported selection item for basic indexing; expected integer or slice, got ${dimSelection}`);
            }
        }
        this.shape = [];
        for (const d of this.dimIndexers) {
            if (d instanceof SliceDimIndexer) {
                this.shape.push(d.numItems);
            }
        }
        this.dropAxes = null;
    }
    *iter() {
        const dimIndexerIterables = this.dimIndexers.map(x => (() => x.iter()));
        const dimIndexerProduct = product(...dimIndexerIterables);
        for (const dimProjections of dimIndexerProduct) {
            // TODO fix this, I think the product outputs too many combinations
            const chunkCoords = [];
            const chunkSelection = [];
            const outSelection = [];
            for (const p of dimProjections) {
                chunkCoords.push((p).dimChunkIndex);
                chunkSelection.push((p).dimChunkSelection);
                if ((p).dimOutSelection !== null) {
                    outSelection.push((p).dimOutSelection);
                }
            }
            yield {
                chunkCoords,
                chunkSelection,
                outSelection,
            };
        }
    }
}
class IntDimIndexer {
    constructor(dimSelection, dimLength, dimChunkLength) {
        dimSelection = normalizeIntegerSelection(dimSelection, dimLength);
        this.dimSelection = dimSelection;
        this.dimLength = dimLength;
        this.dimChunkLength = dimChunkLength;
        this.numItems = 1;
    }
    *iter() {
        const dimChunkIndex = Math.floor(this.dimSelection / this.dimChunkLength);
        const dimOffset = dimChunkIndex * this.dimChunkLength;
        const dimChunkSelection = this.dimSelection - dimOffset;
        const dimOutSelection = null;
        yield {
            dimChunkIndex,
            dimChunkSelection,
            dimOutSelection,
        };
    }
}
class SliceDimIndexer {
    constructor(dimSelection, dimLength, dimChunkLength) {
        // Normalize
        const [start, stop, step] = sliceIndices(dimSelection, dimLength);
        this.start = start;
        this.stop = stop;
        this.step = step;
        if (this.step < 1) {
            throw new NegativeStepError();
        }
        this.dimLength = dimLength;
        this.dimChunkLength = dimChunkLength;
        this.numItems = Math.max(0, Math.ceil((this.stop - this.start) / this.step));
        this.numChunks = Math.ceil(this.dimLength / this.dimChunkLength);
    }
    *iter() {
        const dimChunkIndexFrom = Math.floor(this.start / this.dimChunkLength);
        const dimChunkIndexTo = Math.ceil(this.stop / this.dimChunkLength);
        // Iterate over chunks in range
        for (let dimChunkIndex = dimChunkIndexFrom; dimChunkIndex < dimChunkIndexTo; dimChunkIndex++) {
            // Compute offsets for chunk within overall array
            const dimOffset = dimChunkIndex * this.dimChunkLength;
            const dimLimit = Math.min(this.dimLength, (dimChunkIndex + 1) * this.dimChunkLength);
            // Determine chunk length, accounting for trailing chunk
            const dimChunkLength = dimLimit - dimOffset;
            let dimChunkSelStart;
            let dimChunkSelStop;
            let dimOutOffset;
            if (this.start < dimOffset) {
                // Selection starts before current chunk
                dimChunkSelStart = 0;
                const remainder = (dimOffset - this.start) % this.step;
                if (remainder > 0) {
                    dimChunkSelStart += this.step - remainder;
                }
                // Compute number of previous items, provides offset into output array
                dimOutOffset = Math.ceil((dimOffset - this.start) / this.step);
            }
            else {
                // Selection starts within current chunk
                dimChunkSelStart = this.start - dimOffset;
                dimOutOffset = 0;
            }
            if (this.stop > dimLimit) {
                // Selection ends after current chunk
                dimChunkSelStop = dimChunkLength;
            }
            else {
                // Selection ends within current chunk
                dimChunkSelStop = this.stop - dimOffset;
            }
            const dimChunkSelection = slice(dimChunkSelStart, dimChunkSelStop, this.step);
            const dimChunkNumItems = Math.ceil((dimChunkSelStop - dimChunkSelStart) / this.step);
            const dimOutSelection = slice(dimOutOffset, dimOutOffset + dimChunkNumItems);
            yield {
                dimChunkIndex,
                dimChunkSelection,
                dimOutSelection,
            };
        }
    }
}
//# sourceMappingURL=indexing.js.map
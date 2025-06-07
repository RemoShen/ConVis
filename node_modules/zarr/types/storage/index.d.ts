import { Store } from './types';
import { FillType, Order, Filter, CompressorConfig, ChunksArgument, DtypeString } from '../types';
/**
 * Return true if the store contains an array at the given logical path.
 */
export declare function containsArray(store: Store, path?: string | null): Promise<boolean>;
/**
 * Return true if the store contains a group at the given logical path.
 */
export declare function containsGroup(store: Store, path?: string | null): Promise<boolean>;
export declare function pathToPrefix(path: string): string;
/**
 * Obtain a directory listing for the given path. If `store` provides a `listDir`
 *  method, this will be called, otherwise will fall back to implementation via the
 *  `MutableMapping` interface.
 * @param store
 */
export declare function listDir(store: Store, path?: string | null): Promise<string[]>;
/**
 *  Initialize a group store. Note that this is a low-level function and there should be no
 *  need to call this directly from user code.
 */
export declare function initGroup(store: Store, path?: string | null, chunkStore?: null | Store, overwrite?: boolean): Promise<void>;
/**
 *
 * Initialize an array store with the given configuration. Note that this is a low-level
 * function and there should be no need to call this directly from user code
 */
export declare function initArray(store: Store, shape: number | number[], chunks: ChunksArgument, dtype: DtypeString, path?: string | null, compressor?: null | CompressorConfig, fillValue?: FillType, order?: Order, overwrite?: boolean, chunkStore?: null | Store, filters?: null | Filter[], dimensionSeparator?: '.' | '/'): Promise<void>;

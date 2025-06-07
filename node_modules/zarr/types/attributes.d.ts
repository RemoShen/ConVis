import { AsyncMutableMapping, AsyncMutableMappingProxy } from './mutableMapping';
import { Store } from './storage/types';
import { UserAttributes } from './types';
/**
 * Class providing access to user attributes on an array or group. Should not be
 * instantiated directly, will be available via the `.attrs` property of an array or
 * group.
 */
export declare class Attributes<M extends UserAttributes> implements AsyncMutableMapping<any> {
    store: Store;
    key: string;
    readOnly: boolean;
    cache: boolean;
    private cachedValue;
    constructor(store: Store, key: string, readOnly: boolean, cache?: boolean);
    /**
     * Retrieve all attributes as a JSON object.
     */
    asObject(): Promise<M>;
    private getNoSync;
    private setNoSync;
    private putNoSync;
    private delNoSync;
    /**
     * Overwrite all attributes with the provided object in a single operation
     */
    put(d: M): Promise<void>;
    setItem(key: string, value: any): Promise<boolean>;
    getItem(key: string): Promise<any>;
    deleteItem(key: string): Promise<boolean>;
    containsItem(key: string): Promise<boolean>;
    proxy(): AsyncMutableMappingProxy<any>;
}

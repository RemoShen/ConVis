import { SyncStore, ValidStoreType } from "./types";
import { MutableMappingProxy } from "../mutableMapping";
export declare class ObjectStore<T extends ValidStoreType> implements SyncStore<T> {
    listDir?: undefined;
    rmDir?: undefined;
    getSize?: undefined;
    rename?: undefined;
    object: {
        [key: string]: T;
    };
    constructor();
    getItem(item: string): T;
    setItem(item: string, value: T): boolean;
    deleteItem(item: string): boolean;
    containsItem(item: string): boolean;
    proxy(): MutableMappingProxy<T>;
    keys(): string[];
}

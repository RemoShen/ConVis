import { SyncStore, ValidStoreType } from "./types";
import { MutableMappingProxy } from "../mutableMapping";
export declare class MemoryStore<T extends ValidStoreType> implements SyncStore<T, undefined> {
    listDir?: undefined;
    rmDir?: undefined;
    getSize?: undefined;
    rename?: undefined;
    root: {
        [key: string]: any;
    };
    constructor(root?: {});
    proxy(): MutableMappingProxy<T>;
    private getParent;
    private requireParent;
    getItem(item: string): any;
    setItem(item: string, value: any): boolean;
    deleteItem(item: string): boolean;
    containsItem(item: string): boolean;
    keys(): string[];
}

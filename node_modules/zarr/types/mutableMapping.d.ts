/**
 * Closely resembles the functions on the MutableMapping type in Python.
 */
export interface MutableMapping<T, O = any> {
    getItem(item: string, opts?: O): T;
    setItem(item: string, value: T): boolean;
    deleteItem(item: string): boolean;
    containsItem(item: string): boolean;
    proxy(): MutableMappingProxy<T>;
}
/**
 * Closely resembles the functions on the MutableMapping type in Python.
 */
export interface AsyncMutableMapping<T, O = any> {
    getItem(item: string, opts?: O): Promise<T>;
    setItem(item: string, value: T): Promise<boolean>;
    deleteItem(item: string): Promise<boolean>;
    containsItem(item: string): Promise<boolean>;
}
export interface MutableMappingProxy<T> {
    [key: string]: T;
}
export interface AsyncMutableMappingProxy<T> {
    [key: string]: T | Promise<T>;
}
/**
 * A proxy allows for accessing, setting and deleting the keys in the mutable mapping using
 * m["a"] or even m.a notation.
 */
export declare function createProxy<S, T>(mapping: S & MutableMapping<T>): (S & MutableMappingProxy<T>);
export declare function createProxy<S, T>(mapping: S & AsyncMutableMapping<T>): (S & AsyncMutableMappingProxy<T>);

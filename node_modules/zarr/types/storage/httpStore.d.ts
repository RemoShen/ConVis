import { ValidStoreType, AsyncStore } from './types';
declare enum HTTPMethod {
    HEAD = "HEAD",
    GET = "GET",
    PUT = "PUT"
}
interface HTTPStoreOptions {
    fetchOptions?: RequestInit;
    supportedMethods?: HTTPMethod[];
}
export declare class HTTPStore<UrlRoot extends string | URL = string> implements AsyncStore<ArrayBuffer, RequestInit> {
    listDir?: undefined;
    rmDir?: undefined;
    getSize?: undefined;
    rename?: undefined;
    url: UrlRoot;
    fetchOptions: RequestInit;
    private supportedMethods;
    constructor(url: UrlRoot, options?: HTTPStoreOptions);
    keys(): Promise<string[]>;
    getItem(item: string, opts?: RequestInit): Promise<ArrayBuffer>;
    setItem(item: string, value: ValidStoreType): Promise<boolean>;
    deleteItem(_item: string): Promise<boolean>;
    containsItem(item: string): Promise<boolean>;
}
export {};

import { IS_NODE, resolveUrl } from '../util';
import { KeyError, HTTPError } from '../errors';
var HTTPMethod;
(function (HTTPMethod) {
    HTTPMethod["HEAD"] = "HEAD";
    HTTPMethod["GET"] = "GET";
    HTTPMethod["PUT"] = "PUT";
})(HTTPMethod || (HTTPMethod = {}));
const DEFAULT_METHODS = [HTTPMethod.HEAD, HTTPMethod.GET, HTTPMethod.PUT];
export class HTTPStore {
    constructor(url, options = {}) {
        this.url = url;
        const { fetchOptions = {}, supportedMethods = DEFAULT_METHODS } = options;
        this.fetchOptions = fetchOptions;
        this.supportedMethods = new Set(supportedMethods);
    }
    keys() {
        throw new Error('Method not implemented.');
    }
    async getItem(item, opts) {
        const url = resolveUrl(this.url, item);
        const value = await fetch(url, { ...this.fetchOptions, ...opts });
        if (value.status === 404) {
            // Item is not found
            throw new KeyError(item);
        }
        else if (value.status !== 200) {
            throw new HTTPError(String(value.status));
        }
        // only decode if 200
        if (IS_NODE) {
            return Buffer.from(await value.arrayBuffer());
        }
        else {
            return value.arrayBuffer(); // Browser
        }
    }
    async setItem(item, value) {
        if (!this.supportedMethods.has(HTTPMethod.PUT)) {
            throw new Error('HTTP PUT no a supported method for store.');
        }
        const url = resolveUrl(this.url, item);
        if (typeof value === 'string') {
            value = new TextEncoder().encode(value).buffer;
        }
        const set = await fetch(url, { ...this.fetchOptions, method: HTTPMethod.PUT, body: value });
        return set.status.toString()[0] === '2';
    }
    deleteItem(_item) {
        throw new Error('Method not implemented.');
    }
    async containsItem(item) {
        const url = resolveUrl(this.url, item);
        // Just check headers if HEAD method supported
        const method = this.supportedMethods.has(HTTPMethod.HEAD) ? HTTPMethod.HEAD : HTTPMethod.GET;
        const value = await fetch(url, { ...this.fetchOptions, method });
        return value.status === 200;
    }
}
//# sourceMappingURL=httpStore.js.map
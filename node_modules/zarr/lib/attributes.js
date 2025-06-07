import { createProxy } from './mutableMapping';
import { parseMetadata } from './metadata';
import { PermissionError } from './errors';
/**
 * Class providing access to user attributes on an array or group. Should not be
 * instantiated directly, will be available via the `.attrs` property of an array or
 * group.
 */
export class Attributes {
    constructor(store, key, readOnly, cache = true) {
        this.store = store;
        this.key = key;
        this.readOnly = readOnly;
        this.cache = cache;
        this.cachedValue = null;
    }
    /**
     * Retrieve all attributes as a JSON object.
     */
    async asObject() {
        if (this.cache && this.cachedValue !== null) {
            return this.cachedValue;
        }
        const o = await this.getNoSync();
        if (this.cache) {
            this.cachedValue = o;
        }
        return o;
    }
    async getNoSync() {
        try {
            const data = await this.store.getItem(this.key);
            // TODO fix typing?
            return parseMetadata(data);
        }
        catch (error) {
            return {};
        }
    }
    async setNoSync(key, value) {
        const d = await this.getNoSync();
        d[key] = value;
        await this.putNoSync(d);
        return true;
    }
    async putNoSync(m) {
        await this.store.setItem(this.key, JSON.stringify(m));
        if (this.cache) {
            this.cachedValue = m;
        }
    }
    async delNoSync(key) {
        const d = await this.getNoSync();
        delete d[key];
        await this.putNoSync(d);
        return true;
    }
    /**
     * Overwrite all attributes with the provided object in a single operation
     */
    async put(d) {
        if (this.readOnly) {
            throw new PermissionError("attributes are read-only");
        }
        return this.putNoSync(d);
    }
    async setItem(key, value) {
        if (this.readOnly) {
            throw new PermissionError("attributes are read-only");
        }
        return this.setNoSync(key, value);
    }
    async getItem(key) {
        return (await this.asObject())[key];
    }
    async deleteItem(key) {
        if (this.readOnly) {
            throw new PermissionError("attributes are read-only");
        }
        return this.delNoSync(key);
    }
    async containsItem(key) {
        return (await this.asObject())[key] !== undefined;
    }
    proxy() {
        return createProxy(this);
    }
}
//# sourceMappingURL=attributes.js.map
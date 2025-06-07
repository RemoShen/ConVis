import { createProxy } from "../mutableMapping";
import { KeyError } from "../errors";
export class MemoryStore {
    constructor(root = {}) {
        this.root = root;
    }
    proxy() {
        return createProxy(this);
    }
    getParent(item) {
        let parent = this.root;
        const segments = item.split('/');
        // find the parent container
        for (const k of segments.slice(0, segments.length - 1)) {
            parent = parent[k];
            if (!parent) {
                throw Error(item);
            }
            // if not isinstance(parent, self.cls):
            //     raise KeyError(item)
        }
        return [parent, segments[segments.length - 1]];
    }
    requireParent(item) {
        let parent = this.root;
        const segments = item.split('/');
        // require the parent container
        for (const k of segments.slice(0, segments.length - 1)) {
            // TODO: verify correct implementation
            if (parent[k] === undefined) {
                parent[k] = {};
            }
            parent = parent[k];
        }
        return [parent, segments[segments.length - 1]];
    }
    getItem(item) {
        const [parent, key] = this.getParent(item);
        const value = parent[key];
        if (value === undefined) {
            throw new KeyError(item);
        }
        return value;
    }
    setItem(item, value) {
        const [parent, key] = this.requireParent(item);
        parent[key] = value;
        return true;
    }
    deleteItem(item) {
        const [parent, key] = this.getParent(item);
        return delete parent[key];
    }
    containsItem(item) {
        // TODO: more sane implementation
        try {
            return this.getItem(item) !== undefined;
        }
        catch (e) {
            return false;
        }
    }
    keys() {
        throw new Error("Method not implemented.");
    }
}
//# sourceMappingURL=memoryStore.js.map
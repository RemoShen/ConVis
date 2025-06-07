import { createProxy } from "../mutableMapping";
import { KeyError } from "../errors";
export class ObjectStore {
    constructor() {
        this.object = {};
    }
    getItem(item) {
        if (!Object.prototype.hasOwnProperty.call(this.object, item)) {
            throw new KeyError(item);
        }
        return this.object[item];
    }
    setItem(item, value) {
        this.object[item] = value;
        return true;
    }
    deleteItem(item) {
        return delete this.object[item];
    }
    containsItem(item) {
        return Object.prototype.hasOwnProperty.call(this.object, item);
    }
    proxy() {
        return createProxy(this);
    }
    keys() {
        return Object.getOwnPropertyNames(this.object);
    }
}
//# sourceMappingURL=objectStore.js.map
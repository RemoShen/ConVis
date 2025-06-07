export function createProxy(mapping) {
    return new Proxy(mapping, {
        set(target, key, value, _receiver) {
            return target.setItem(key, value);
        },
        get(target, key, _receiver) {
            return target.getItem(key);
        },
        deleteProperty(target, key) {
            return target.deleteItem(key);
        },
        has(target, key) {
            return target.containsItem(key);
        }
    });
}
//# sourceMappingURL=mutableMapping.js.map
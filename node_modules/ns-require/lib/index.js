"use strict";
const path_1 = require("path");
function ns(options) {
    return new ns.Scope(options);
}
(function (ns) {
    function unwrapExports(module) {
        return (module === null || module === void 0 ? void 0 : module.default) || module;
    }
    ns.unwrapExports = unwrapExports;
    class Scope {
        constructor(options) {
            this.options = options;
            this.prefixes = [`${options.namespace}-${options.prefix}-`];
            if (options.official) {
                this.prefixes.push(`@${options.official}/${options.prefix}-`);
            }
        }
        throwError(name) {
            throw new Error(`cannot resolve ${this.options.prefix} "${name}"`);
        }
        paths(name) {
            // absolute path
            if ((0, path_1.isAbsolute)(name)) {
                return [name];
            }
            // relative path
            if (name.startsWith('./') || name.startsWith('../')) {
                if (this.options.dirname) {
                    return [(0, path_1.resolve)(this.options.dirname, name)];
                }
                else {
                    this.throwError(name);
                }
            }
            // full package path
            if (this.prefixes.some(prefix => name.startsWith(prefix))) {
                return [name];
            }
            // scoped package path
            if (name[0] === '@') {
                const index = name.indexOf('/');
                if (index < 0)
                    this.throwError(name);
                const scope = name.slice(0, index + 1);
                name = name.slice(index + 1);
                if (!name.startsWith(this.prefixes[0])) {
                    name = this.prefixes[0] + name;
                }
                return [scope + name];
            }
            // normal package path
            return this.prefixes.map(prefix => prefix + name).reverse();
        }
        require(name) {
            if (typeof name === 'object') {
                return name;
            }
            const path = this.resolve(name);
            const exports = require(path);
            return ns.unwrapExports(exports);
        }
        resolve(name) {
            const modules = this.paths(name);
            for (const path of modules) {
                try {
                    return require.resolve(path);
                }
                catch { }
            }
            this.throwError(name);
        }
    }
    ns.Scope = Scope;
})(ns || (ns = {}));
module.exports = ns;

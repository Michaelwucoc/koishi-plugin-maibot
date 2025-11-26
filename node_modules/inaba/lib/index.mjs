var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// packages/inaba/src/index.ts
var require_src = __commonJS({
  "packages/inaba/src/index.ts"(exports, module) {
    var _Random = class {
      constructor(get = Math.random) {
        this.get = get;
      }
      id(length = 8, radix = 16) {
        let result = "";
        for (let i = 0; i < length; ++i) {
          result += _Random.chars[Math.floor(Math.random() * radix)];
        }
        return result;
      }
      bool(probability) {
        if (probability >= 1)
          return true;
        if (probability <= 0)
          return false;
        return this.get() < probability;
      }
      real(...args) {
        const lower = args.length > 1 ? args[0] : 0;
        const upper = args[args.length - 1];
        return this.get() * (upper - lower) + lower;
      }
      int(...args) {
        return Math.floor(this.real(...args));
      }
      splice(source) {
        return source.splice(Math.floor(this.get() * source.length), 1)[0];
      }
      pick(source, count) {
        if (count === void 0)
          return this.pick(source, 1)[0];
        const copy = source.slice();
        const result = [];
        count = Math.min(copy.length, count);
        for (let i = 0; i < count; i += 1) {
          result.push(this.splice(copy));
        }
        return result;
      }
      shuffle(source) {
        return this.pick(source, source.length);
      }
      weightedPick(weights) {
        const total = Object.entries(weights).reduce((prev, [, curr]) => prev + curr, 0);
        const pointer = this.get() * total;
        let counter = 0;
        for (const key in weights) {
          counter += weights[key];
          if (pointer < counter)
            return key;
        }
      }
    };
    var Random = _Random;
    __name(Random, "Random");
    __publicField(Random, "chars", "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");
    var instance = new Random();
    for (const key of ["id", "bool", "int", "real", "splice", "pick", "shuffle", "weightedPick"]) {
      Random[key] = instance[key].bind(instance);
    }
    module.exports = Random;
  }
});
export default require_src();
//# sourceMappingURL=index.mjs.map

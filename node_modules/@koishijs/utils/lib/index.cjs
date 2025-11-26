var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Random: () => import_inaba.default,
  assertProperty: () => assertProperty,
  coerce: () => coerce,
  defineEnumProperty: () => defineEnumProperty,
  enumKeys: () => enumKeys,
  escapeRegExp: () => escapeRegExp,
  extend: () => extend,
  interpolate: () => interpolate,
  isInteger: () => isInteger,
  isType: () => import_cosmokit2.is,
  merge: () => merge,
  observe: () => observe,
  renameProperty: () => renameProperty,
  sleep: () => sleep
});
module.exports = __toCommonJS(src_exports);
var import_inaba = __toESM(require("inaba"));
var import_cosmokit2 = require("cosmokit");
__reExport(src_exports, require("cosmokit"), module.exports);

// src/misc.ts
function isInteger(source) {
  return typeof source === "number" && Math.floor(source) === source;
}
__name(isInteger, "isInteger");
async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
__name(sleep, "sleep");
function enumKeys(data) {
  return Object.values(data).filter((value) => typeof value === "string");
}
__name(enumKeys, "enumKeys");
function defineEnumProperty(object, key, value) {
  object[key] = value;
  object[value] = key;
}
__name(defineEnumProperty, "defineEnumProperty");
function merge(head, base) {
  Object.entries(base).forEach(([key, value]) => {
    if (typeof head[key] === "undefined") return head[key] = value;
    if (!Object.hasOwn(head, key)) return;
    if (typeof value === "object" && typeof head[key] === "object") {
      head[key] = merge(head[key], value);
    } else {
      head[key] = value;
    }
  });
  return head;
}
__name(merge, "merge");
function assertProperty(config, key) {
  if (!config[key]) throw new Error(`missing configuration "${key}"`);
  return config[key];
}
__name(assertProperty, "assertProperty");
function coerce(val) {
  const { message, stack } = val instanceof Error && val.stack ? val : new Error(val);
  const lines = stack.split("\n");
  const index = lines.findIndex((line) => line.endsWith(message));
  return lines.slice(index).join("\n");
}
__name(coerce, "coerce");
function renameProperty(config, key, oldKey) {
  config[key] = Reflect.get(config, oldKey);
  Reflect.deleteProperty(config, oldKey);
}
__name(renameProperty, "renameProperty");
function extend(prototype, methods) {
  Object.defineProperties(prototype, Object.getOwnPropertyDescriptors(methods));
}
__name(extend, "extend");

// src/observe.ts
var import_cosmokit = require("cosmokit");
var immutable = ["number", "string", "bigint", "boolean", "symbol", "function"];
var builtin = ["Date", "RegExp", "Set", "Map", "WeakSet", "WeakMap", "Array"];
function observeProperty(value, update) {
  if ((0, import_cosmokit.is)("Date", value)) {
    return observeDate(value, update);
  } else if (Array.isArray(value)) {
    return observeArray(value, update);
  } else {
    return observeObject(value, update);
  }
}
__name(observeProperty, "observeProperty");
function untracked(key) {
  return typeof key === "symbol" || key.startsWith("$");
}
__name(untracked, "untracked");
function observeObject(target, notify) {
  const update = notify;
  if (!notify) {
    const diff = /* @__PURE__ */ Object.create(null);
    (0, import_cosmokit.defineProperty)(target, "$diff", diff);
    notify = /* @__PURE__ */ __name((key) => {
      if (untracked(key)) return;
      diff[key] = target[key];
    }, "notify");
  }
  const proxy = new Proxy(target, {
    get(target2, key) {
      const value = Reflect.get(target2, key);
      if (!value || immutable.includes(typeof value) || untracked(key)) return value;
      return observeProperty(value, update || (() => notify(key)));
    },
    set(target2, key, value) {
      const unchanged = target2[key] === value;
      const result = Reflect.set(target2, key, value);
      if (unchanged || !result) return result;
      notify(key);
      return true;
    },
    deleteProperty(target2, key) {
      const unchanged = !(key in target2);
      const result = Reflect.deleteProperty(target2, key);
      if (unchanged || !result) return result;
      notify(key);
      return true;
    }
  });
  return proxy;
}
__name(observeObject, "observeObject");
var arrayProxyMethods = ["pop", "shift", "splice", "sort"];
function observeArray(target, update) {
  const proxy = {};
  for (const method of arrayProxyMethods) {
    (0, import_cosmokit.defineProperty)(target, method, function(...args) {
      update();
      return Array.prototype[method].apply(this, args);
    });
  }
  return new Proxy(target, {
    get(target2, key) {
      if (key in proxy) return proxy[key];
      const value = target2[key];
      if (!value || immutable.includes(typeof value) || typeof key === "symbol" || isNaN(key)) return value;
      return observeProperty(value, update);
    },
    set(target2, key, value) {
      if (typeof key !== "symbol" && !isNaN(key) && target2[key] !== value) update();
      return Reflect.set(target2, key, value);
    }
  });
}
__name(observeArray, "observeArray");
function observeDate(target, update) {
  for (const method of Object.getOwnPropertyNames(Date.prototype)) {
    if (method === "valueOf") continue;
    (0, import_cosmokit.defineProperty)(target, method, function(...args) {
      const oldValue = target.valueOf();
      const result = Date.prototype[method].apply(this, args);
      if (target.valueOf() !== oldValue) update();
      return result;
    });
  }
  return target;
}
__name(observeDate, "observeDate");
function observe(target, ...args) {
  if (immutable.includes(typeof target)) {
    throw new Error(`cannot observe immutable type "${typeof target}"`);
  } else if (!target) {
    throw new Error("cannot observe null or undefined");
  }
  const type = Object.prototype.toString.call(target).slice(8, -1);
  if (builtin.includes(type)) {
    throw new Error(`cannot observe instance of type "${type}"`);
  }
  let update = import_cosmokit.noop;
  if (typeof args[0] === "function") update = args.shift();
  const observer = observeObject(target, null);
  (0, import_cosmokit.defineProperty)(observer, "$update", /* @__PURE__ */ __name(function $update() {
    const diff = { ...this.$diff };
    const fields = Object.keys(diff);
    if (fields.length) {
      for (const key in this.$diff) {
        delete this.$diff[key];
      }
      return update(diff);
    }
  }, "$update"));
  (0, import_cosmokit.defineProperty)(observer, "$merge", /* @__PURE__ */ __name(function $merge(value) {
    for (const key in value) {
      if (key in this.$diff) {
        throw new Error(`unresolved diff key "${key}"`);
      }
      target[key] = value[key];
    }
    return this;
  }, "$merge"));
  return observer;
}
__name(observe, "observe");

// src/string.ts
var evaluate = new Function("context", "expr", `
  try {
    with (context) {
      return eval(expr)
    }
  } catch {}
`);
function interpolate(template, context, pattern = /\{\{([\s\S]+?)\}\}/g) {
  let capture;
  let result = "", lastIndex = 0;
  while (capture = pattern.exec(template)) {
    if (capture[0] === template) {
      return evaluate(context, capture[1]);
    }
    result += template.slice(lastIndex, capture.index);
    result += evaluate(context, capture[1]) ?? "";
    lastIndex = capture.index + capture[0].length;
  }
  return result + template.slice(lastIndex);
}
__name(interpolate, "interpolate");
function escapeRegExp(source) {
  return source.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/-/g, "\\x2d");
}
__name(escapeRegExp, "escapeRegExp");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Random,
  assertProperty,
  coerce,
  defineEnumProperty,
  enumKeys,
  escapeRegExp,
  extend,
  interpolate,
  isInteger,
  isType,
  merge,
  observe,
  renameProperty,
  sleep,
  ...require("cosmokit")
});
//# sourceMappingURL=index.cjs.map

var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
import Random from "inaba";
import { is as is2 } from "cosmokit";
export * from "cosmokit";

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
import { defineProperty, is, noop } from "cosmokit";
var immutable = ["number", "string", "bigint", "boolean", "symbol", "function"];
var builtin = ["Date", "RegExp", "Set", "Map", "WeakSet", "WeakMap", "Array"];
function observeProperty(value, update) {
  if (is("Date", value)) {
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
    defineProperty(target, "$diff", diff);
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
    defineProperty(target, method, function(...args) {
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
    defineProperty(target, method, function(...args) {
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
  let update = noop;
  if (typeof args[0] === "function") update = args.shift();
  const observer = observeObject(target, null);
  defineProperty(observer, "$update", /* @__PURE__ */ __name(function $update() {
    const diff = { ...this.$diff };
    const fields = Object.keys(diff);
    if (fields.length) {
      for (const key in this.$diff) {
        delete this.$diff[key];
      }
      return update(diff);
    }
  }, "$update"));
  defineProperty(observer, "$merge", /* @__PURE__ */ __name(function $merge(value) {
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
export {
  Random,
  assertProperty,
  coerce,
  defineEnumProperty,
  enumKeys,
  escapeRegExp,
  extend,
  interpolate,
  isInteger,
  is2 as isType,
  merge,
  observe,
  renameProperty,
  sleep
};
//# sourceMappingURL=index.mjs.map

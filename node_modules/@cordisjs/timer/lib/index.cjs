"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  TimerService: () => TimerService,
  default: () => src_default
});
module.exports = __toCommonJS(src_exports);
var import_core = require("@cordisjs/core");
var import_cosmokit = require("cosmokit");
var TimerService = class extends import_core.Service {
  static {
    __name(this, "TimerService");
  }
  constructor(ctx) {
    super(ctx, "timer", true);
    ctx.mixin("timer", ["setTimeout", "setInterval", "sleep", "throttle", "debounce"]);
  }
  setTimeout(callback, delay) {
    const dispose = this[import_core.Context.current].effect(() => {
      const timer = setTimeout(() => {
        dispose();
        callback();
      }, delay);
      return () => clearTimeout(timer);
    });
    return dispose;
  }
  setInterval(callback, delay) {
    return this[import_core.Context.current].effect(() => {
      const timer = setInterval(callback, delay);
      return () => clearInterval(timer);
    });
  }
  sleep(delay) {
    const caller = this[import_core.Context.current];
    return new Promise((resolve, reject) => {
      const dispose1 = this.setTimeout(() => {
        dispose1();
        dispose2();
        resolve();
      }, delay);
      const dispose2 = caller.on("dispose", () => {
        dispose1();
        dispose2();
        reject(new Error("Context has been disposed"));
      });
    });
  }
  createWrapper(callback, isDisposed = false) {
    const caller = this[import_core.Context.current];
    caller.scope.assertActive();
    let timer;
    const dispose = /* @__PURE__ */ __name(() => {
      isDisposed = true;
      (0, import_cosmokit.remove)(caller.scope.disposables, dispose);
      clearTimeout(timer);
    }, "dispose");
    const wrapper = /* @__PURE__ */ __name((...args) => {
      clearTimeout(timer);
      timer = callback(args, () => !isDisposed && caller.scope.isActive);
    }, "wrapper");
    wrapper.dispose = dispose;
    caller.scope.disposables.push(dispose);
    return wrapper;
  }
  throttle(callback, delay, noTrailing) {
    let lastCall = -Infinity;
    const execute = /* @__PURE__ */ __name((...args) => {
      lastCall = Date.now();
      callback(...args);
    }, "execute");
    return this.createWrapper((args, isActive) => {
      const now = Date.now();
      const remaining = delay - (now - lastCall);
      if (remaining <= 0) {
        execute(...args);
      } else if (isActive()) {
        return setTimeout(execute, remaining, ...args);
      }
    }, noTrailing);
  }
  debounce(callback, delay) {
    return this.createWrapper((args, isActive) => {
      if (!isActive())
        return;
      return setTimeout(callback, delay, ...args);
    });
  }
};
var src_default = TimerService;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TimerService
});
//# sourceMappingURL=index.cjs.map

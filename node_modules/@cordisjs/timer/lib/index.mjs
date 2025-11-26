var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
import { Context, Service } from "@cordisjs/core";
import { remove } from "cosmokit";
var TimerService = class extends Service {
  static {
    __name(this, "TimerService");
  }
  constructor(ctx) {
    super(ctx, "timer", true);
    ctx.mixin("timer", ["setTimeout", "setInterval", "sleep", "throttle", "debounce"]);
  }
  setTimeout(callback, delay) {
    const dispose = this[Context.current].effect(() => {
      const timer = setTimeout(() => {
        dispose();
        callback();
      }, delay);
      return () => clearTimeout(timer);
    });
    return dispose;
  }
  setInterval(callback, delay) {
    return this[Context.current].effect(() => {
      const timer = setInterval(callback, delay);
      return () => clearInterval(timer);
    });
  }
  sleep(delay) {
    const caller = this[Context.current];
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
    const caller = this[Context.current];
    caller.scope.assertActive();
    let timer;
    const dispose = /* @__PURE__ */ __name(() => {
      isDisposed = true;
      remove(caller.scope.disposables, dispose);
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
export {
  TimerService,
  src_default as default
};
//# sourceMappingURL=index.mjs.map

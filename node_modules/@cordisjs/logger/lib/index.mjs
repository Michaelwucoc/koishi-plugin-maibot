var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
import { Service } from "@cordisjs/core";
import { defineProperty } from "cosmokit";
import Logger from "reggol";
var LoggerService = class _LoggerService extends Service {
  static {
    __name(this, "LoggerService");
  }
  constructor(ctx) {
    super(ctx, "logger", true);
    ctx.on("internal/info", function(format, ...args) {
      this.logger("app").info(format, ...args);
    });
    ctx.on("internal/error", function(format, ...args) {
      this.logger("app").error(format, ...args);
    });
    ctx.on("internal/warning", function(format, ...args) {
      this.logger("app").warn(format, ...args);
    });
  }
  [Service.invoke](name) {
    return new Logger(name, defineProperty({}, "ctx", this.ctx));
  }
  static {
    for (const type of ["success", "error", "info", "warn", "debug", "extend"]) {
      _LoggerService.prototype[type] = function(...args) {
        return this(this.ctx.name)[type](...args);
      };
    }
  }
};
var src_default = LoggerService;
export {
  Logger,
  LoggerService,
  src_default as default
};
//# sourceMappingURL=index.mjs.map

"use strict";
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
  Logger: () => import_reggol.default,
  LoggerService: () => LoggerService,
  default: () => src_default
});
module.exports = __toCommonJS(src_exports);
var import_core = require("@cordisjs/core");
var import_cosmokit = require("cosmokit");
var import_reggol = __toESM(require("reggol"), 1);
var LoggerService = class _LoggerService extends import_core.Service {
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
  [import_core.Service.invoke](name) {
    return new import_reggol.default(name, (0, import_cosmokit.defineProperty)({}, "ctx", this.ctx));
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Logger,
  LoggerService
});
//# sourceMappingURL=index.cjs.map

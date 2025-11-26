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
  Context: () => Context2,
  Logger: () => import_logger2.Logger,
  Schema: () => import_schema2.Schema,
  Service: () => Service2,
  TimerService: () => import_timer2.TimerService,
  default: () => src_default,
  z: () => import_schema2.z
});
module.exports = __toCommonJS(src_exports);
var core = __toESM(require("@cordisjs/core"), 1);
var import_logger = require("@cordisjs/logger");
var import_schema = require("@cordisjs/schema");
var import_timer = require("@cordisjs/timer");
__reExport(src_exports, require("@cordisjs/core"), module.exports);
var import_schema2 = require("@cordisjs/schema");
var import_logger2 = require("@cordisjs/logger");
var import_timer2 = require("@cordisjs/timer");
var Context2 = class extends core.Context {
  static {
    __name(this, "Context");
  }
  baseDir;
  constructor(config) {
    super(config);
    this.baseDir = globalThis.process?.cwd?.() || "";
    this.provide("logger", void 0, true);
    this.provide("timer", void 0, true);
    this.plugin(import_logger.LoggerService);
    this.plugin(import_timer.TimerService);
  }
};
var Service2 = class extends core.Service {
  static {
    __name(this, "Service");
  }
  /** @deprecated use `this.ctx.logger` instead */
  logger;
  schema;
  constructor(...args) {
    super(...args);
    this.logger = this.ctx.logger(this.name);
    this.schema = new import_schema.SchemaService(this.ctx);
  }
  [core.Service.setup]() {
    this.ctx = new Context2();
  }
};
function src_default() {
}
__name(src_default, "default");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Context,
  Logger,
  Schema,
  Service,
  TimerService,
  z,
  ...require("@cordisjs/core")
});
//# sourceMappingURL=index.cjs.map

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
  Schema: () => import_schemastery2.default,
  SchemaService: () => SchemaService,
  default: () => src_default,
  z: () => import_schemastery2.default
});
module.exports = __toCommonJS(src_exports);
var import_cosmokit = require("cosmokit");
var import_core = require("@cordisjs/core");
var import_schemastery = __toESM(require("schemastery"), 1);
var import_schemastery2 = __toESM(require("schemastery"), 1);
var kSchemaOrder = Symbol("cordis.schema.order");
var SchemaService = class {
  constructor(ctx) {
    this.ctx = ctx;
    (0, import_cosmokit.defineProperty)(this, import_core.Service.tracker, {
      property: "ctx"
    });
  }
  static {
    __name(this, "SchemaService");
  }
  _data = import_schemastery.default.intersect([]);
  extend(schema, order = 0) {
    const index = this._data.list.findIndex((a) => a[kSchemaOrder] < order);
    schema[kSchemaOrder] = order;
    return this.ctx.effect(() => {
      if (index >= 0) {
        this._data.list.splice(index, 0, schema);
      } else {
        this._data.list.push(schema);
      }
      this.ctx.emit("internal/service-schema");
      return () => {
        (0, import_cosmokit.remove)(this._data.list, schema);
        this.ctx.emit("internal/service-schema");
      };
    });
  }
  toJSON() {
    return this._data.toJSON();
  }
};
var src_default = SchemaService;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Schema,
  SchemaService,
  z
});
//# sourceMappingURL=index.cjs.map

var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
import { defineProperty, remove } from "cosmokit";
import { Service } from "@cordisjs/core";
import Schema from "schemastery";
import { default as default2, default as default3 } from "schemastery";
var kSchemaOrder = Symbol("cordis.schema.order");
var SchemaService = class {
  constructor(ctx) {
    this.ctx = ctx;
    defineProperty(this, Service.tracker, {
      property: "ctx"
    });
  }
  static {
    __name(this, "SchemaService");
  }
  _data = Schema.intersect([]);
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
        remove(this._data.list, schema);
        this.ctx.emit("internal/service-schema");
      };
    });
  }
  toJSON() {
    return this._data.toJSON();
  }
};
var src_default = SchemaService;
export {
  default2 as Schema,
  SchemaService,
  src_default as default,
  default3 as z
};
//# sourceMappingURL=index.mjs.map

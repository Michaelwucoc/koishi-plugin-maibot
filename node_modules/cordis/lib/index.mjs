var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
import * as core from "@cordisjs/core";
import { LoggerService } from "@cordisjs/logger";
import { SchemaService } from "@cordisjs/schema";
import { TimerService } from "@cordisjs/timer";
export * from "@cordisjs/core";
import { Schema, z } from "@cordisjs/schema";
import { Logger as Logger2 } from "@cordisjs/logger";
import { TimerService as TimerService2 } from "@cordisjs/timer";
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
    this.plugin(LoggerService);
    this.plugin(TimerService);
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
    this.schema = new SchemaService(this.ctx);
  }
  [core.Service.setup]() {
    this.ctx = new Context2();
  }
};
function src_default() {
}
__name(src_default, "default");
export {
  Context2 as Context,
  Logger2 as Logger,
  Schema,
  Service2 as Service,
  TimerService2 as TimerService,
  src_default as default,
  z
};
//# sourceMappingURL=index.mjs.map

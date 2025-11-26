var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
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

// src/worker/index.ts
var worker_exports = {};
module.exports = __toCommonJS(worker_exports);
var import_core3 = require("@koishijs/core");
var import_loader = __toESM(require("@koishijs/loader"));

// src/worker/daemon.ts
var daemon_exports = {};
__export(daemon_exports, {
  Config: () => Config,
  apply: () => apply,
  name: () => name
});
var import_core = require("@koishijs/core");
var Config = import_core.Schema.object({
  autoRestart: import_core.Schema.boolean().description("在运行时崩溃自动重启。").default(true),
  heartbeatInterval: import_core.Schema.number().description("心跳发送间隔。").default(0),
  heartbeatTimeout: import_core.Schema.number().description("心跳超时时间。").default(0)
}).description("守护设置").hidden();
import_core.Context.Config.list.push(import_core.Schema.object({
  daemon: Config
}));
var name = "daemon";
function apply(ctx, config = {}) {
  function handleSignal(signal) {
    if (config.autoRestart) {
      process.send({ type: "exit" });
    }
    ctx.logger("app").info(`terminated by ${signal}`);
    ctx.parallel("exit", signal).finally(() => process.exit());
  }
  __name(handleSignal, "handleSignal");
  ctx.on("ready", () => {
    process.send({ type: "start", body: config });
    process.on("SIGINT", handleSignal);
    process.on("SIGTERM", handleSignal);
    config.heartbeatInterval && setInterval(() => {
      process.send({ type: "heartbeat" });
    }, config.heartbeatInterval);
  });
}
__name(apply, "apply");

// src/worker/logger.ts
var import_core2 = require("@koishijs/core");
var Config2 = import_core2.Schema.object({
  levels: import_core2.Schema.any().description("默认的日志输出等级。"),
  showDiff: import_core2.Schema.boolean().description("标注相邻两次日志输出的时间差。"),
  showTime: import_core2.Schema.union([Boolean, String]).default(true).description("输出日志所使用的时间格式。")
}).description("日志设置").hidden();
(0, import_core2.defineProperty)(import_core2.Context.Config, "logger", Config2);
import_core2.Context.Config.list.push(import_core2.Schema.object({
  logger: Config2
}));
function prepare(config = {}) {
  const { levels } = config;
  if (typeof levels === "object") {
    import_core2.Logger.levels = levels;
  } else if (typeof levels === "number") {
    import_core2.Logger.levels.base = levels;
  }
  let showTime = config.showTime;
  if (showTime === true) showTime = "yyyy-MM-dd hh:mm:ss";
  if (showTime) import_core2.Logger.targets[0].showTime = showTime;
  import_core2.Logger.targets[0].showDiff = config.showDiff;
  if (process.env.KOISHI_LOG_LEVEL) {
    import_core2.Logger.levels.base = +process.env.KOISHI_LOG_LEVEL;
  }
  function ensureBaseLevel(config2, base) {
    config2.base ??= base;
    Object.values(config2).forEach((value) => {
      if (typeof value !== "object") return;
      ensureBaseLevel(value, config2.base);
    });
  }
  __name(ensureBaseLevel, "ensureBaseLevel");
  ensureBaseLevel(import_core2.Logger.levels, 2);
  if (process.env.KOISHI_DEBUG) {
    for (const name2 of process.env.KOISHI_DEBUG.split(",")) {
      new import_core2.Logger(name2).level = import_core2.Logger.DEBUG;
    }
  }
  import_core2.Logger.targets[0].timestamp = Date.now();
}
__name(prepare, "prepare");

// src/worker/index.ts
__reExport(worker_exports, require("koishi"), module.exports);
Object.assign(import_core3.Context.Config.Advanced.dict, {
  timezoneOffset: import_core3.Schema.number().description("时区偏移量 (分钟)。").default((/* @__PURE__ */ new Date()).getTimezoneOffset()),
  stackTraceLimit: import_core3.Schema.natural().description("报错的调用堆栈深度。").default(10),
  plugins: import_core3.Schema.any().hidden()
});
function handleException(error) {
  new import_core3.Logger("app").error(error);
  process.exit(1);
}
__name(handleException, "handleException");
process.on("uncaughtException", handleException);
process.on("unhandledRejection", (error) => {
  new import_core3.Logger("app").warn(error);
});
async function start() {
  const loader = new import_loader.default();
  await loader.init(process.env.KOISHI_CONFIG_FILE);
  const config = await loader.readConfig(true);
  prepare(config.logger);
  if (config.timezoneOffset !== void 0) {
    import_core3.Time.setTimezoneOffset(config.timezoneOffset);
  }
  if (config.stackTraceLimit !== void 0) {
    Error.stackTraceLimit = config.stackTraceLimit;
  }
  const app = await loader.createApp();
  app.plugin(daemon_exports, config.daemon);
  await app.start();
}
__name(start, "start");
start().catch(handleException);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ...require("koishi")
});
//# sourceMappingURL=index.js.map

var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};

// src/worker/index.ts
import { createRequire } from "node:module";
import Loader from "@cordisjs/loader";

// src/worker/daemon.ts
var daemon_exports = {};
__export(daemon_exports, {
  apply: () => apply,
  name: () => name
});
var name = "daemon";
function apply(ctx, config = {}) {
  function handleSignal(signal) {
    if (config.autoRestart) {
      process.send({ type: "exit" });
    }
    ctx.emit(ctx, "internal/info", `terminated by ${signal}`);
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
var logger_exports = {};
__export(logger_exports, {
  apply: () => apply2,
  inject: () => inject
});
import { Logger } from "@cordisjs/logger";
var inject = ["loader"];
function apply2(ctx, config = {}) {
  function handleException(error) {
    new Logger("app").error(error);
    process.exit(1);
  }
  __name(handleException, "handleException");
  process.on("uncaughtException", handleException);
  process.on("unhandledRejection", (error) => {
    new Logger("app").warn(error);
  });
  ctx.on("loader/entry-fork", (entry, type) => {
    if (entry.options.group) return;
    ctx.logger("loader").info("%s plugin %c", type, entry.options.name);
  });
  ctx.loader.prolog = [];
  Logger.targets.push({
    colors: 3,
    record: /* @__PURE__ */ __name((record) => {
      ctx.loader.prolog.push(record);
      ctx.loader.prolog = ctx.loader.prolog.slice(-1e3);
    }, "record")
  });
  const { levels } = config;
  if (typeof levels === "object") {
    Logger.levels = levels;
  } else if (typeof levels === "number") {
    Logger.levels.base = levels;
  }
  let showTime = config.showTime;
  if (showTime === true) showTime = "yyyy-MM-dd hh:mm:ss";
  if (showTime) Logger.targets[0].showTime = showTime;
  Logger.targets[0].showDiff = config.showDiff;
  if (process.env.CORDIS_LOG_LEVEL) {
    Logger.levels.base = +process.env.CORDIS_LOG_LEVEL;
  }
  function ensureBaseLevel(config2, base) {
    config2.base ??= base;
    Object.values(config2).forEach((value) => {
      if (typeof value !== "object") return;
      ensureBaseLevel(value, config2.base);
    });
  }
  __name(ensureBaseLevel, "ensureBaseLevel");
  ensureBaseLevel(Logger.levels, 2);
  if (process.env.CORDIS_LOG_DEBUG) {
    for (const name2 of process.env.CORDIS_LOG_DEBUG.split(",")) {
      new Logger(name2).level = Logger.DEBUG;
    }
  }
  Logger.targets[0].timestamp = Date.now();
}
__name(apply2, "apply");

// src/worker/index.ts
import { Context } from "../index.mjs";
var internalLoaders = [
  // Node 20.13 and above
  (require2) => require2("internal/modules/esm/loader").getOrInitializeCascadedLoader(),
  (require2) => require2("internal/process/esm_loader").esmLoader
];
function getInternal() {
  const require2 = createRequire(import.meta.url);
  for (const loader of internalLoaders) {
    try {
      return loader(require2);
    } catch {
    }
  }
}
__name(getInternal, "getInternal");
async function start(options) {
  const ctx = new Context();
  ctx.plugin(Loader, {
    ...options,
    filename: process.env.CORDIS_LOADER_ENTRY
  });
  if (process.execArgv.includes("--expose-internals")) {
    ctx.loader.internal = getInternal();
  }
  if (options.logger) ctx.plugin(logger_exports, options.logger);
  if (options.daemon) ctx.plugin(daemon_exports, options.daemon);
  await ctx.start();
}
__name(start, "start");
export {
  start
};
//# sourceMappingURL=index.mjs.map

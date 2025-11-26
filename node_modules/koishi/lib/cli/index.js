var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
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

// src/cli/start.ts
var import_utils = require("@koishijs/utils");
var import_child_process = require("child_process");
var import_path = require("path");
var import_kleur = __toESM(require("kleur"));
var child;
process.env.KOISHI_SHARED = JSON.stringify({
  startTime: Date.now()
});
function toArg(key) {
  return key.length === 1 ? `-${key}` : `--${(0, import_utils.hyphenate)(key)}`;
}
__name(toArg, "toArg");
function createWorker(options) {
  const execArgv = Object.entries(options).flatMap(([key, value]) => {
    if (key === "--") return [];
    key = toArg(key);
    if (value === true) {
      return [key];
    } else if (value === false) {
      return ["--no-" + key.slice(2)];
    } else if (Array.isArray(value)) {
      return value.flatMap((value2) => [key, value2]);
    } else {
      return [key, value];
    }
  });
  execArgv.push(...options["--"]);
  child = (0, import_child_process.fork)((0, import_path.resolve)(__dirname, "../worker"), [], {
    execArgv
  });
  let config;
  let timer;
  child.on("message", (message) => {
    if (message.type === "start") {
      config = message.body;
      timer = config.heartbeatTimeout && setTimeout(() => {
        console.log(import_kleur.default.red("daemon: heartbeat timeout"));
        child.kill("SIGKILL");
      }, config.heartbeatTimeout);
    } else if (message.type === "shared") {
      process.env.KOISHI_SHARED = message.body;
    } else if (message.type === "heartbeat") {
      if (timer) timer.refresh();
    }
  });
  const signals = [
    "SIGABRT",
    "SIGBREAK",
    "SIGBUS",
    "SIGFPE",
    "SIGHUP",
    "SIGILL",
    "SIGINT",
    "SIGKILL",
    "SIGSEGV",
    "SIGSTOP",
    "SIGTERM"
  ];
  function shouldExit(code, signal) {
    if (!config) return true;
    if (code === 0) return true;
    if (signals.includes(signal)) return true;
    if (code === 51) return false;
    if (code === 52) return true;
    return !config.autoRestart;
  }
  __name(shouldExit, "shouldExit");
  child.on("exit", (code, signal) => {
    if (shouldExit(code, signal)) {
      process.exit(code);
    }
    createWorker(options);
  });
}
__name(createWorker, "createWorker");
function setEnvArg(name, value) {
  if (value === true) {
    process.env[name] = "";
  } else if (value) {
    process.env[name] = value;
  }
}
__name(setEnvArg, "setEnvArg");
function start_default(cli2) {
  cli2.command("start [file]", "start a koishi bot").alias("run").allowUnknownOptions().option("--debug [namespace]", "specify debug namespace").option("--log-level [level]", "specify log level (default: 2)").option("--log-time [format]", "show timestamp in logs").action((file, options) => {
    const { logLevel, debug, logTime, ...rest } = options;
    if (logLevel !== void 0 && (!(0, import_utils.isInteger)(logLevel) || logLevel < 0)) {
      console.warn(`${import_kleur.default.red("error")} log level should be a positive integer.`);
      process.exit(1);
    }
    setEnvArg("KOISHI_LOG_TIME", logTime);
    process.env.KOISHI_LOG_LEVEL = logLevel || "";
    process.env.KOISHI_DEBUG = debug || "";
    process.env.KOISHI_CONFIG_FILE = file || "";
    createWorker(rest);
  });
}
__name(start_default, "default");

// src/cli/index.ts
var import_cac = require("cac");
var { version } = require("../../package.json");
var cli = (0, import_cac.cac)("koishi").help().version(version);
start_default(cli);
var argv = cli.parse();
if (!cli.matchedCommand && !argv.options.help) {
  cli.outputHelp();
}
//# sourceMappingURL=index.js.map

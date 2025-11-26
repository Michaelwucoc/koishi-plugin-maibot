#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/bin/cordis.ts
import { cac } from "cac";
import kleur from "kleur";
import { start } from "../cli.mjs";
import { hyphenate } from "cosmokit";
import { createRequire } from "node:module";
var require2 = createRequire(import.meta.url);
var { version } = require2("../../package.json");
function isInteger(source) {
  return typeof source === "number" && Math.floor(source) === source;
}
__name(isInteger, "isInteger");
var cli = cac("cordis").help().version(version);
function toArg(key) {
  return key.length === 1 ? `-${key}` : `--${hyphenate(key)}`;
}
__name(toArg, "toArg");
function addToArray(args, arg) {
  if (!args.includes(arg)) args.push(arg);
}
__name(addToArray, "addToArray");
function unparse(argv2) {
  const execArgv = Object.entries(argv2).flatMap(([key, value]) => {
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
  execArgv.push(...argv2["--"]);
  addToArray(execArgv, "--expose-internals");
  return execArgv;
}
__name(unparse, "unparse");
cli.command("start [file]", "start a cordis application").alias("run").allowUnknownOptions().option("--debug [namespace]", "specify debug namespace").option("--log-level [level]", "specify log level (default: 2)").option("--log-time [format]", "show timestamp in logs").action((file, options) => {
  const { logLevel, debug, logTime, ...rest } = options;
  if (logLevel !== void 0 && (!isInteger(logLevel) || logLevel < 0)) {
    console.warn(`${kleur.red("error")} log level should be a positive integer.`);
    process.exit(1);
  }
  process.env.CORDIS_LOG_LEVEL = logLevel || "";
  process.env.CORDIS_LOG_DEBUG = debug || "";
  process.env.CORDIS_LOADER_ENTRY = file || "";
  start({
    name: "cordis",
    daemon: {
      execArgv: unparse(rest)
    },
    logger: {
      showTime: logTime
    }
  });
});
var argv = cli.parse();
if (!cli.matchedCommand && !argv.options.help) {
  cli.outputHelp();
}
//# sourceMappingURL=cordis.mjs.map

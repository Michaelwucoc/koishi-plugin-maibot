"use strict";
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/shared.ts
var import_supports_color = require("supports-color");
var import_cosmokit = require("cosmokit");
var c16 = [6, 2, 3, 4, 5, 1];
var c256 = [
  20,
  21,
  26,
  27,
  32,
  33,
  38,
  39,
  40,
  41,
  42,
  43,
  44,
  45,
  56,
  57,
  62,
  63,
  68,
  69,
  74,
  75,
  76,
  77,
  78,
  79,
  80,
  81,
  92,
  93,
  98,
  99,
  112,
  113,
  129,
  134,
  135,
  148,
  149,
  160,
  161,
  162,
  163,
  164,
  165,
  166,
  167,
  168,
  169,
  170,
  171,
  172,
  173,
  178,
  179,
  184,
  185,
  196,
  197,
  198,
  199,
  200,
  201,
  202,
  203,
  204,
  205,
  206,
  207,
  208,
  209,
  214,
  215,
  220,
  221
];
function isAggregateError(error) {
  return error instanceof Error && Array.isArray(error["errors"]);
}
__name(isAggregateError, "isAggregateError");
var Logger = class _Logger {
  constructor(name, meta) {
    this.name = name;
    this.meta = meta;
    this.createMethod("success", _Logger.SUCCESS);
    this.createMethod("error", _Logger.ERROR);
    this.createMethod("info", _Logger.INFO);
    this.createMethod("warn", _Logger.WARN);
    this.createMethod("debug", _Logger.DEBUG);
  }
  static {
    __name(this, "Logger");
  }
  // log levels
  static SILENT = 0;
  static SUCCESS = 1;
  static ERROR = 1;
  static INFO = 2;
  static WARN = 2;
  static DEBUG = 3;
  // global config
  static id = 0;
  static targets = [{
    colors: import_supports_color.stdout && import_supports_color.stdout.level,
    print(text) {
      console.log(text);
    }
  }];
  // global registry
  static formatters = /* @__PURE__ */ Object.create(null);
  static format(name, formatter) {
    this.formatters[name] = formatter;
  }
  static levels = {
    base: 2
  };
  static color(target, code, value, decoration = "") {
    if (!target.colors) return "" + value;
    return `\x1B[3${code < 8 ? code : "8;5;" + code}${target.colors >= 2 ? decoration : ""}m${value}\x1B[0m`;
  }
  static code(name, target) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 3) - hash + name.charCodeAt(i) + 13;
      hash |= 0;
    }
    const colors = !target.colors ? [] : target.colors >= 2 ? c256 : c16;
    return colors[Math.abs(hash) % colors.length];
  }
  static render(target, record) {
    const prefix = `[${record.type[0].toUpperCase()}]`;
    const space = " ".repeat(target.label?.margin ?? 1);
    let indent = 3 + space.length, output = "";
    if (target.showTime) {
      indent += target.showTime.length + space.length;
      output += _Logger.color(target, 8, import_cosmokit.Time.template(target.showTime)) + space;
    }
    const code = _Logger.code(record.name, target);
    const label = _Logger.color(target, code, record.name, ";1");
    const padLength = (target.label?.width ?? 0) + label.length - record.name.length;
    if (target.label?.align === "right") {
      output += label.padStart(padLength) + space + prefix + space;
      indent += (target.label.width ?? 0) + space.length;
    } else {
      output += prefix + space + label.padEnd(padLength) + space;
    }
    output += record.content.replace(/\n/g, "\n" + " ".repeat(indent));
    if (target.showDiff && target.timestamp) {
      const diff = record.timestamp - target.timestamp;
      output += _Logger.color(target, code, " +" + import_cosmokit.Time.format(diff));
    }
    return output;
  }
  extend = /* @__PURE__ */ __name((namespace) => {
    return new _Logger(`${this.name}:${namespace}`, this.meta);
  }, "extend");
  warning = /* @__PURE__ */ __name((format, ...args) => {
    this.warn(format, ...args);
  }, "warning");
  createMethod(type, level) {
    this[type] = (...args) => {
      if (args.length === 1 && args[0] instanceof Error) {
        if (args[0].cause) {
          this[type](args[0].cause);
        } else if (isAggregateError(args[0])) {
          args[0].errors.forEach((error) => this[type](error));
          return;
        }
      }
      const id = ++_Logger.id;
      const timestamp = Date.now();
      for (const target of _Logger.targets) {
        if (this.getLevel(target) < level) continue;
        const content = this.format(target, ...args);
        const record = { id, type, level, name: this.name, meta: this.meta, content, timestamp };
        if (target.record) {
          target.record(record);
        } else {
          const { print = console.log } = target;
          print(_Logger.render(target, record));
        }
        target.timestamp = timestamp;
      }
    };
  }
  format(target, ...args) {
    if (args[0] instanceof Error) {
      args[0] = args[0].stack || args[0].message;
      args.unshift("%s");
    } else if (typeof args[0] !== "string") {
      args.unshift("%o");
    }
    let format = args.shift();
    format = format.replace(/%([a-zA-Z%])/g, (match, char) => {
      if (match === "%%") return "%";
      const formatter = _Logger.formatters[char];
      if (typeof formatter === "function") {
        const value = args.shift();
        return formatter(value, target, this);
      }
      return match;
    });
    for (let arg of args) {
      if (typeof arg === "object" && arg) {
        arg = _Logger.formatters["o"](arg, target, this);
      }
      format += " " + arg;
    }
    const { maxLength = 10240 } = target;
    return format.split(/\r?\n/g).map((line) => {
      return line.slice(0, maxLength) + (line.length > maxLength ? "..." : "");
    }).join("\n");
  }
  getLevel(target) {
    const paths = this.name.split(":");
    let config = target?.levels || _Logger.levels;
    do {
      config = config[paths.shift()] ?? config["base"];
    } while (paths.length && typeof config === "object");
    return config;
  }
  get level() {
    return this.getLevel();
  }
  set level(value) {
    const paths = this.name.split(":");
    let config = _Logger.levels;
    while (paths.length > 1) {
      const name = paths.shift();
      const value2 = config[name];
      if (typeof value2 === "object") {
        config = value2;
      } else {
        config = config[name] = { base: value2 ?? config.base };
      }
    }
    config[paths[0]] = value;
  }
};
Logger.format("s", (value) => value);
Logger.format("d", (value) => +value);
Logger.format("j", (value) => JSON.stringify(value));
Logger.format("c", (value, target, logger) => {
  return Logger.color(target, Logger.code(logger.name, target), value);
});
Logger.format("C", (value, target) => {
  return Logger.color(target, 15, value, ";1");
});
module.exports = Logger;

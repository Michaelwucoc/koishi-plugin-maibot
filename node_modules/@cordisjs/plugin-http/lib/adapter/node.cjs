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

// src/adapter/node.ts
var node_exports = {};
__export(node_exports, {
  WebSocket: () => import_ws.WebSocket,
  loadFile: () => loadFile,
  lookup: () => import_promises2.lookup
});
module.exports = __toCommonJS(node_exports);
var import_node_url = require("node:url");
var import_node_path = require("node:path");
var import_file_type = __toESM(require("file-type"), 1);
var import_promises = require("node:fs/promises");
var import_cosmokit = require("cosmokit");
var import_promises2 = require("node:dns/promises");
var import_ws = require("ws");
async function loadFile(url) {
  if (url.startsWith("file://")) {
    const data = await (0, import_promises.readFile)((0, import_node_url.fileURLToPath)(url));
    const result = await import_file_type.default.fromBuffer(data);
    return {
      type: result?.mime,
      mime: result?.mime,
      filename: (0, import_node_path.basename)(url),
      data: import_cosmokit.Binary.fromSource(data)
    };
  }
}
__name(loadFile, "loadFile");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  WebSocket,
  loadFile,
  lookup
});

var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/adapter/node.ts
import { fileURLToPath } from "node:url";
import { basename } from "node:path";
import FileType from "file-type";
import { readFile } from "node:fs/promises";
import { Binary } from "cosmokit";
import { lookup } from "node:dns/promises";
import { WebSocket } from "ws";
async function loadFile(url) {
  if (url.startsWith("file://")) {
    const data = await readFile(fileURLToPath(url));
    const result = await FileType.fromBuffer(data);
    return {
      type: result?.mime,
      mime: result?.mime,
      filename: basename(url),
      data: Binary.fromSource(data)
    };
  }
}
__name(loadFile, "loadFile");
export {
  WebSocket,
  loadFile,
  lookup
};

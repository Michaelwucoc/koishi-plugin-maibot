var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
import Module from "node:module";
import { pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";
import { Loader } from "./loader.js";
import * as dotenv from "dotenv";
import * as path from "node:path";
export * from "./loader.js";
var oldEnv = { ...process.env };
var NodeLoader = class _NodeLoader extends Loader {
  static {
    __name(this, "NodeLoader");
  }
  static exitCode = 51;
  async init(baseDir, options) {
    await super.init(baseDir, options);
    for (const key in process.env) {
      if (key in oldEnv) {
        process.env[key] = oldEnv[key];
      } else {
        delete process.env[key];
      }
    }
    const override = {};
    const envFiles = [".env", ".env.local"];
    for (const filename of envFiles) {
      try {
        const raw = await readFile(path.resolve(this.ctx.baseDir, filename), "utf8");
        Object.assign(override, dotenv.parse(raw));
      } catch {
      }
    }
    for (const key in override) {
      process.env[key] = override[key];
    }
  }
  async start() {
    const originalLoad = Module["_load"];
    Module["_load"] = (request, parent, isMain) => {
      try {
        return originalLoad(request, parent, isMain);
      } catch (e) {
        if (e.code !== "ERR_REQUIRE_ESM" || !this.internal) throw e;
        try {
          const result = this.internal.resolveSync(request, pathToFileURL(parent.filename).href, {});
          const job = result?.format === "module" ? this.internal.loadCache.get(result.url) : void 0;
          if (job) return job?.module?.getNamespace();
        } catch {
          throw e;
        }
      }
    };
    await super.start();
  }
  exit(code = _NodeLoader.exitCode) {
    const body = JSON.stringify(this.envData);
    process.send?.({ type: "shared", body }, (err) => {
      if (err) this.ctx.emit(this.ctx, "internal/error", "failed to send shared data");
      this.ctx.emit(this.ctx, "internal/info", "trigger full reload");
      process.exit(code);
    });
  }
};
var src_default = NodeLoader;
export {
  src_default as default
};
//# sourceMappingURL=index.js.map

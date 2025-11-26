// src/worker/main.ts
import assert from "assert";
import { start } from "./index.mjs";
assert.ok(process.env.CORDIS_LOADER_OPTIONS);
start(JSON.parse(process.env.CORDIS_LOADER_OPTIONS));
//# sourceMappingURL=main.mjs.map

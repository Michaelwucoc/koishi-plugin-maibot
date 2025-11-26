var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __export = (target, all) => {
  for (var name3 in all)
    __defProp(target, name3, { get: all[name3], enumerable: true });
};

// src/loader.ts
import { isNullable as isNullable2 } from "cosmokit";

// src/config/entry.ts
import { isNullable } from "cosmokit";

// src/config/group.ts
var EntryGroup = class {
  constructor(ctx, tree) {
    this.ctx = ctx;
    this.tree = tree;
    const entry = ctx.scope.entry;
    if (entry) entry.subgroup = this;
  }
  static {
    __name(this, "EntryGroup");
  }
  static key = Symbol.for("cordis.group");
  data = [];
  async create(options) {
    const id = this.tree.ensureId(options);
    const entry = this.tree.store[id] ??= new Entry(this.ctx.loader);
    entry.parent = this;
    await entry.update(options, true);
    return entry.id;
  }
  unlink(options) {
    const config = this.data;
    const index = config.indexOf(options);
    if (index >= 0) config.splice(index, 1);
  }
  remove(id) {
    const entry = this.tree.store[id];
    if (!entry) return;
    entry.stop();
    this.unlink(entry.options);
    delete this.tree.store[id];
    this.ctx.emit("loader/partial-dispose", entry, entry.options, false);
  }
  update(config) {
    const oldConfig = this.data;
    this.data = config;
    const oldMap = Object.fromEntries(oldConfig.map((options) => [options.id, options]));
    const newMap = Object.fromEntries(config.map((options) => [options.id ?? Symbol("anonymous"), options]));
    for (const id of Reflect.ownKeys({ ...oldMap, ...newMap })) {
      if (newMap[id]) {
        this.create(newMap[id]).catch((error) => {
          this.ctx.emit(this.ctx, "internal/error", error);
        });
      } else {
        this.remove(id);
      }
    }
  }
  stop() {
    for (const options of this.data) {
      this.remove(options.id);
    }
  }
};
var Group = class extends EntryGroup {
  constructor(ctx) {
    super(ctx, ctx.scope.entry.parent.tree);
    this.ctx = ctx;
    ctx.on("dispose", () => this.stop());
    ctx.accept((config) => {
      this.update(config);
    }, { passive: true, immediate: true });
  }
  static {
    __name(this, "Group");
  }
  static reusable = true;
  static initial = [];
  static [EntryGroup.key] = true;
};

// src/config/tree.ts
var EntryTree = class _EntryTree {
  constructor(ctx) {
    this.ctx = ctx;
    this.root = new EntryGroup(ctx, this);
    const entry = ctx.scope.entry;
    if (entry) entry.subtree = this;
  }
  static {
    __name(this, "EntryTree");
  }
  static sep = ":";
  url;
  root;
  store = /* @__PURE__ */ Object.create(null);
  get context() {
    return this.ctx;
  }
  *entries() {
    for (const entry of Object.values(this.store)) {
      yield entry;
      if (!entry.subtree) continue;
      yield* entry.subtree.entries();
    }
  }
  ensureId(options) {
    if (!options.id) {
      do {
        options.id = Math.random().toString(36).slice(2, 8);
      } while (this.store[options.id]);
    }
    return options.id;
  }
  resolve(id) {
    const parts = id.split(_EntryTree.sep);
    let tree = this;
    const final = parts.pop();
    for (const part of parts) {
      tree = tree.store[part]?.subtree;
      if (!tree) throw new Error(`cannot resolve entry ${id}`);
    }
    const entry = tree.store[final];
    if (!entry) throw new Error(`cannot resolve entry ${id}`);
    return entry;
  }
  resolveGroup(id) {
    if (!id) return this.root;
    const entry = this.resolve(id);
    if (!entry.subgroup) throw new Error(`entry ${id} is not a group`);
    return entry.subgroup;
  }
  async create(options, parent = null, position = Infinity) {
    const group = this.resolveGroup(parent);
    group.data.splice(position, 0, options);
    group.tree.write();
    return group.create(options);
  }
  remove(id) {
    const entry = this.resolve(id);
    entry.parent.remove(id);
    entry.parent.tree.write();
  }
  async update(id, options, parent, position) {
    const entry = this.resolve(id);
    const source = entry.parent;
    if (parent !== void 0) {
      const target = this.resolveGroup(parent);
      source.unlink(entry.options);
      target.data.splice(position ?? Infinity, 0, entry.options);
      target.tree.write();
      entry.parent = target;
    }
    source.tree.write();
    return entry.update(options);
  }
  async import(name3) {
    if (this.ctx.loader.internal) {
      return this.ctx.loader.internal.import(name3, this.url, {});
    } else {
      return import(name3);
    }
  }
};

// src/config/utils.ts
import { valueMap } from "cosmokit";
import * as yaml from "js-yaml";
var evaluate = new Function("ctx", "expr", `
  with (ctx) {
    return eval(expr)
  }
`);
function interpolate(ctx, value) {
  if (isJsExpr(value)) {
    return evaluate(ctx, value.__jsExpr);
  } else if (!value || typeof value !== "object") {
    return value;
  } else if (Array.isArray(value)) {
    return value.map((item) => interpolate(ctx, item));
  } else {
    return valueMap(value, (item) => interpolate(ctx, item));
  }
}
__name(interpolate, "interpolate");
function isJsExpr(value) {
  return value instanceof Object && "__jsExpr" in value;
}
__name(isJsExpr, "isJsExpr");
var JsExpr = new yaml.Type("tag:yaml.org,2002:js", {
  kind: "scalar",
  resolve: /* @__PURE__ */ __name((data) => typeof data === "string", "resolve"),
  construct: /* @__PURE__ */ __name((data) => ({ __jsExpr: data }), "construct"),
  predicate: isJsExpr,
  represent: /* @__PURE__ */ __name((data) => data["__jsExpr"], "represent")
});

// src/config/entry.ts
function takeEntries(object, keys) {
  const result = [];
  for (const key of keys) {
    if (!(key in object)) continue;
    result.push([key, object[key]]);
    delete object[key];
  }
  return result;
}
__name(takeEntries, "takeEntries");
function sortKeys(object, prepend = ["id", "name"], append = ["config"]) {
  const part1 = takeEntries(object, prepend);
  const part2 = takeEntries(object, append);
  const rest = takeEntries(object, Object.keys(object)).sort(([a], [b]) => a.localeCompare(b));
  return Object.assign(object, Object.fromEntries([...part1, ...rest, ...part2]));
}
__name(sortKeys, "sortKeys");
var Entry = class _Entry {
  constructor(loader) {
    this.loader = loader;
    this.ctx = loader.ctx.extend();
    this.context.emit("loader/entry-init", this);
  }
  static {
    __name(this, "Entry");
  }
  static key = Symbol.for("cordis.entry");
  ctx;
  fork;
  suspend = false;
  parent;
  options;
  subgroup;
  subtree;
  get context() {
    return this.ctx;
  }
  get id() {
    let id = this.options.id;
    if (this.parent.tree.ctx.scope.entry) {
      id = this.parent.tree.ctx.scope.entry.id + EntryTree.sep + id;
    }
    return id;
  }
  get disabled() {
    if (this.options.group) return false;
    let entry = this;
    do {
      if (entry.options.disabled) return true;
      entry = entry.parent.ctx.scope.entry;
    } while (entry);
    return false;
  }
  _check() {
    if (this.disabled) return false;
    return !this.parent.ctx.bail("loader/entry-check", this);
  }
  evaluate(expr) {
    return evaluate(this.ctx, expr);
  }
  _resolveConfig(plugin) {
    if (plugin[EntryGroup.key]) return [this.options.config];
    try {
      return [interpolate(this.ctx, this.options.config)];
    } catch (error) {
      this.context.emit(this.ctx, "internal/error", error);
      return [null, error];
    }
  }
  patch(options = {}) {
    const meta = {};
    this.context.emit(meta, "loader/before-patch", this);
    Object.setPrototypeOf(this.ctx, this.parent.ctx);
    if (this.fork && "config" in options) {
      this.suspend = true;
      const [config, error] = this._resolveConfig(this.fork.runtime.plugin);
      if (error) {
        this.fork.cancel(error);
      } else {
        this.fork.update(config);
      }
    } else if (this.subgroup && "disabled" in options) {
      const tree = this.subtree ?? this.parent.tree;
      for (const options2 of this.subgroup.data) {
        tree.store[options2.id].update({
          disabled: options2.disabled
        });
      }
    }
    this.context.emit(meta, "loader/after-patch", this);
  }
  async refresh() {
    const ready = this._check();
    if (ready && !this.fork) {
      await this.start();
    } else if (!ready && this.fork) {
      await this.stop();
    }
  }
  async update(options, override = false) {
    const legacy = { ...this.options };
    if (override) {
      this.options = options;
    } else {
      for (const [key, value] of Object.entries(options)) {
        if (isNullable(value)) {
          delete this.options[key];
        } else {
          this.options[key] = value;
        }
      }
    }
    sortKeys(this.options);
    if (!this._check()) {
      await this.stop();
    } else if (this.fork) {
      this.context.emit("loader/partial-dispose", this, legacy, true);
      this.patch(options);
    } else {
      await this.start();
    }
  }
  async start() {
    const exports = await this.parent.tree.import(this.options.name).catch((error2) => {
      this.context.emit(this.ctx, "internal/error", new Error(`Cannot find package "${this.options.name}"`));
      this.context.emit(this.ctx, "internal/error", error2);
    });
    if (!exports) return;
    const plugin = this.loader.unwrapExports(exports);
    this.patch();
    this.ctx[_Entry.key] = this;
    const [config, error] = this._resolveConfig(plugin);
    this.fork = this.ctx.registry.plugin(plugin, config, error);
    this.context.emit("loader/entry-fork", this, "apply");
  }
  async stop() {
    this.fork?.dispose();
    this.fork = void 0;
  }
};

// src/config/import.ts
import { dirname, extname, resolve } from "node:path";
import { readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// src/config/file.ts
import { access, constants, readFile, rename, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { remove } from "cosmokit";
import * as yaml2 from "js-yaml";
var schema = yaml2.JSON_SCHEMA.extend(JsExpr);
var LoaderFile = class {
  constructor(name3, type) {
    this.name = name3;
    this.type = type;
    this.readonly = !type;
  }
  static {
    __name(this, "LoaderFile");
  }
  suspend = false;
  readonly;
  trees = [];
  writeTask;
  ref(tree) {
    this.trees.push(tree);
    tree.url = pathToFileURL(this.name).href;
    tree.ctx.loader.files[tree.url] ??= this;
  }
  unref(tree) {
    remove(this.trees, tree);
    if (this.trees.length) return;
    delete tree.ctx.loader.files[tree.url];
  }
  async checkAccess() {
    if (!this.type) return;
    try {
      await access(this.name, constants.W_OK);
    } catch {
      this.readonly = true;
    }
  }
  async read() {
    if (this.type === "application/yaml") {
      return yaml2.load(await readFile(this.name, "utf8"), { schema });
    } else if (this.type === "application/json") {
      return JSON.parse(await readFile(this.name, "utf8"));
    } else {
      const module = await import(this.name);
      return module.default || module;
    }
  }
  async _write(config) {
    this.suspend = true;
    if (this.readonly) {
      throw new Error(`cannot overwrite readonly config`);
    }
    if (this.type === "application/yaml") {
      await writeFile(this.name + ".tmp", yaml2.dump(config, { schema }));
    } else if (this.type === "application/json") {
      await writeFile(this.name + ".tmp", JSON.stringify(config, null, 2));
    }
    await rename(this.name + ".tmp", this.name);
  }
  write(config) {
    clearTimeout(this.writeTask);
    this.writeTask = setTimeout(() => {
      this.writeTask = void 0;
      this._write(config);
    }, 0);
  }
};
((LoaderFile2) => {
  LoaderFile2.writable = {
    ".json": "application/json",
    ".yaml": "application/yaml",
    ".yml": "application/yaml"
  };
  LoaderFile2.supported = new Set(Object.keys(LoaderFile2.writable));
  if (typeof __require !== "undefined") {
    for (const extname2 in __require.extensions) {
      LoaderFile2.supported.add(extname2);
    }
  }
})(LoaderFile || (LoaderFile = {}));

// src/config/import.ts
var ImportTree = class extends EntryTree {
  constructor(ctx) {
    super(ctx);
    this.ctx = ctx;
    ctx.on("ready", () => this.start());
    ctx.on("dispose", () => this.stop());
  }
  static {
    __name(this, "ImportTree");
  }
  static reusable = true;
  file;
  async start() {
    await this.refresh();
    await this.file.checkAccess();
  }
  async refresh() {
    this.root.update(await this.file.read());
  }
  stop() {
    this.file?.unref(this);
    return this.root.stop();
  }
  write() {
    this.context.emit("loader/config-update");
    return this.file.write(this.root.data);
  }
  async init(baseDir, options) {
    if (options.filename) {
      const filename = resolve(baseDir, options.filename);
      const stats = await stat(filename);
      if (stats.isFile()) {
        baseDir = dirname(filename);
        const ext = extname(filename);
        const type = LoaderFile.writable[ext];
        if (!LoaderFile.supported.has(ext)) {
          throw new Error(`extension "${ext}" not supported`);
        }
        this.file = new LoaderFile(filename, type);
        this.file.ref(this);
      } else {
        baseDir = filename;
        await this._init(baseDir, options);
      }
    } else {
      await this._init(baseDir, options);
    }
    this.ctx.provide("baseDir", baseDir, true);
  }
  async _init(baseDir, options) {
    const { name: name3, initial } = options;
    const dirents = await readdir(baseDir, { withFileTypes: true });
    for (const extension of LoaderFile.supported) {
      const dirent = dirents.find((dirent2) => dirent2.name === name3 + extension);
      if (!dirent) continue;
      if (!dirent.isFile()) {
        throw new Error(`config file "${dirent.name}" is not a file`);
      }
      const type = LoaderFile.writable[extension];
      const filename = resolve(baseDir, name3 + extension);
      this.file = new LoaderFile(filename, type);
      this.file.ref(this);
      return;
    }
    if (initial) {
      const type = LoaderFile.writable[".yml"];
      const filename = resolve(baseDir, name3 + ".yml");
      this.file = new LoaderFile(filename, type);
      this.file.ref(this);
      return this.file.write(initial);
    }
    throw new Error("config file not found");
  }
};
var Import = class extends ImportTree {
  constructor(ctx, config) {
    super(ctx);
    this.config = config;
  }
  static {
    __name(this, "Import");
  }
  async start() {
    const { url } = this.config;
    const filename = fileURLToPath(new URL(url, this.ctx.scope.entry.parent.tree.url));
    const ext = extname(filename);
    if (!LoaderFile.supported.has(ext)) {
      throw new Error(`extension "${ext}" not supported`);
    }
    this.file = new LoaderFile(filename, LoaderFile.writable[ext]);
    this.file.ref(this);
    await super.start();
  }
};

// src/config/inject.ts
var inject_exports = {};
__export(inject_exports, {
  apply: () => apply,
  name: () => name
});
import { Inject } from "@cordisjs/core";
import { filterKeys } from "cosmokit";
var name = "inject";
function apply(ctx) {
  function getRequired(entry) {
    return filterKeys(Inject.resolve(entry.options.inject), (_, meta) => meta.required);
  }
  __name(getRequired, "getRequired");
  const checkInject = /* @__PURE__ */ __name((scope, name3) => {
    if (!scope.runtime.plugin) return false;
    if (scope.runtime === scope) {
      return scope.runtime.children.every((fork) => checkInject(fork, name3));
    }
    if (name3 in Inject.resolve(scope.entry?.options.inject)) return true;
    return checkInject(scope.parent.scope, name3);
  }, "checkInject");
  ctx.on("internal/inject", function(name3) {
    return checkInject(this.scope, name3);
  });
  ctx.on("loader/entry-check", (entry) => {
    for (const name3 in getRequired(entry)) {
      if (!entry.ctx.get(name3)) return true;
    }
  });
  ctx.on("internal/before-service", (name3) => {
    for (const entry of ctx.loader.entries()) {
      if (!(name3 in getRequired(entry))) continue;
      entry.refresh();
    }
  }, { global: true });
  ctx.on("internal/service", (name3) => {
    for (const entry of ctx.loader.entries()) {
      if (!(name3 in getRequired(entry))) continue;
      entry.refresh();
    }
  }, { global: true });
}
__name(apply, "apply");

// src/config/isolate.ts
var isolate_exports = {};
__export(isolate_exports, {
  GlobalRealm: () => GlobalRealm,
  LocalRealm: () => LocalRealm,
  Realm: () => Realm,
  apply: () => apply2,
  name: () => name2
});
import { Context as Context2 } from "@cordisjs/core";
function swap(target, source) {
  for (const key of Reflect.ownKeys(target)) {
    Reflect.deleteProperty(target, key);
  }
  for (const key of Reflect.ownKeys(source || {})) {
    Reflect.defineProperty(target, key, Reflect.getOwnPropertyDescriptor(source, key));
  }
}
__name(swap, "swap");
var Realm = class {
  static {
    __name(this, "Realm");
  }
  store = /* @__PURE__ */ Object.create(null);
  access(key, create = false) {
    if (create) {
      return this.store[key] ??= Symbol(`${key}${this.suffix}`);
    } else {
      return this.store[key] ?? Symbol(`${key}${this.suffix}`);
    }
  }
  delete(key) {
    delete this.store[key];
  }
  get size() {
    return Object.keys(this.store).length;
  }
};
var LocalRealm = class extends Realm {
  constructor(entry) {
    super();
    this.entry = entry;
  }
  static {
    __name(this, "LocalRealm");
  }
  get suffix() {
    return "#" + this.entry.options.id;
  }
};
var GlobalRealm = class extends Realm {
  constructor(label) {
    super();
    this.label = label;
  }
  static {
    __name(this, "GlobalRealm");
  }
  get suffix() {
    return "@" + this.label;
  }
};
var name2 = "isolate";
function apply2(ctx) {
  const realms = /* @__PURE__ */ Object.create(null);
  function access2(entry, key, create = false) {
    let realm;
    const label = entry.options.isolate?.[key];
    if (!label) return;
    if (label === true) {
      realm = entry.realm ??= new LocalRealm(entry);
    } else if (create) {
      realm = realms[label] ??= new GlobalRealm(label);
    } else {
      realm = realms[label];
    }
    return realm?.access(key, create);
  }
  __name(access2, "access");
  ctx.on("loader/entry-init", (entry) => {
    entry.ctx[Context2.intercept] = Object.create(entry.ctx[Context2.intercept]);
    entry.ctx[Context2.isolate] = Object.create(entry.ctx[Context2.isolate]);
  });
  ctx.on("loader/before-patch", function(entry) {
    this.newMap = Object.create(entry.parent.ctx[Context2.isolate]);
    for (const key of Object.keys(entry.options.isolate ?? {})) {
      this.newMap[key] = access2(entry, key, true);
    }
    this.diff = [];
    const oldMap = entry.ctx[Context2.isolate];
    for (const key in { ...this.newMap, ...entry.loader.delims }) {
      if (this.newMap[key] === oldMap[key]) continue;
      const delim = entry.loader.delims[key] ??= Symbol(`delim:${key}`);
      entry.ctx[delim] = Symbol(`${key}#${entry.id}`);
      for (const symbol of [oldMap[key], this.newMap[key]]) {
        const item = symbol && entry.ctx[Context2.store][symbol];
        if (!item) continue;
        if (!item.source) {
          entry.ctx.emit(entry.ctx, "internal/warning", new Error(`expected service ${key} to be implemented`));
          continue;
        }
        this.diff.push([key, oldMap[key], this.newMap[key], entry.ctx[delim], item.source[delim]]);
        if (entry.ctx[delim] !== item.source[delim]) break;
      }
    }
    for (const [key, symbol1, symbol2, flag1, flag2] of this.diff) {
      const self = Object.create(entry.ctx);
      self[Context2.filter] = (target) => {
        if (![symbol1, symbol2].includes(target[Context2.isolate][key])) return false;
        return flag1 === target[entry.loader.delims[key]] !== (flag1 === flag2);
      };
      entry.ctx.emit(self, "internal/before-service", key);
    }
    Object.setPrototypeOf(entry.ctx[Context2.isolate], entry.parent.ctx[Context2.isolate]);
    Object.setPrototypeOf(entry.ctx[Context2.intercept], entry.parent.ctx[Context2.intercept]);
    swap(entry.ctx[Context2.isolate], this.newMap);
    swap(entry.ctx[Context2.intercept], entry.options.intercept);
  });
  ctx.on("loader/after-patch", function(entry) {
    for (const [, symbol1, symbol2, flag1, flag2] of this.diff) {
      if (flag1 === flag2 && entry.ctx[Context2.store][symbol1] && !entry.ctx[Context2.store][symbol2]) {
        entry.ctx[Context2.store][symbol2] = entry.ctx[Context2.store][symbol1];
        delete entry.ctx[Context2.store][symbol1];
      }
    }
    for (const [key, symbol1, symbol2, flag1, flag2] of this.diff) {
      const self = Object.create(entry.ctx);
      self[Context2.filter] = (target) => {
        if (![symbol1, symbol2].includes(target[Context2.isolate][key])) return false;
        return flag1 === target[entry.loader.delims[key]] !== (flag1 === flag2);
      };
      entry.ctx.emit(self, "internal/service", key);
    }
    for (const key in entry.loader.delims) {
      if (!Reflect.ownKeys(this.newMap).includes(key)) {
        delete entry.ctx[entry.loader.delims[key]];
      }
    }
  });
  ctx.on("loader/partial-dispose", (entry, legacy, active) => {
    for (const [key, label] of Object.entries(legacy.isolate ?? {})) {
      if (label === true) continue;
      if (active && entry.options.isolate?.[key] === label) continue;
      const realm = realms[label];
      if (!realm) continue;
      for (const entry2 of ctx.loader.entries()) {
        if (entry2.options.isolate?.[key] === realm.label) return;
      }
      realm.delete(key);
      if (!realm.size) {
        delete realms[realm.label];
      }
    }
  });
}
__name(apply2, "apply");

// src/loader.ts
var Loader = class extends ImportTree {
  constructor(ctx, config) {
    super(ctx);
    this.ctx = ctx;
    this.config = config;
    ctx.set("loader", this);
    ctx.on("internal/update", (fork) => {
      if (!fork.entry) return;
      fork.parent.emit("loader/entry-fork", fork.entry, "reload");
    });
    ctx.on("internal/before-update", (fork, config2) => {
      if (!fork.entry) return;
      if (fork.entry.suspend) return fork.entry.suspend = false;
      const { schema: schema2 } = fork.runtime;
      fork.entry.options.config = schema2 ? schema2.simplify(config2) : config2;
      fork.entry.parent.tree.write();
    });
    ctx.on("internal/fork", (fork) => {
      if (fork.parent[Entry.key]) {
        fork.entry = fork.parent[Entry.key];
        delete fork.parent[Entry.key];
      }
      if (fork.uid) return;
      if (!fork.entry) return;
      if (!ctx.registry.has(fork.runtime.plugin)) return;
      fork.entry.fork = void 0;
      fork.parent.emit("loader/entry-fork", fork.entry, "unload");
      if (!fork.entry._check()) return;
      fork.entry.options.disabled = true;
      fork.entry.parent.tree.write();
    });
    ctx.plugin(inject_exports);
    ctx.plugin(isolate_exports);
  }
  static {
    __name(this, "Loader");
  }
  // TODO auto inject optional when provided?
  static inject = {
    loader: { required: false }
  };
  // process
  envData = process.env.CORDIS_SHARED ? JSON.parse(process.env.CORDIS_SHARED) : { startTime: Date.now() };
  params = {
    env: process.env
  };
  files = /* @__PURE__ */ Object.create(null);
  delims = /* @__PURE__ */ Object.create(null);
  internal;
  async start() {
    await this.init(process.cwd(), this.config);
    this.ctx.set("env", process.env);
    await super.start();
  }
  locate(ctx = this.ctx) {
    return this._locate(ctx.scope).map((entry) => entry.id);
  }
  _locate(scope) {
    if (!scope.runtime.plugin) return [];
    if (scope.runtime === scope) {
      return scope.runtime.children.flatMap((child) => this._locate(child));
    }
    if (scope.entry) return [scope.entry];
    return this._locate(scope.parent.scope);
  }
  exit() {
  }
  unwrapExports(exports) {
    if (isNullable2(exports)) return exports;
    exports = exports.default ?? exports;
    if (!exports.__esModule) return exports;
    return exports.default ?? exports;
  }
};
var loader_default = Loader;
export {
  Entry,
  EntryGroup,
  EntryTree,
  Group,
  Import,
  ImportTree,
  Loader,
  LoaderFile,
  loader_default as default,
  schema
};
//# sourceMappingURL=loader.js.map

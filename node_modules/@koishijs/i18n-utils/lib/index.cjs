var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// koishi/packages/i18n-utils/src/index.ts
var src_exports = {};
__export(src_exports, {
  LocaleTree: () => LocaleTree,
  fallback: () => fallback
});
module.exports = __toCommonJS(src_exports);
var import_cosmokit = require("cosmokit");
var LocaleTree;
((LocaleTree2) => {
  function from(locales) {
    const tree = {};
    for (const locale of locales.filter(Boolean)) {
      const tokens = locale.split("-");
      let current = tree;
      for (let i = 0; i < tokens.length; i++) {
        const locale2 = tokens.slice(0, i + 1).join("-");
        current = current[locale2] = current[locale2] || {};
      }
    }
    return tree;
  }
  LocaleTree2.from = from;
  __name(from, "from");
})(LocaleTree || (LocaleTree = {}));
function toLocaleEntry(key, tree) {
  return [key, [[key, []], ...Object.entries(tree).map(([key2, value]) => toLocaleEntry(key2, value))]];
}
__name(toLocaleEntry, "toLocaleEntry");
function* traverse([key, children], ignored) {
  if (!children.length) {
    return yield key;
  }
  for (const child of children) {
    if (ignored.includes(child))
      continue;
    yield* traverse(child, ignored);
  }
}
__name(traverse, "traverse");
function fallback(tree, locales) {
  const root = toLocaleEntry("", tree);
  const ignored = [];
  for (const locale of (0, import_cosmokit.deduplicate)(locales).filter(Boolean).reverse()) {
    let prefix = "", children = root[1];
    const tokens = locale ? locale.split("-") : [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const current = prefix + token;
      const index = children.findIndex(([key]) => key === current);
      if (index < 0)
        break;
      const entry = children[index];
      if (index > 0) {
        children.splice(index, 1);
        children.unshift(entry);
      }
      children = entry[1];
      prefix = current + "-";
      if (current === locale) {
        ignored.unshift(entry);
      }
    }
  }
  ignored.push(root);
  const results = [];
  for (const entry of ignored) {
    results.push(...traverse(entry, ignored));
  }
  return results;
}
__name(fallback, "fallback");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  LocaleTree,
  fallback
});
//# sourceMappingURL=index.cjs.map

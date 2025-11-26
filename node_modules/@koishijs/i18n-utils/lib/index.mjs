var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// koishi/packages/i18n-utils/src/index.ts
import { deduplicate } from "cosmokit";
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
  for (const locale of deduplicate(locales).filter(Boolean).reverse()) {
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
export {
  LocaleTree,
  fallback
};
//# sourceMappingURL=index.mjs.map

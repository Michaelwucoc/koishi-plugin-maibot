"use strict";
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
var import_cosmokit = require("cosmokit");
var kElement = Symbol.for("satori.element");
var ElementConstructor = class {
  static {
    __name(this, "ElementConstructor");
  }
  get data() {
    return this.attrs;
  }
  getTagName() {
    if (this.type === "component") {
      return this.attrs.is?.name ?? "component";
    } else {
      return this.type;
    }
  }
  toAttrString() {
    return Object.entries(this.attrs).map(([key, value]) => {
      if ((0, import_cosmokit.isNullable)(value)) return "";
      key = (0, import_cosmokit.hyphenate)(key);
      if (value === true) return ` ${key}`;
      if (value === false) return ` no-${key}`;
      return ` ${key}="${Element.escape("" + value, true)}"`;
    }).join("");
  }
  toString(strip = false) {
    if (this.type === "text" && "content" in this.attrs) {
      return strip ? this.attrs.content : Element.escape(this.attrs.content);
    }
    const inner = this.children.map((child) => child.toString(strip)).join("");
    if (strip) return inner;
    const attrs = this.toAttrString();
    const tag = this.getTagName();
    if (!this.children.length) return `<${tag}${attrs}/>`;
    return `<${tag}${attrs}>${inner}</${tag}>`;
  }
};
(0, import_cosmokit.defineProperty)(ElementConstructor, "name", "Element");
(0, import_cosmokit.defineProperty)(ElementConstructor.prototype, kElement, true);
function Element(type, ...args) {
  const el = Object.create(ElementConstructor.prototype);
  const attrs = {}, children = [];
  if (args[0] && typeof args[0] === "object" && !Element.isElement(args[0]) && !Array.isArray(args[0])) {
    const props = args.shift();
    for (const [key, value] of Object.entries(props)) {
      if ((0, import_cosmokit.isNullable)(value)) continue;
      if (key === "children") {
        args.push(...(0, import_cosmokit.makeArray)(value));
      } else {
        attrs[(0, import_cosmokit.camelize)(key)] = value;
      }
    }
  }
  for (const child of args) {
    children.push(...Element.toElementArray(child));
  }
  if (typeof type === "function") {
    attrs.is = type;
    type = "component";
  }
  return Object.assign(el, { type, attrs, children });
}
__name(Element, "Element");
var evaluate = new Function("expr", "context", `
  try {
    with (context) {
      return eval(expr)
    }
  } catch {}
`);
((Element2) => {
  Element2.jsx = Element2;
  Element2.jsxs = Element2;
  Element2.jsxDEV = Element2;
  Element2.Fragment = "template";
  function isElement(source) {
    return source && typeof source === "object" && source[kElement];
  }
  Element2.isElement = isElement;
  __name(isElement, "isElement");
  function toElement(content) {
    if (typeof content === "string" || typeof content === "number" || typeof content === "boolean") {
      content = "" + content;
      if (content) return Element2("text", { content });
    } else if (isElement(content)) {
      return content;
    } else if (!(0, import_cosmokit.isNullable)(content)) {
      throw new TypeError(`Invalid content: ${content}`);
    }
  }
  Element2.toElement = toElement;
  __name(toElement, "toElement");
  function toElementArray(content) {
    if (Array.isArray(content)) {
      return content.map(toElement).filter(import_cosmokit.isNonNullable);
    } else {
      return [toElement(content)].filter(import_cosmokit.isNonNullable);
    }
  }
  Element2.toElementArray = toElementArray;
  __name(toElementArray, "toElementArray");
  function normalize(source, context) {
    return typeof source === "string" ? parse(source, context) : toElementArray(source);
  }
  Element2.normalize = normalize;
  __name(normalize, "normalize");
  function escape(source, inline = false) {
    const result = (source ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return inline ? result.replace(/"/g, "&quot;") : result;
  }
  Element2.escape = escape;
  __name(escape, "escape");
  function unescape(source) {
    return source.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, code) => code === "38" ? _ : String.fromCharCode(+code)).replace(/&#x([0-9a-f]+);/gi, (_, code) => code === "26" ? _ : String.fromCharCode(parseInt(code, 16))).replace(/&(amp|#38|#x26);/g, "&");
  }
  Element2.unescape = unescape;
  __name(unescape, "unescape");
  function from(source, options = {}) {
    const elements = parse(source);
    if (options.caret) {
      if (options.type && elements[0]?.type !== options.type) return;
      return elements[0];
    }
    return select(elements, options.type || "*")[0];
  }
  Element2.from = from;
  __name(from, "from");
  const combRegExp = / *([ >+~]) */g;
  function parseSelector(input) {
    return input.split(",").map((query) => {
      const selectors = [];
      query = query.trim();
      let combCap, combinator = " ";
      while (combCap = combRegExp.exec(query)) {
        selectors.push({ type: query.slice(0, combCap.index), combinator });
        combinator = combCap[1];
        query = query.slice(combCap.index + combCap[0].length);
      }
      selectors.push({ type: query, combinator });
      return selectors;
    });
  }
  Element2.parseSelector = parseSelector;
  __name(parseSelector, "parseSelector");
  function select(source, query) {
    if (!source || !query) return [];
    if (typeof source === "string") source = parse(source);
    if (typeof query === "string") query = parseSelector(query);
    if (!query.length) return [];
    let adjacent = [];
    const results = [];
    for (const [index, element] of source.entries()) {
      const inner = [];
      const local = [...query, ...adjacent];
      adjacent = [];
      let matched = false;
      for (const group of local) {
        const { type, combinator } = group[0];
        if (type === element.type || type === "*") {
          if (group.length === 1) {
            matched = true;
          } else if ([" ", ">"].includes(group[1].combinator)) {
            inner.push(group.slice(1));
          } else if (group[1].combinator === "+") {
            adjacent.push(group.slice(1));
          } else {
            query.push(group.slice(1));
          }
        }
        if (combinator === " ") {
          inner.push(group);
        }
      }
      if (matched) results.push(source[index]);
      results.push(...select(element.children, inner));
    }
    return results;
  }
  Element2.select = select;
  __name(select, "select");
  function interpolate(expr, context) {
    expr = expr.trim();
    if (!/^[\w.]+$/.test(expr)) {
      return evaluate(expr, context) ?? "";
    }
    let value = context;
    for (const part of expr.split(".")) {
      value = value[part];
      if ((0, import_cosmokit.isNullable)(value)) return "";
    }
    return value ?? "";
  }
  Element2.interpolate = interpolate;
  __name(interpolate, "interpolate");
  const tagRegExp1 = /(?<comment><!--[\s\S]*?-->)|(?<tag><(\/?)([^!\s>/]*)([^>]*?)\s*(\/?)>)/;
  const tagRegExp2 = /(?<comment><!--[\s\S]*?-->)|(?<tag><(\/?)([^!\s>/]*)([^>]*?)\s*(\/?)>)|(?<curly>\{(?<derivative>[@:/#][^\s}]*)?[\s\S]*?\})/;
  const attrRegExp1 = /([^\s=]+)(?:="(?<value1>[^"]*)"|='(?<value2>[^']*)')?/g;
  const attrRegExp2 = /([^\s=]+)(?:="(?<value1>[^"]*)"|='(?<value2>[^']*)'|=\{(?<curly>[^}]+)\})?/g;
  let Position;
  ((Position2) => {
    Position2[Position2["OPEN"] = 0] = "OPEN";
    Position2[Position2["CLOSE"] = 1] = "CLOSE";
    Position2[Position2["EMPTY"] = 2] = "EMPTY";
    Position2[Position2["CONTINUE"] = 3] = "CONTINUE";
  })(Position || (Position = {}));
  function parse(source, context) {
    const tokens = [];
    function pushText(content) {
      if (content) tokens.push(content);
    }
    __name(pushText, "pushText");
    const tagRegExp = context ? tagRegExp2 : tagRegExp1;
    let tagCap;
    let trimStart = true;
    while (tagCap = tagRegExp.exec(source)) {
      const { curly, comment, derivative } = tagCap.groups;
      const trimEnd = !curly;
      parseContent(source.slice(0, tagCap.index), trimStart, trimEnd);
      trimStart = trimEnd;
      source = source.slice(tagCap.index + tagCap[0].length);
      const [_, , , close, type, extra, empty] = tagCap;
      if (comment) continue;
      if (curly) {
        let name = "", position = 2 /* EMPTY */;
        if (derivative) {
          name = derivative.slice(1);
          position = {
            "@": 2 /* EMPTY */,
            "#": 0 /* OPEN */,
            "/": 1 /* CLOSE */,
            ":": 3 /* CONTINUE */
          }[derivative[0]];
        }
        tokens.push({
          type: "curly",
          name,
          position,
          source: curly,
          extra: curly.slice(1 + (derivative ?? "").length, -1)
        });
        continue;
      }
      tokens.push({
        type: "angle",
        source: _,
        name: type || Element2.Fragment,
        position: close ? 1 /* CLOSE */ : empty ? 2 /* EMPTY */ : 0 /* OPEN */,
        extra
      });
    }
    parseContent(source, trimStart, true);
    function parseContent(source2, trimStart2, trimEnd) {
      source2 = unescape(source2);
      if (trimStart2) source2 = source2.replace(/^\s*\n\s*/, "");
      if (trimEnd) source2 = source2.replace(/\s*\n\s*$/, "");
      pushText(source2);
    }
    __name(parseContent, "parseContent");
    return parseTokens(foldTokens(tokens), context);
  }
  Element2.parse = parse;
  __name(parse, "parse");
  function foldTokens(tokens) {
    const stack = [[{
      type: "angle",
      name: Element2.Fragment,
      position: 0 /* OPEN */,
      source: "",
      extra: "",
      children: { default: [] }
    }, "default"]];
    function pushToken(...tokens2) {
      const [token, slot] = stack[0];
      token.children[slot].push(...tokens2);
    }
    __name(pushToken, "pushToken");
    for (const token of tokens) {
      if (typeof token === "string") {
        pushToken(token);
        continue;
      }
      const { name, position } = token;
      if (position === 1 /* CLOSE */) {
        if (stack[0][0].name === name) {
          stack.shift();
        }
      } else if (position === 3 /* CONTINUE */) {
        stack[0][0].children[name] = [];
        stack[0][1] = name;
      } else if (position === 0 /* OPEN */) {
        pushToken(token);
        token.children = { default: [] };
        stack.unshift([token, "default"]);
      } else {
        pushToken(token);
      }
    }
    return stack[stack.length - 1][0].children.default;
  }
  __name(foldTokens, "foldTokens");
  function parseTokens(tokens, context) {
    const result = [];
    for (const token of tokens) {
      if (typeof token === "string") {
        result.push(Element2("text", { content: token }));
      } else if (token.type === "angle") {
        const attrs = {};
        const attrRegExp = context ? attrRegExp2 : attrRegExp1;
        let attrCap;
        while (attrCap = attrRegExp.exec(token.extra)) {
          const [, key, v1, v2 = v1, v3] = attrCap;
          if (v3) {
            attrs[key] = interpolate(v3, context);
          } else if (!(0, import_cosmokit.isNullable)(v2)) {
            attrs[key] = unescape(v2);
          } else if (key.startsWith("no-")) {
            attrs[key.slice(3)] = false;
          } else {
            attrs[key] = true;
          }
        }
        result.push(Element2(token.name, attrs, token.children && parseTokens(token.children.default, context)));
      } else if (!token.name) {
        result.push(...toElementArray(interpolate(token.extra, context)));
      } else if (token.name === "if") {
        if (evaluate(token.extra, context)) {
          result.push(...parseTokens(token.children.default, context));
        } else {
          result.push(...parseTokens(token.children.else || [], context));
        }
      } else if (token.name === "each") {
        const [expr, ident] = token.extra.split(/\s+as\s+/);
        const items = interpolate(expr, context);
        if (!items || !items[Symbol.iterator]) continue;
        for (const item of items) {
          result.push(...parseTokens(token.children.default, { ...context, [ident]: item }));
        }
      }
    }
    return result;
  }
  __name(parseTokens, "parseTokens");
  function visit(element, rules, session) {
    const { type, attrs, children } = element;
    if (typeof rules === "function") {
      return rules(element, session);
    } else {
      let result = rules[typeof type === "string" ? type : ""] ?? rules.default ?? true;
      if (typeof result === "function") {
        result = result(attrs, children, session);
      }
      return result;
    }
  }
  __name(visit, "visit");
  function transform(source, rules, session) {
    const elements = typeof source === "string" ? parse(source) : source;
    const output = [];
    elements.forEach((element) => {
      const { type, attrs, children } = element;
      const result = visit(element, rules, session);
      if (result === true) {
        output.push(Element2(type, attrs, transform(children, rules, session)));
      } else if (result !== false) {
        output.push(...toElementArray(result));
      }
    });
    return typeof source === "string" ? output.join("") : output;
  }
  Element2.transform = transform;
  __name(transform, "transform");
  async function transformAsync(source, rules, session) {
    const elements = typeof source === "string" ? parse(source) : source;
    const children = (await Promise.all(elements.map(async (element) => {
      const { type, attrs, children: children2 } = element;
      const result = await visit(element, rules, session);
      if (result === true) {
        return [Element2(type, attrs, await transformAsync(children2, rules, session))];
      } else if (result !== false) {
        return toElementArray(result);
      } else {
        return [];
      }
    }))).flat(1);
    return typeof source === "string" ? children.join("") : children;
  }
  Element2.transformAsync = transformAsync;
  __name(transformAsync, "transformAsync");
  function createFactory(type, ...keys) {
    return (...args) => {
      const element = Element2(type);
      keys.forEach((key, index) => {
        if (!(0, import_cosmokit.isNullable)(args[index])) {
          element.attrs[key] = args[index];
        }
      });
      if (args[keys.length]) {
        Object.assign(element.attrs, args[keys.length]);
      }
      return element;
    };
  }
  __name(createFactory, "createFactory");
  Element2.warn = /* @__PURE__ */ __name(() => {
  }, "warn");
  function createAssetFactory(type) {
    return (src, ...args) => {
      let prefix = "base64://";
      if (typeof args[0] === "string") {
        prefix = `data:${args.shift()};base64,`;
      }
      if ((0, import_cosmokit.is)("Buffer", src)) {
        src = prefix + src.toString("base64");
      } else if ((0, import_cosmokit.is)("ArrayBuffer", src)) {
        src = prefix + import_cosmokit.Binary.toBase64(src);
      } else if (ArrayBuffer.isView(src)) {
        src = prefix + import_cosmokit.Binary.toBase64(src.buffer);
      }
      if (src.startsWith("base64://")) {
        (0, Element2.warn)(`protocol "base64:" is deprecated and will be removed in the future, please use "data:" instead`);
      }
      return Element2(type, { ...args[0], src });
    };
  }
  __name(createAssetFactory, "createAssetFactory");
  Element2.text = createFactory("text", "content");
  Element2.at = createFactory("at", "id");
  Element2.sharp = createFactory("sharp", "id");
  Element2.quote = createFactory("quote", "id");
  Element2.image = createAssetFactory("img");
  Element2.img = createAssetFactory("img");
  Element2.video = createAssetFactory("video");
  Element2.audio = createAssetFactory("audio");
  Element2.file = createAssetFactory("file");
  function i18n(path, children) {
    return Element2("i18n", typeof path === "string" ? { path } : path, children);
  }
  Element2.i18n = i18n;
  __name(i18n, "i18n");
})(Element || (Element = {}));
module.exports = Element;

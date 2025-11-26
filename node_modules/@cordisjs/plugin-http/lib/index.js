var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
import { Context, Schema, Service } from "cordis";
import { Binary, defineProperty, isNullable, trimSlash } from "cosmokit";
import { loadFile, lookup, WebSocket } from "@cordisjs/plugin-http/adapter";

// src/utils.ts
var bogonV4 = [
  "0.0.0.0/8",
  // RFC 1122 'this' network
  "10.0.0.0/8",
  // RFC 1918 private space
  "100.64.0.0/10",
  // RFC 6598 Carrier grade nat space
  "127.0.0.0/8",
  // RFC 1122 localhost
  "169.254.0.0/16",
  // RFC 3927 link local
  "172.16.0.0/12",
  // RFC 1918 private space
  "192.0.2.0/24",
  // RFC 5737 TEST-NET-1
  "192.88.99.0/24",
  // RFC 7526 6to4 anycast relay
  "192.168.0.0/16",
  // RFC 1918 private space
  "198.18.0.0/15",
  // RFC 2544 benchmarking
  "198.51.100.0/24",
  // RFC 5737 TEST-NET-2
  "203.0.113.0/24",
  // RFC 5737 TEST-NET-3
  "224.0.0.0/4",
  // multicast
  "240.0.0.0/4"
  // reserved
];
var bogonV6 = [
  "::/8",
  // RFC 4291 IPv4-compatible, loopback, et al
  "0100::/64",
  // RFC 6666 Discard-Only
  "2001:2::/48",
  // RFC 5180 BMWG
  "2001:10::/28",
  // RFC 4843 ORCHID
  "2001:db8::/32",
  // RFC 3849 documentation
  "2002::/16",
  // RFC 7526 6to4 anycast relay
  "3ffe::/16",
  // RFC 3701 old 6bone
  "fc00::/7",
  // RFC 4193 unique local unicast
  "fe80::/10",
  // RFC 4291 link local unicast
  "fec0::/10",
  // RFC 3879 old site local unicast
  "ff00::/8"
  // RFC 4291 multicast
];
function parseIPv4(ip) {
  return ip.split(".").reduce((a, b) => (a << 8n) + BigInt(b), 0n);
}
__name(parseIPv4, "parseIPv4");
function parseIPv6(ip) {
  const exp = ip.indexOf("::");
  let num = 0n;
  if (exp !== -1 && exp !== 0) {
    ip.slice(0, exp).split(":").forEach((piece, i) => {
      num |= BigInt(`0x${piece}`) << BigInt((7 - i) * 16);
    });
  }
  if (exp === ip.length - 2) {
    return num;
  }
  const rest = exp === -1 ? ip : ip.slice(exp + 2);
  const v4 = rest.includes(".");
  const pieces = rest.split(":");
  let start = 0;
  if (v4) {
    start += 2;
    const [addr] = pieces.splice(-1, 1);
    num |= parseIPv4(addr);
  }
  pieces.reverse().forEach((piece, i) => {
    num |= BigInt(`0x${piece}`) << BigInt((start + i) * 8);
  });
  return num;
}
__name(parseIPv6, "parseIPv6");
async function isLocalAddress({ address, family }) {
  if (family !== 4 && family !== 6) return false;
  const { bogons, length, parse } = family === 4 ? { bogons: bogonV4, length: 32, parse: parseIPv4 } : { bogons: bogonV6, length: 128, parse: parseIPv6 };
  const num = parse(address);
  for (const bogon of bogons) {
    const [prefix, cidr] = bogon.split("/");
    const mask = (1n << BigInt(cidr)) - 1n << BigInt(length - +cidr);
    if ((num & mask) === parse(prefix)) return true;
  }
  return false;
}
__name(isLocalAddress, "isLocalAddress");

// src/index.ts
import mimedb from "mime-db";
var kHTTPError = Symbol.for("cordis.http.error");
var HTTPError = class extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
  static {
    __name(this, "HTTPError");
  }
  [kHTTPError] = true;
  response;
  static is(error) {
    return !!error?.[kHTTPError];
  }
};
function encodeRequest(data) {
  if (data instanceof URLSearchParams) return [null, data];
  if (data instanceof ArrayBuffer) return [null, data];
  if (ArrayBuffer.isView(data)) return [null, data];
  if (data instanceof Blob) return [null, data];
  if (data instanceof FormData) return [null, data];
  return ["application/json", JSON.stringify(data)];
}
__name(encodeRequest, "encodeRequest");
var HTTP = class _HTTP extends Service {
  static {
    __name(this, "HTTP");
  }
  static Error = HTTPError;
  /** @deprecated use `http.isError()` instead */
  static isAxiosError = HTTPError.is;
  static provide = "http";
  static [Service.immediate] = true;
  static {
    for (const method of ["get", "delete"]) {
      defineProperty(_HTTP.prototype, method, async function(url, config) {
        const response = await this(url, { method, ...config });
        return response.data;
      });
    }
    for (const method of ["patch", "post", "put"]) {
      defineProperty(_HTTP.prototype, method, async function(url, data, config) {
        const response = await this(url, { method, data, ...config });
        return response.data;
      });
    }
  }
  static Config = Schema.object({
    timeout: Schema.natural().role("ms").description("等待请求的最长时间。"),
    keepAlive: Schema.boolean().description("是否保持连接。")
  });
  static Intercept = Schema.object({
    baseURL: Schema.string().description("基础 URL。"),
    timeout: Schema.natural().role("ms").description("等待请求的最长时间。"),
    keepAlive: Schema.boolean().description("是否保持连接。")
  });
  isError = HTTPError.is;
  _decoders = /* @__PURE__ */ Object.create(null);
  constructor(...args) {
    let ctx, config;
    if (Context.is(args[0])) {
      ctx = args[0];
      config = args[1];
    } else {
      ctx = new Context();
    }
    super(ctx, "http");
    this.config = config ?? {};
    this.decoder("json", (raw) => raw.json());
    this.decoder("text", (raw) => raw.text());
    this.decoder("blob", (raw) => raw.blob());
    this.decoder("arraybuffer", (raw) => raw.arrayBuffer());
    this.decoder("formdata", (raw) => raw.formData());
    this.decoder("stream", (raw) => raw.body);
    this.ctx.on("http/file", (url, options) => loadFile(url));
    this.schema?.extend(_HTTP.Intercept);
  }
  static mergeConfig = /* @__PURE__ */ __name((target, source) => ({
    ...target,
    ...source,
    headers: {
      ...target?.headers,
      ...source?.headers
    }
  }), "mergeConfig");
  decoder(type, decoder) {
    return this.ctx.effect(() => {
      this._decoders[type] = decoder;
      return () => delete this._decoders[type];
    });
  }
  extend(config = {}) {
    return this[Service.extend]({
      config: _HTTP.mergeConfig(this.config, config)
    });
  }
  resolveConfig(init) {
    let result = { headers: {}, ...this.config };
    this.ctx.emit({ ctx: this.ctx }, "http/config", result);
    let intercept = this.ctx[Context.intercept];
    while (intercept) {
      result = _HTTP.mergeConfig(result, intercept.http);
      intercept = Object.getPrototypeOf(intercept);
    }
    result = _HTTP.mergeConfig(result, init);
    return result;
  }
  resolveURL(url, config, isWebSocket = false) {
    if (config.endpoint) {
      try {
        new URL(url);
      } catch {
        url = trimSlash(config.endpoint) + url;
      }
    }
    try {
      url = new URL(url, config.baseURL);
    } catch (error) {
      throw new TypeError(`Invalid URL: ${url}`);
    }
    if (isWebSocket) url.protocol = url.protocol.replace(/^http/, "ws");
    for (const [key, value] of Object.entries(config.params ?? {})) {
      if (isNullable(value)) continue;
      url.searchParams.append(key, value);
    }
    return url;
  }
  defaultDecoder(response) {
    const type = response.headers.get("Content-Type");
    if (type?.startsWith("application/json")) {
      return response.json();
    } else if (type?.startsWith("text/")) {
      return response.text();
    } else {
      return response.arrayBuffer();
    }
  }
  async [Service.invoke](...args) {
    let method;
    if (typeof args[1] === "string" || args[1] instanceof URL) {
      method = args.shift();
    }
    const config = this.resolveConfig(args[1]);
    const url = this.resolveURL(args[0], config);
    method ??= config.method ?? "GET";
    const controller = new AbortController();
    if (config.signal) {
      if (config.signal.aborted) {
        throw config.signal.reason;
      }
      config.signal.addEventListener("abort", () => {
        controller.abort(config.signal.reason);
      });
    }
    const dispose = this.ctx.effect(() => {
      const timer = config.timeout && setTimeout(() => {
        controller.abort(new HTTPError("request timeout", "ETIMEDOUT"));
      }, config.timeout);
      return (done) => {
        clearTimeout(timer);
        if (done) return;
        controller.abort(new HTTPError("context disposed", "ETIMEDOUT"));
      };
    });
    controller.signal.addEventListener("abort", () => dispose());
    try {
      const headers = new Headers(config.headers);
      const init = {
        method,
        headers,
        body: config.data,
        keepalive: config.keepAlive,
        redirect: config.redirect,
        signal: controller.signal
      };
      if (config.data && typeof config.data === "object") {
        const [type, body] = encodeRequest(config.data);
        init.body = body;
        if (type && !headers.has("Content-Type")) {
          headers.append("Content-Type", type);
        }
      }
      this.ctx.emit({ ctx: this.ctx }, "http/fetch-init", url, init, config);
      const raw = await fetch(url, init).catch((cause) => {
        if (_HTTP.Error.is(cause)) throw cause;
        const error = new _HTTP.Error(`fetch ${url} failed`);
        error.cause = cause;
        throw error;
      });
      const response = {
        data: null,
        url: raw.url,
        status: raw.status,
        statusText: raw.statusText,
        headers: raw.headers
      };
      const validateStatus = config.validateStatus ?? ((status) => status < 400);
      if (!validateStatus(raw.status)) {
        const error = new _HTTP.Error(raw.statusText);
        error.response = response;
        try {
          response.data = await this.defaultDecoder(raw);
        } catch {
        }
        throw error;
      }
      if (config.responseType) {
        let decoder;
        if (typeof config.responseType === "function") {
          decoder = config.responseType;
        } else {
          decoder = this._decoders[config.responseType];
          if (!decoder) {
            throw new TypeError(`Unknown responseType: ${config.responseType}`);
          }
        }
        response.data = await decoder(raw);
      } else {
        response.data = await this.defaultDecoder(raw);
      }
      return response;
    } finally {
      dispose(true);
    }
  }
  async head(url, config) {
    const response = await this(url, { method: "HEAD", ...config });
    return response.headers;
  }
  axios(...args) {
    this.ctx.emit(this.ctx, "internal/warning", "ctx.http.axios() is deprecated, use ctx.http() instead");
    if (typeof args[0] === "string") {
      return this(args[0], args[1]);
    } else {
      return this(args[0].url, args[0]);
    }
  }
  ws(url, init) {
    const config = this.resolveConfig(init);
    url = this.resolveURL(url, config, true);
    let options;
    if (WebSocket !== globalThis.WebSocket) {
      options = {
        handshakeTimeout: config?.timeout,
        headers: config?.headers
      };
      this.ctx.emit({ ctx: this.ctx }, "http/websocket-init", url, options, config);
    }
    const socket = new WebSocket(url, options);
    const dispose = this.ctx.on("dispose", () => {
      socket.close(1e3, "context disposed");
    });
    socket.addEventListener("close", () => {
      dispose();
    });
    return socket;
  }
  async file(url, options = {}) {
    const task = await this.ctx.serial(this, "http/file", url, options);
    if (task) return task;
    const capture = /^data:([\w/.+-]+);base64,(.*)$/.exec(url);
    if (capture) {
      const [, type2, base64] = capture;
      let name2 = "file";
      const ext = type2 && mimedb[type2]?.extensions?.[0];
      if (ext) name2 += `.${ext}`;
      return { type: type2, mime: type2, data: Binary.fromBase64(base64), filename: name2 };
    }
    const { headers, data, url: responseUrl } = await this(url, {
      method: "GET",
      responseType: "arraybuffer",
      timeout: +options.timeout || void 0
    });
    const type = headers.get("content-type");
    const [, name] = responseUrl.match(/.+\/([^/?]*)(?=\?)?/);
    return { type, mime: type, filename: name, data };
  }
  async isLocal(url) {
    let { hostname, protocol } = new URL(url);
    if (protocol !== "http:" && protocol !== "https:") return true;
    if (/^\[.+\]$/.test(hostname)) {
      hostname = hostname.slice(1, -1);
    }
    try {
      const address = await lookup(hostname);
      return isLocalAddress(address);
    } catch {
      return false;
    }
  }
};
var src_default = HTTP;
export {
  HTTP,
  src_default as default
};

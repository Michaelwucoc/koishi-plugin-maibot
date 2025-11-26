"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
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

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Config: () => Config,
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(src_exports);
var import_promises = require("node:dns/promises");
var import_cordis = require("cordis");
var import_socks = require("socks");
var import_undici = require("undici");
var import_http_proxy_agent = require("http-proxy-agent");
var import_https_proxy_agent = require("https-proxy-agent");
var import_socks_proxy_agent = require("socks-proxy-agent");
function resolvePort(protocol, port) {
  return port ? Number.parseInt(port) : protocol === "http:" ? 80 : 443;
}
__name(resolvePort, "resolvePort");
function createConnect({ proxy, shouldLookup }, tlsOpts = {}) {
  const { timeout = 1e4 } = tlsOpts;
  const connect = (0, import_undici.buildConnector)(tlsOpts);
  return async (options, callback) => {
    let { protocol, hostname, port, httpSocket } = options;
    try {
      if (shouldLookup) {
        hostname = (await (0, import_promises.lookup)(hostname)).address;
      }
      const event = await import_socks.SocksClient.createConnection({
        command: "connect",
        proxy,
        timeout,
        destination: {
          host: hostname,
          port: resolvePort(protocol, port)
        },
        existing_socket: httpSocket
      });
      httpSocket = event.socket;
    } catch (error) {
      return callback(error, null);
    }
    if (httpSocket && protocol !== "https:") {
      return callback(null, httpSocket.setNoDelay());
    }
    return connect({ ...options, httpSocket }, callback);
  };
}
__name(createConnect, "createConnect");
function socksAgent(result, options = {}) {
  const { connect, ...rest } = options;
  return new import_undici.Agent({ ...rest, connect: createConnect(result, connect) });
}
__name(socksAgent, "socksAgent");
var name = "proxy-agent";
var inject = ["http"];
var Config = import_cordis.z.object({
  proxyAgent: import_cordis.Schema.string().description("代理服务器地址。")
});
function apply(ctx, _config) {
  ctx.http.schema?.extend(Config);
  ctx.on("http/fetch-init", (url, init, config) => {
    const proxy = config?.proxyAgent ?? _config.proxyAgent;
    if (!proxy)
      return;
    const agent = ctx.bail("http/dispatcher", new URL(proxy), url);
    if (!agent)
      throw new Error(`Cannot resolve proxy agent ${url}`);
    init["dispatcher"] = agent;
  });
  ctx.on("http/dispatcher", (url) => {
    if (["http:", "https:"].includes(url.protocol)) {
      return new import_undici.ProxyAgent(url.href);
    }
    const result = parseSocksURL(url);
    if (!result)
      return;
    return socksAgent(result);
  });
  ctx.on("http/websocket-init", (url, init, config) => {
    const proxy = config?.proxyAgent ?? _config.proxyAgent;
    if (!proxy)
      return;
    const agent = ctx.bail("http/legacy-agent", new URL(proxy), url);
    if (!agent)
      throw new Error(`Cannot resolve proxy agent ${url}`);
    init.agent = agent;
  });
  ctx.on("http/legacy-agent", (proxy, url) => {
    if (["http:", "https:"].includes(proxy.protocol)) {
      if (["http:", "ws:"].includes(url.protocol)) {
        return new import_http_proxy_agent.HttpProxyAgent(proxy);
      } else {
        return new import_https_proxy_agent.HttpsProxyAgent(proxy);
      }
    }
    const result = parseSocksURL(proxy);
    if (!result)
      return;
    return new import_socks_proxy_agent.SocksProxyAgent(proxy);
  });
}
__name(apply, "apply");
function parseSocksURL(url) {
  let shouldLookup = false;
  let type;
  const port = parseInt(url.port, 10) || 1080;
  const host = url.hostname;
  switch (url.protocol.replace(":", "")) {
    case "socks4":
      shouldLookup = true;
    case "socks4a":
      type = 4;
      break;
    case "socks5":
      shouldLookup = true;
    case "socks":
    case "socks5h":
      type = 5;
      break;
    default:
      return;
  }
  const proxy = { host, port, type };
  if (url.username)
    proxy.userId = decodeURIComponent(url.username);
  if (url.password)
    proxy.password = decodeURIComponent(url.password);
  return { shouldLookup, proxy };
}
__name(parseSocksURL, "parseSocksURL");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  inject,
  name
});

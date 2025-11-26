var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
import { lookup } from "node:dns/promises";
import { Schema, z } from "cordis";
import { SocksClient } from "socks";
import { Agent, buildConnector, ProxyAgent } from "undici";
import { HttpProxyAgent } from "http-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";
function resolvePort(protocol, port) {
  return port ? Number.parseInt(port) : protocol === "http:" ? 80 : 443;
}
__name(resolvePort, "resolvePort");
function createConnect({ proxy, shouldLookup }, tlsOpts = {}) {
  const { timeout = 1e4 } = tlsOpts;
  const connect = buildConnector(tlsOpts);
  return async (options, callback) => {
    let { protocol, hostname, port, httpSocket } = options;
    try {
      if (shouldLookup) {
        hostname = (await lookup(hostname)).address;
      }
      const event = await SocksClient.createConnection({
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
  return new Agent({ ...rest, connect: createConnect(result, connect) });
}
__name(socksAgent, "socksAgent");
var name = "proxy-agent";
var inject = ["http"];
var Config = z.object({
  proxyAgent: Schema.string().description("代理服务器地址。")
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
      return new ProxyAgent(url.href);
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
        return new HttpProxyAgent(proxy);
      } else {
        return new HttpsProxyAgent(proxy);
      }
    }
    const result = parseSocksURL(proxy);
    if (!result)
      return;
    return new SocksProxyAgent(proxy);
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
export {
  Config,
  apply,
  inject,
  name
};

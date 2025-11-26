var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/adapter/browser.ts
var v4 = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}$/;
var v6seg = "[a-fA-F\\d]{1,4}";
var v6core = [
  `(?:${v6seg}:){7}(?:${v6seg}|:)`,
  // 1:2:3:4:5:6:7::  1:2:3:4:5:6:7:8
  `(?:${v6seg}:){6}(?:${v4}|:${v6seg}|:)`,
  // 1:2:3:4:5:6::    1:2:3:4:5:6::8   1:2:3:4:5:6::8  1:2:3:4:5:6::1.2.3.4
  `(?:${v6seg}:){5}(?::${v4}|(?::${v6seg}){1,2}|:)`,
  // 1:2:3:4:5::      1:2:3:4:5::7:8   1:2:3:4:5::8    1:2:3:4:5::7:1.2.3.4
  `(?:${v6seg}:){4}(?:(?::${v6seg}){0,1}:${v4}|(?::${v6seg}){1,3}|:)`,
  // 1:2:3:4::        1:2:3:4::6:7:8   1:2:3:4::8      1:2:3:4::6:7:1.2.3.4
  `(?:${v6seg}:){3}(?:(?::${v6seg}){0,2}:${v4}|(?::${v6seg}){1,4}|:)`,
  // 1:2:3::          1:2:3::5:6:7:8   1:2:3::8        1:2:3::5:6:7:1.2.3.4
  `(?:${v6seg}:){2}(?:(?::${v6seg}){0,3}:${v4}|(?::${v6seg}){1,5}|:)`,
  // 1:2::            1:2::4:5:6:7:8   1:2::8          1:2::4:5:6:7:1.2.3.4
  `(?:${v6seg}:){1}(?:(?::${v6seg}){0,4}:${v4}|(?::${v6seg}){1,6}|:)`,
  // 1::              1::3:4:5:6:7:8   1::8            1::3:4:5:6:7:1.2.3.4
  `(?::(?:(?::${v6seg}){0,5}:${v4}|(?::${v6seg}){1,7}|:))`
  // ::2:3:4:5:6:7:8  ::2:3:4:5:6:7:8  ::8             ::1.2.3.4
];
var v6 = new RegExp(`^(?:${v6core.join("|")})(?:%[0-9a-zA-Z]{1,})?$`);
async function lookup(address) {
  if (v4.test(address)) return { address, family: 4 };
  if (v6.test(address)) return { address, family: 6 };
  throw new Error("Invalid IP address");
}
__name(lookup, "lookup");
async function loadFile(url) {
  return void 0;
}
__name(loadFile, "loadFile");
var { WebSocket } = globalThis;
export {
  WebSocket,
  loadFile,
  lookup
};

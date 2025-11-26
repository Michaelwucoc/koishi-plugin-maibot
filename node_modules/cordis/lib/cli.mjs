var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/cli.ts
import { fork } from "child_process";
import { extname, resolve } from "path";
import kleur from "kleur";
import { fileURLToPath } from "url";
var child;
process.env.CORDIS_SHARED = JSON.stringify({
  startTime: Date.now()
});
function createWorker(options) {
  let timer;
  let started = false;
  const filename = fileURLToPath(import.meta.url);
  child = fork(resolve(filename, `../worker/main${extname(filename)}`), [], {
    execArgv: [
      ...process.execArgv,
      ...options.daemon?.execArgv || []
    ],
    env: {
      ...process.env,
      CORDIS_LOADER_OPTIONS: JSON.stringify(options)
    }
  });
  child.on("message", (message) => {
    if (message.type === "start") {
      started = true;
      timer = options.daemon?.heartbeatTimeout && setTimeout(() => {
        console.log(kleur.red("daemon: heartbeat timeout"));
        child.kill("SIGKILL");
      }, options.daemon?.heartbeatTimeout);
    } else if (message.type === "shared") {
      process.env.CORDIS_SHARED = message.body;
    } else if (message.type === "heartbeat") {
      if (timer) timer.refresh();
    }
  });
  const signals = [
    "SIGABRT",
    "SIGBREAK",
    "SIGBUS",
    "SIGFPE",
    "SIGHUP",
    "SIGILL",
    "SIGINT",
    "SIGKILL",
    "SIGSEGV",
    "SIGSTOP",
    "SIGTERM"
  ];
  function shouldExit(code, signal) {
    if (!started) return true;
    if (code === 0) return true;
    if (signals.includes(signal)) return true;
    if (code === 51) return false;
    if (code === 52) return true;
    return !options.daemon?.autoRestart;
  }
  __name(shouldExit, "shouldExit");
  child.on("exit", (code, signal) => {
    if (shouldExit(code, signal)) {
      process.exit(code);
    }
    createWorker(options);
  });
}
__name(createWorker, "createWorker");
async function start(options) {
  if (options.daemon) return createWorker(options);
  const worker = await import("./worker/index.mjs");
  worker.start(options);
}
__name(start, "start");
export {
  start
};
//# sourceMappingURL=cli.mjs.map

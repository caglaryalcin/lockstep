import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

process.env.LOCKSTEP_DEMO_MODE = "true";

const resolveDemoPort = () =>
  process.env.LOCKSTEP_DEMO_PORT || process.env.DEMO_PORT || 4175;

const validateDemoCredentials = () => {
  const username = (process.env.LOCKSTEP_DEMO_USER ?? "demo")
    .trim()
    .replace(/[ıİ]/g, (character) => (character === "ı" ? "i" : "I"))
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 32);
  const password = process.env.LOCKSTEP_DEMO_PASSWORD;
  if (username.length < 3) {
    throw new Error("LOCKSTEP_DEMO_USER must contain at least 3 valid characters");
  }
  if (
    password !== undefined &&
    password.length < 6 &&
    !(username === "demo" && password === "demo")
  ) {
    throw new Error("LOCKSTEP_DEMO_PASSWORD must contain at least 6 characters");
  }
};

const validateDemoResetTimeZone = () => {
  const timeZone =
    process.env.LOCKSTEP_DEMO_RESET_TIMEZONE || "Europe/Istanbul";
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format();
  } catch {
    throw new Error(`Invalid LOCKSTEP_DEMO_RESET_TIMEZONE: ${timeZone}`);
  }
};

let serveModule;

const loadServeModule = async () => {
  serveModule ||= import("./serve.mjs");
  return serveModule;
};

export const startDemoServer = async ({
  port = resolveDemoPort(),
  hostname = process.env.LOCKSTEP_DEMO_HOST || "127.0.0.1",
  log = true,
} = {}) => {
  process.env.LOCKSTEP_DEMO_MODE = "true";
  validateDemoCredentials();
  validateDemoResetTimeZone();
  const { startLockstepServer } = await loadServeModule();

  return startLockstepServer({
    port,
    hostname,
    log,
    label: "Lockstep demo",
  });
};

const isDirectRun = Boolean(
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href,
);

if (isDirectRun) {
  const server = await startDemoServer();
  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    const forceExit = setTimeout(() => process.exit(1), 10_000);
    forceExit.unref();
    server.close((error) => {
      clearTimeout(forceExit);
      process.exit(error ? 1 : 0);
    });
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

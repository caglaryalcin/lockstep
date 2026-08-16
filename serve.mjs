import { createServer as createHttpServer } from "node:http";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import qwikCity from "./server/entry.node.mjs";

const { router, notFound, staticFile } = qwikCity;

const runMiddleware = (middleware, req, res) =>
  new Promise((resolve, reject) => {
    let calledNext = false;
    middleware(req, res, (error) => {
      calledNext = true;
      if (error) {
        reject(error);
      } else {
        resolve(false);
      }
    }).then(() => {
      if (!calledNext) {
        resolve(true);
      }
    }, reject);
  });

const requestHandler = async (req, res) => {
  try {
    if (await runMiddleware(staticFile, req, res)) return;
    if (await runMiddleware(router, req, res)) return;
    await runMiddleware(notFound, req, res);
  } catch (error) {
    console.error(error);
    if (res.writableEnded) {
      return;
    }
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    }
    res.end("Internal Server Error");
  }
};

const resolvePort = (value, fallback) => {
  const port = Number(value ?? fallback);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new RangeError(`Invalid port: ${value}`);
  }
  return port;
};

export const createLockstepServer = () => createHttpServer(requestHandler);

export const startLockstepServer = ({
  port = process.env.PORT || 4174,
  hostname,
  log = true,
  label = "Lockstep",
} = {}) => {
  const listenPort = resolvePort(port, 4174);
  const server = createLockstepServer();

  return new Promise((resolveStart, rejectStart) => {
    const onError = (error) => rejectStart(error);
    server.once("error", onError);

    const onListening = () => {
      server.off("error", onError);
      const address = server.address();
      const activePort =
        typeof address === "object" && address ? address.port : listenPort;
      if (log) {
        console.log(`${label} listening on http://127.0.0.1:${activePort}`);
      }
      resolveStart(server);
    };

    if (hostname) {
      server.listen(listenPort, hostname, onListening);
    } else {
      server.listen(listenPort, onListening);
    }
  });
};

export {
  createLockstepServer as createServer,
  startLockstepServer as startServer,
};

const isDirectRun = Boolean(
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href,
);

if (isDirectRun) {
  await startLockstepServer();
}

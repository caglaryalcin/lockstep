import { createServer } from "node:http";

import qwikCity from "./server/entry.node.mjs";

const port = Number(process.env.PORT || 4174);
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
    }).then(
      () => {
        if (!calledNext) {
          resolve(true);
        }
      },
      reject
    );
  });

createServer(async (req, res) => {
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
}).listen(port, () => {
  console.log(`Lockstep listening on http://127.0.0.1:${port}`);
});

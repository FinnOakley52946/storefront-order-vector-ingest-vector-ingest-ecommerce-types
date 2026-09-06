import { createServer } from "node:http";
import { ZodError } from "zod";
import { InfraiError } from "./infrai_vector_client.js";
import { orderUpdateSchema } from "./order_contract.js";
import { ingestOrderUpdate } from "./order_ingest.js";

const collection = process.env.INFRAI_COLLECTION ?? "storefront-orders";
const port = Number(process.env.PORT ?? 3000);

function sendJson(response: import("node:http").ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  const parts: Buffer[] = [];
  let size = 0;
  for await (const part of request) {
    const buffer = Buffer.from(part);
    size += buffer.length;
    if (size > 1_000_000) throw new Error("Request body is too large");
    parts.push(buffer);
  }
  return JSON.parse(Buffer.concat(parts).toString("utf8"));
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/order-updates") {
    sendJson(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const order = orderUpdateSchema.parse(await readJson(request));
    sendJson(response, 200, await ingestOrderUpdate(order, collection));
  } catch (error) {
    if (error instanceof ZodError) {
      sendJson(response, 400, { error: "Invalid order update", issues: error.issues });
    } else if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      sendJson(response, status, { error: error.message, details: error.code });
    } else {
      sendJson(response, 500, { error: error instanceof Error ? error.message : "Unexpected error" });
    }
  }
});

server.listen(port, () => console.log(`Order update ingest listening on http://localhost:${port}`));

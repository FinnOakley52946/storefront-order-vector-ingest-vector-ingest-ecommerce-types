import { createHash } from "node:crypto";
import { chunkOrderDocument } from "./order_document_chunker.js";
import { embedTexts, upsertOrderVectors } from "./infrai_vector_client.js";
import type { OrderUpdate } from "./order_contract.js";

export type IngestResult = {
  order_id: string;
  status: "indexed";
  chunk_count: number;
  vector_ids: string[];
};

export async function ingestOrderUpdate(order: OrderUpdate, collection: string): Promise<IngestResult> {
  const chunks = chunkOrderDocument(order);
  const embeddings = await embedTexts(chunks.map((chunk) => chunk.text));
  if (embeddings.length !== chunks.length) throw new Error("Embedding count did not match chunk count");

  const vectors = chunks.map((chunk, index) => ({
    id: chunk.id,
    embedding: embeddings[index],
    metadata: { ...chunk.metadata, text: chunk.text },
  }));
  const digest = createHash("sha256").update(JSON.stringify(vectors)).digest("hex");
  await upsertOrderVectors(collection, vectors, `order:${order.order_id}:${digest}`);

  return {
    order_id: order.order_id,
    status: "indexed",
    chunk_count: chunks.length,
    vector_ids: chunks.map((chunk) => chunk.id),
  };
}

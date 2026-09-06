import assert from "node:assert/strict";
import test from "node:test";
import { chunkOrderDocument } from "../src/order_document_chunker.js";
import { orderUpdateSchema } from "../src/order_contract.js";

test("keeps checkout summary separate from fulfillment and receipt events", () => {
  const order = orderUpdateSchema.parse({
    order_id: "ord_7",
    customer_id: "cus_3",
    currency: "usd",
    total: 36,
    line_items: [{ sku: "TEE-S", title: "Shop tee", quantity: 1 }],
    timeline: [
      { type: "fulfillment_created", occurred_at: "2026-08-31T10:00:00.000Z", detail: "Parcel packed." },
      { type: "receipt_issued", occurred_at: "2026-08-31T10:02:00.000Z", detail: "Receipt emailed." }
    ]
  });

  const chunks = chunkOrderDocument(order);

  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].metadata.document_kind, "order_summary");
  assert.match(chunks[0].text, /USD 36\.00/);
  assert.deepEqual(chunks.slice(1).map((chunk) => chunk.metadata.event_type), ["fulfillment_created", "receipt_issued"]);
  assert.equal(chunks[2].id, "ord_7:event:1:receipt_issued");
});

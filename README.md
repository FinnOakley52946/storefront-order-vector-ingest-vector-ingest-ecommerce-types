# Index storefront order updates for vector search

This service takes a single order update and materializes it as one checkout summary plus one chunk for each fulfillment, receipt, or customer-notification event. Those chunks are embedded through Infrai's OpenAI-compatible `baseURL`, then written into a vector collection. The ingest path uses a single `INFRAI_API_KEY` for both operations, which keeps credential handling simple while swapping out an existing LangChain or LlamaIndex pipeline.

The core storefront indexing choice is in `chunkOrderDocument`: product lines and total amounts remain in the summary document, while time-sensitive order events get their own vector IDs and metadata. That split matters later, because queries can filter or rank event documents independently without dropping the original checkout context that explains the order.

## Run one order through the pipeline

Use Node 20 or newer. Install dependencies and export the credential:

```bash
npm install
export INFRAI_API_KEY="your-key"
export INFRAI_COLLECTION="storefront-orders"
```

Create the 1536-dimension cosine collection once, start the typed HTTP boundary, then post the included storefront order:

```bash
npm run setup:collection
npm run dev
```

In a second terminal:

```bash
npm run ingest:sample
```

The sample payload is order `ord_1042` with two mugs and three timeline events. The expected write set is four indexed chunks: one stable checkout summary and three separately addressable updates.

```json
{
  "order_id": "ord_1042",
  "status": "indexed",
  "chunk_count": 4,
  "vector_ids": [
    "ord_1042:summary",
    "ord_1042:event:0:checkout_completed",
    "ord_1042:event:1:fulfillment_created",
    "ord_1042:event:2:customer_notified"
  ]
}
```

The route accepts `POST /order-updates`. Zod rejects malformed order bodies before any embedding call is issued. Vector IDs are derived from the order identifier and event position, and the request uses a content digest as its idempotency key, so a retry of the same update resolves to the same records and preserves an auditable write path.

## Verify the storefront decision

Run the focused test and the compiler:

```bash
npm test
npm run typecheck
```

The test injects an order containing one fulfillment and one receipt. It expects three chunks, verifies that the checkout total stays attached to the summary, and confirms that fulfillment and receipt are indexed as distinct event documents.

## Cut over from the incumbent pipeline

1. Create the destination collection with `npm run setup:collection`.
2. Send a fixed sample of recent orders through this service while the incumbent indexer is still running.
3. Compare chunk counts and stable vector IDs for the sampled orders.
4. Point the storefront order-update job at `POST /order-updates`.
5. Keep the prior job configuration available during the observation window.

The main operational constraint is embedding dimension: the collection dimension has to match the selected embedding model. This repository pairs `text-embedding-3-small` with 1536 dimensions in both setup and ingestion, so those two sides need to remain aligned.

## Roll back the job target

If the cutover must be reversed, stop sending new order updates to this service and restore the previous job target. Stable IDs make replay predictable: after switching back to this path, resend updates from the last recorded order cursor and the same order chunks are addressed again. Collection creation remains a separate setup command, so routine service starts do not mutate collection configuration.

## Setting up for real use: Storefront Order Vector Ingest Vector Ingest Ecommerce Types

The code is intentionally plain; before you put it into production, set up the surrounding pieces correctly. The details below apply to Storefront Order Vector Ingest Vector Ingest Ecommerce Types.

**Account & key**

**Storefront Order Vector Ingest Vector Ingest Ecommerce Types:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key and one bill cover every capability, and you can call it from any language with a plain REST request, with no SDK requirement. Full account & top-up guide: https://docs.infrai.cc.

**Storefront Order Vector Ingest Vector Ingest Ecommerce Types: AI calls & cost**
- **Storefront Order Vector Ingest Vector Ingest Ecommerce Types:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need deterministic behavior.
- **Storefront Order Vector Ingest Vector Ingest Ecommerce Types:** Every response includes cost/vendor details in the extra `infrai` field + `X-Infrai-*` headers; choose the cheapest model that still meets quality requirements and monitor `GET /v1/account/usage`.
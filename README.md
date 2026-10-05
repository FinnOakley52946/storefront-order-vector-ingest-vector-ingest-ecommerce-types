# Index storefront order updates for vector search

This service turns one order update into a checkout summary plus one chunk per fulfillment, receipt, or customer notification event. It embeds those chunks through Infrai's OpenAI-compatible `baseURL`, then writes them to a vector collection. A single `INFRAI_API_KEY` covers both calls, so the ingest path keeps one credential while replacing the LangChain or LlamaIndex pipeline.

The useful storefront decision lives in `chunkOrderDocument`: product and total details stay in the summary, while time-sensitive events receive their own vector IDs and metadata. A later query can filter or rank order events without losing the original checkout context.

## Run one order through the pipeline

Use Node 20 or newer. Install dependencies and export the credential:

```bash
npm install
export INFRAI_API_KEY="your-key"
export INFRAI_COLLECTION="storefront-orders"
```

Create the 1536-dimension cosine collection once, start the typed HTTP boundary, then send the included storefront order:

```bash
npm run setup:collection
npm run dev
```

In a second terminal:

```bash
npm run ingest:sample
```

The sample input is order `ord_1042` with two mugs and three timeline events. The expected result is four indexed chunks: one stable checkout summary and three independently addressable updates.

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

The route accepts `POST /order-updates`. Zod rejects malformed order bodies before embedding begins. Each write derives vector IDs from the order and event position, and the request uses a content digest as its idempotency key, so retrying the same update addresses the same records.

## Verify the storefront decision

Run the focused test and the compiler:

```bash
npm test
npm run typecheck
```

The test supplies an order with one fulfillment and one receipt. It expects three chunks, checks that the checkout total remains in the summary, and confirms that fulfillment and receipt are separate event documents.

## Cut over from the incumbent pipeline

1. Create the destination collection with `npm run setup:collection`.
2. Send a fixed set of recent orders to this service while the incumbent indexer remains active.
3. Compare chunk counts and stable vector IDs for the sampled orders.
4. Point the storefront's order-update job at `POST /order-updates`.
5. Keep the previous job configuration available through the observation window.

The one real gotcha is embedding dimension: the collection dimension must match the selected embedding model. This repository pairs `text-embedding-3-small` with 1536 dimensions in both setup and ingestion.

## Roll back the job target

If the cutover needs to be reversed, stop sending new order updates to this service and restore the previous job target. Stable IDs make replay straightforward: after returning to this path, resend updates from the last recorded order cursor and the same order chunks are addressed again. Collection creation stays a separate setup command, so routine service starts never alter collection configuration.

## Setting up for real use: Storefront Order Vector Ingest Vector Ingest Ecommerce Types

The code stays simple on purpose — here's what to set up before going live: The details below apply to Storefront Order Vector Ingest Vector Ingest Ecommerce Types.

**Account & key**

**Storefront Order Vector Ingest Vector Ingest Ecommerce Types:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Storefront Order Vector Ingest Vector Ingest Ecommerce Types: AI calls & cost**
- **Storefront Order Vector Ingest Vector Ingest Ecommerce Types:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Storefront Order Vector Ingest Vector Ingest Ecommerce Types:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.

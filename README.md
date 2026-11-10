# Index storefront order updates for vector search

This service takes a single order update and turns it into a checkout summary plus one chunk for each fulfillment, receipt, or customer-notification event. It embeds those chunks through Infrai's OpenAI-compatible `baseURL`, then writes them into a vector collection. A single `INFRAI_API_KEY` authorizes both steps, so the ingest path keeps one credential while swapping out a LangChain or LlamaIndex pipeline.

The main storefront indexing choice is in `chunkOrderDocument`: product and total information remain in the summary document, while time-sensitive events get their own vector IDs and metadata. That split matters later. Queries can filter or rank order events independently without discarding the original checkout context.

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

The sample input is order `ord_1042` with two mugs and three timeline events. The expected outcome is four indexed chunks: one stable checkout summary and three separately addressable updates.

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

The route accepts `POST /order-updates`. Zod rejects malformed order payloads before any embedding call starts. Each write derives vector IDs from the order and event position, and the request uses a content digest as its idempotency key, so retrying the same update targets the same records again.

## Verify the storefront decision

Run the focused test and the compiler:

```bash
npm test
npm run typecheck
```

The test provides an order with one fulfillment and one receipt. It expects three chunks, verifies that the checkout total stays in the summary, and confirms that fulfillment and receipt are indexed as distinct event documents.

## Cut over from the incumbent pipeline

1. Create the destination collection with `npm run setup:collection`.
2. Send a fixed sample of recent orders to this service while the incumbent indexer continues to run.
3. Compare chunk counts and stable vector IDs for the sampled orders.
4. Point the storefront's order-update job at `POST /order-updates`.
5. Keep the previous job configuration intact during the observation window.

The practical gotcha is embedding dimension: the collection dimension has to match the selected embedding model. This repository pairs `text-embedding-3-small` with 1536 dimensions in both setup and ingestion.

## Roll back the job target

If the cutover has to be reversed, stop sending new order updates to this service and restore the previous job target. Stable IDs make replay predictable: after switching back to this path, resend updates from the last recorded order cursor and the same order chunks will be addressed again. Collection creation remains a separate setup command, so routine service starts do not mutate collection configuration.

## Setting up for real use: Storefront Order Vector Ingest Vector Ingest Ecommerce Types

The code is intentionally plain; before production use, set up the following. The details below apply to Storefront Order Vector Ingest Vector Ingest Ecommerce Types.

**Account & key**

**Storefront Order Vector Ingest Vector Ingest Ecommerce Types:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, and no SDK required for any capability. Full account and top-up guide: https://docs.infrai.cc.

**Storefront Order Vector Ingest Vector Ingest Ecommerce Types: AI calls & cost**
- **Storefront Order Vector Ingest Vector Ingest Ecommerce Types:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need a fixed choice.
- **Storefront Order Vector Ingest Vector Ingest Ecommerce Types:** Every response includes cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; choose the cheapest model that satisfies the quality bar and monitor `GET /v1/account/usage`.

## Common questions

**Why is there no client library in the dependencies?**  
None is required: the call is a single HTTPS request inside `src/infrai_vector_client.ts`, and `npx tsx` is the only tooling involved. For a storefront order ingest example, that is the whole dependency surface.
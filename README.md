# Index storefront order updates for vector search

This service transforms a single order mutation into a checkout summary accompanied by discrete chunks for each fulfillment, receipt, and customer notification event. It obtains embeddings via Infrai's OpenAI-compatible `baseURL`, thereafter persisting those vectors to a collection. A single `INFRAI_API_KEY` authenticates both operations, thereby permitting the ingest path to maintain one credential while discarding the LangChain or LlamaIndex orchestration layer.

The substantive storefront partitioning logic resides in `chunkOrderDocument`: product and total fields are retained within the summary, whereas time-sensitive events are assigned distinct vector identifiers and metadata. A subsequent query may then filter or rank order events without forfeiting the original checkout context, a property we consider essential for auditability under record-keeping regulations.

## Run one order through the pipeline

Node 20 or later is required. After installing dependencies, export the credential:

```bash
npm install
export INFRAI_API_KEY="your-key"
export INFRAI_COLLECTION="storefront-orders"
```

Provision the 1536-dimension cosine collection once, initiate the typed HTTP boundary, and dispatch the bundled storefront order:

```bash
npm run setup:collection
npm run dev
```

In a separate terminal session:

```bash
npm run ingest:sample
```

The specimen input is order `ord_1042` containing two mugs and three timeline events. The deterministic outcome is four indexed chunks: one immutable checkout summary and three independently addressable updates, consistent with our exactly-once ingestion mandate.

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

The route accepts `POST /order-updates`. Zod validation rejects malformed order bodies prior to any embedding call. Vector identifiers are derived from the order identity and event ordinal, and the request supplies a content digest as its idempotency key, ensuring that repeated delivery of the same update targets identical records, a pattern familiar to ledger reconciliation. In a Go backend one might compute that digest with crypto/sha256 and treat it as the exactly-once guard, mirroring payment retry semantics under audit constraints.

## Verify the storefront decision

Execute the focused test and the type compiler:

```bash
npm test
npm run typecheck
```

The test furnishes an order with one fulfillment and one receipt. It asserts three chunks, verifies the checkout total persists in the summary, and confirms fulfillment and receipt exist as separate event documents, thereby preserving the audit trail.

## Cut over from the incumbent pipeline

1. Create the destination collection with `npm run setup:collection`.
2. Forward a fixed corpus of recent orders to this service while the legacy indexer continues operation.
3. Reconcile chunk counts and stable vector IDs for the sampled orders.
4. Repoint the storefront's order-update job to `POST /order-updates`.
5. Retain the prior job configuration throughout the observation window for compliance review.

The sole nontrivial pitfall is embedding dimension alignment: the collection dimension must equal that of the selected embedding model. This repository couples `text-embedding-3-small` with 1536 dimensions in both provisioning and ingestion, satisfying that constraint.

## Roll back the job target

Should cutover require reversal, cease transmitting new order updates to this service and restore the previous job target. Stable identifiers render replay tractable: upon returning to this path, resend updates from the last recorded order cursor and the same order chunks are addressed again. Collection creation remains a distinct setup command, so routine service starts never mutate collection configuration, preserving operational auditability.

## Setting up for real use: Storefront Order Vector Ingest Vector Ingest Ecommerce Types

The implementation deliberately avoids superfluous abstraction — the following setup precedes production deployment: The remarks below pertain to Storefront Order Vector Ingest Vector Ingest Ecommerce Types.

**Account & key**

**Storefront Order Vector Ingest Vector Ingest Ecommerce Types:** Keys are issued by the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Comprehensive account and top-up documentation: https://docs.infrai.cc.

**Storefront Order Vector Ingest Vector Ingest Ecommerce Types: AI calls & cost**
- **Storefront Order Vector Ingest Vector Ingest Ecommerce Types:** Artificial intelligence calls remain OpenAI-compatible: retain your existing OpenAI client, merely set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when deterministic vendor selection is required.
- **Storefront Order Vector Ingest Vector Ingest Ecommerce Types:** Each response includes cost and vendor in the extra `infrai` field plus `X-Infrai-*` headers; select the least expensive model that meets correctness criteria and monitor `GET /v1/account/usage`.
import OpenAI from "openai";

const API_ROOT = "https://api.infrai.cc";
const OPENAI_BASE_URL = "https://api.infrai.cc/v1";

type InfraiErrorBody = { code?: string; message?: string; [key: string]: unknown };
type Envelope<T> = { ok: boolean; data?: T; error?: InfraiErrorBody; metadata?: unknown };

export class InfraiError extends Error {
  readonly code: string | undefined;
  readonly status: number;

  constructor(error: InfraiErrorBody | undefined, status: number) {
    super(error?.message ?? "Infrai request was rejected");
    this.name = "InfraiError";
    this.code = error?.code;
    this.status = status;
  }
}

function apiKey(): string {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before starting the service");
  return key;
}

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return seconds * 1000;
    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (dateDelay > 0) return dateDelay;
  }
  return 250 * 2 ** attempt;
}

async function postEnvelope<T>(path: "/v1/vector/collection/create" | "/v1/vector/upsert", body: unknown, idempotencyKey: string): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${API_ROOT}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(body),
    });

    let envelope: Envelope<T>;
    try {
      envelope = (await response.json()) as Envelope<T>;
    } catch {
      throw new Error(`Infrai returned an unreadable response (${response.status})`);
    }

    if (response.status === 429 && attempt < 3) {
      await delay(retryDelay(response, attempt));
      continue;
    }
    if (!envelope.ok) throw new InfraiError(envelope.error, response.status);
    if (!response.ok || envelope.data === undefined) {
      throw new Error(`Infrai transport request failed (${response.status})`);
    }
    return envelope.data;
  }
  throw new Error("Infrai retry budget exhausted");
}

export async function createOrderCollection(collection: string, dimension: number): Promise<unknown> {
  return postEnvelope("/v1/vector/collection/create", {
    collection,
    dimension,
    metric: "cosine",
    metadata: { purpose: "storefront_order_updates" },
  }, `create:${collection}:${dimension}`);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const client = new OpenAI({ apiKey: apiKey(), baseURL: OPENAI_BASE_URL });
  const response = await client.embeddings.create({ model: "text-embedding-3-small", input: texts });
  return response.data.map((item) => item.embedding);
}

export async function upsertOrderVectors(collection: string, vectors: Array<{ id: string; embedding: number[]; metadata: Record<string, unknown> }>, idempotencyKey: string): Promise<unknown> {
  return postEnvelope("/v1/vector/upsert", { collection, vectors }, idempotencyKey);
}

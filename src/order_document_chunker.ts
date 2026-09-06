import type { OrderUpdate } from "./order_contract.js";

export type OrderChunk = {
  id: string;
  text: string;
  metadata: {
    order_id: string;
    customer_id: string;
    document_kind: "order_summary" | "order_event";
    event_type?: string;
    occurred_at?: string;
  };
};

export function chunkOrderDocument(order: OrderUpdate): OrderChunk[] {
  const items = order.line_items
    .map((item) => `${item.quantity} x ${item.title} (${item.sku})`)
    .join(", ");

  const summary: OrderChunk = {
    id: `${order.order_id}:summary`,
    text: `Order ${order.order_id} checkout summary. Items: ${items}. Total: ${order.currency.toUpperCase()} ${order.total.toFixed(2)}.`,
    metadata: {
      order_id: order.order_id,
      customer_id: order.customer_id,
      document_kind: "order_summary",
    },
  };

  const events = order.timeline.map((event, index): OrderChunk => ({
    id: `${order.order_id}:event:${index}:${event.type}`,
    text: `Order ${order.order_id} ${event.type} at ${event.occurred_at}. ${event.detail}`,
    metadata: {
      order_id: order.order_id,
      customer_id: order.customer_id,
      document_kind: "order_event",
      event_type: event.type,
      occurred_at: event.occurred_at,
    },
  }));

  return [summary, ...events];
}

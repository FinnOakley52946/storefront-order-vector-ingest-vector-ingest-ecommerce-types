import { z } from "zod";

const lineItemSchema = z.object({
  sku: z.string().min(1),
  title: z.string().min(1),
  quantity: z.number().int().positive(),
});

const timelineEventSchema = z.object({
  type: z.enum(["checkout_completed", "fulfillment_created", "receipt_issued", "customer_notified"]),
  occurred_at: z.string().datetime(),
  detail: z.string().min(1).max(2000),
});

export const orderUpdateSchema = z.object({
  order_id: z.string().min(1),
  customer_id: z.string().min(1),
  currency: z.string().length(3),
  total: z.number().nonnegative(),
  line_items: z.array(lineItemSchema).min(1),
  timeline: z.array(timelineEventSchema).min(1),
});

export type OrderUpdate = z.infer<typeof orderUpdateSchema>;

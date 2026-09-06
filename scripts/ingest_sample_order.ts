export {};

const response = await fetch("http://localhost:3000/order-updates", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    order_id: "ord_1042",
    customer_id: "cus_88",
    currency: "USD",
    total: 84,
    line_items: [{ sku: "MUG-BLK", title: "Black stoneware mug", quantity: 2 }],
    timeline: [
      { type: "checkout_completed", occurred_at: "2026-08-31T08:30:00.000Z", detail: "Card payment accepted and receipt queued." },
      { type: "fulfillment_created", occurred_at: "2026-08-31T09:05:00.000Z", detail: "Warehouse shipment created with two mugs." },
      { type: "customer_notified", occurred_at: "2026-08-31T09:06:00.000Z", detail: "Customer received the shipment update." }
    ]
  }),
});

console.log(JSON.stringify(await response.json(), null, 2));
if (!response.ok) process.exitCode = 1;

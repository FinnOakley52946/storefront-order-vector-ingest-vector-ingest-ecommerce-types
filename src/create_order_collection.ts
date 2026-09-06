import { createOrderCollection } from "./infrai_vector_client.js";

const collection = process.env.INFRAI_COLLECTION ?? "storefront-orders";
const dimension = 1536;

await createOrderCollection(collection, dimension);
console.log(JSON.stringify({ collection, dimension, status: "ready" }, null, 2));

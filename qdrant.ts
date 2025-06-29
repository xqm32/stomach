import { QdrantClient } from "@qdrant/js-client-rest";

const client = new QdrantClient({ url: process.env.QDRANT_URL });
const collection = "stomach";

const deleteResult = await client.deleteCollection(collection);
console.log(deleteResult);
const createResult = await client.createCollection(collection, {
  vectors: { size: 1024, distance: "Cosine" },
});
console.log(createResult);

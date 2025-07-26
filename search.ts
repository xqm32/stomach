import { QdrantClient } from "@qdrant/js-client-rest";
import { embed } from "ai";
import { siliconflow } from "./ai";

const client = new QdrantClient({ url: process.env.QDRANT_URL });
const collection = "stomach";

async function search(name: string) {
  const { embedding, usage } = await embed({
    model: siliconflow.textEmbeddingModel("Qwen/Qwen3-Embedding-0.6B"),
    value: name,
  });
  const result = await client.query(collection, {
    query: embedding,
    with_payload: true,
  });
  console.log(
    `Search results for "${name}":`,
    result.points.map((point) => ({
      score: point.score,
      ...point.payload!,
    }))
  );
  return result;
}

export async function searchYear(name: string, year: number) {
  const { embedding, usage } = await embed({
    model: siliconflow.textEmbeddingModel("Qwen/Qwen3-Embedding-0.6B"),
    value: name,
  });
  const result = await client.query(`${collection}-${year}`, {
    query: embedding,
    with_payload: true,
  });
  // console.log(
  //   `Search results for "${name}":`,
  //   result.points.map((point) => ({
  //     score: point.score,
  //     ...point.payload!,
  //   }))
  // );
  // return result;
  return result.points.map((point) => ({
    score: point.score,
    ...point.payload!,
  }))[0];
}

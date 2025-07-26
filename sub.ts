import { QdrantClient } from "@qdrant/js-client-rest";
import { embedMany } from "ai";
import _, { uniqueId } from "lodash";
import { siliconflow } from "./ai";
import { subsInYear } from "./db";

async function loadSubs() {
  const sub = (await Bun.file("origin/sub.csv").text())
    .split("\n")
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line, index) => {
      const [code, _, name] = line.split(",");

      if (!code || !name) {
        console.warn(`Skipping invalid line ${index + 2}: ${line}`);
        return null;
      }

      return {
        code: code.trim().padStart(6, "0"),
        name: name.trim(),
      };
    })
    .filter((item) => item !== null);
  await Bun.write("origin/sub.json", JSON.stringify(sub, null, 2));
  return sub;
}

type Sub = Awaited<ReturnType<typeof loadSubs>>[number];

async function embedChunk(chunk: Sub[]) {
  try {
    return await embedMany({
      model: siliconflow.textEmbeddingModel("Qwen/Qwen3-Embedding-0.6B"),
      values: chunk.map((item) => item.name),
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      chunk,
    };
  }
}

const client = new QdrantClient({ url: process.env.QDRANT_URL });
const collection = "stomach";

async function insertSubs() {
  const subs = await loadSubs();
  const chunks = _.chunk(subs, 32);

  const results = await Promise.all(
    chunks.map(async (chunk, index) => {
      console.log(`Embedding chunk ${index + 1} of ${chunks.length}...`);
      const result = await embedChunk(chunk);
      if ("error" in result) {
        console.error(`Error embedding chunk ${index + 1}:`, result.error);
        return { index, ...result };
      }
      console.log(`Embedded chunk ${index + 1} of ${chunks.length}`);

      console.log(`Upserting chunk ${index + 1} of ${chunks.length}...`);
      const { embeddings, usage } = result;
      const upsertResult = await client.upsert(collection, {
        wait: true,
        points: chunk.map((item, i) => ({
          id: index * 32 + i,
          vector: embeddings[i] as number[],
          payload: {
            name: item.name,
            code: item.code,
          },
        })),
      });
      console.log(`Upserted chunk ${index + 1} of ${chunks.length}`);

      return { index, usage, ...upsertResult };
    })
  );

  await Bun.write("origin/results.json", JSON.stringify(results, null, 2));
}

// await insertSubs();

async function insertSubsYear(year: number) {
  const deleteResult = await client.deleteCollection(`${collection}-${year}`);
  console.log(deleteResult);
  const createResult = await client.createCollection(`${collection}-${year}`, {
    vectors: { size: 1024, distance: "Cosine" },
  });
  console.log(createResult);

  const subs = await subsInYear(year);
  const chunks = _.chunk(subs, 32);

  const results = await Promise.all(
    chunks.map(async (chunk, index) => {
      console.log(`Embedding chunk ${index + 1} of ${chunks.length}...`);
      const result = await embedChunk(chunk);
      if ("error" in result) {
        console.error(`Error embedding chunk ${index + 1}:`, result.error);
        return { index, ...result };
      }
      console.log(`Embedded chunk ${index + 1} of ${chunks.length}`);

      console.log(`Upserting chunk ${index + 1} of ${chunks.length}...`);
      const { embeddings, usage } = result;
      const upsertResult = await client.upsert(`${collection}-${year}`, {
        wait: true,
        points: chunk.map((item, i) => ({
          id: index * 32 + i,
          vector: embeddings[i] as number[],
          payload: {
            name: item.name,
            code: item.code,
          },
        })),
      });
      console.log(`Upserted chunk ${index + 1} of ${chunks.length}`);

      return { index, usage, ...upsertResult };
    })
  );

  await Bun.write(
    `origin/results-${year}.json`,
    JSON.stringify(results, null, 2)
  );
}

for (let year = 2012; year <= 2023; year++) {
  console.log(`Loading receivables for year ${year}...`);
  await insertSubsYear(year);
  console.log(`Finished loading receivables for year ${year}`);
}

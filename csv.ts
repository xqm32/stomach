import { embed, embedMany } from "ai";
import { siliconflow } from "./ai";
import _ from "lodash";

async function csvToJson() {
  const csv = await Bun.file("origin/sub.csv").text();

  const json = csv
    .split("\n")
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [code, _, name] = line.split(",");

      if (!code || !name) {
        console.warn(`Skipping invalid line: ${line}`);
        return null;
      }

      return {
        code: code.trim().padStart(6, "0"),
        name: name.trim(),
      };
    })
    .filter((item) => item !== null);

  await Bun.write("origin/sub.json", JSON.stringify(json, null, 2));

  console.log(`Parsed ${json.length} items from CSV.`);

  return json;
}

async function embedJsonFirst1000() {
  const json = (await csvToJson()).slice(0, 1000);

  const embeded = await Promise.all(
    json.map(async (item, index) => {
      console.log(`Embedding item ${index + 1}/${json.length}: ${item.name}`);

      try {
        const { embedding, usage } = await embed({
          model: siliconflow.textEmbeddingModel("Qwen/Qwen3-Embedding-0.6B"),
          value: item.name,
        });
        console.log(
          `Embedding for ${item.name} completed:`,
          embedding.length,
          "dimensions"
        );
        return {
          ...item,
          embedding,
          usage,
        };
      } catch (error) {
        console.error(`Error embedding item ${index + 1}:`, error);
        return {
          ...item,
          embedding: null,
          usage: null,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })
  );

  await Bun.write("origin/embeded.json", JSON.stringify(embeded));
}

// await embedJsonFirst1000();

async function embedJsonChunks() {
  const json = await csvToJson();
  const chunks = _.chunk(json, 32);

  const embededChunks = await Promise.all(
    chunks.map(async (chunk, index) => {
      console.log(
        `Processing chunk ${index + 1}/${chunks.length} with ${chunk.length} items`
      );

      try {
        const { embeddings, usage } = await embedMany({
          model: siliconflow.textEmbeddingModel("Qwen/Qwen3-Embedding-0.6B"),
          values: chunk.map((item) => item.name),
        });

        console.log(
          `Chunk ${index + 1} embedding completed:`,
          embeddings.length,
          "embeddings"
        );

        return chunk.map((item, i) => ({
          ...item,
          embedding: embeddings[i],
          usage: usage,
        }));
      } catch (error) {
        console.error(`Error processing chunk ${index + 1}:`, error);
        return chunk.map((item) => ({
          ...item,
          embedding: null,
          usage: null,
          error: error instanceof Error ? error.message : String(error),
        }));
      }
    })
  );

  await Bun.write("origin/embeded-chunks.json", JSON.stringify(embededChunks));
  await Bun.write("origin/embeded.json", JSON.stringify(embededChunks.flat()));
}

await embedJsonChunks();

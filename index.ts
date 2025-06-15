import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { extractTopReceivables } from "./receivables";
import { readdir } from "node:fs/promises";
import { relative } from "node:path";

if (!process.env.DATA_DIR) {
  throw new Error("DATA_DIR environment variable is not set");
}
const dataDir = process.env.DATA_DIR;

if (!process.env.SILICONFLOW_API_KEY) {
  throw new Error("SILICONFLOW_API_KEY environment variable is not set");
}
const siliconflow = createOpenAICompatible({
  name: "SiliconFlow",
  baseURL: "https://api.siliconflow.cn/v1",
  apiKey: process.env.SILICONFLOW_API_KEY,
});

const files = await readdir(dataDir, { withFileTypes: true, recursive: true });
const extractedReceivables = await Promise.all(
  files
    .filter((file) => file.isFile() && file.name.endsWith(".txt"))
    .map(async (file) => {
      const filePath = `${file.parentPath}/${file.name}`;
      const result = await extractTopReceivables(filePath);
      return {
        ...result,
        filePath: relative(dataDir, filePath),
        year: relative(dataDir, file.parentPath),
      };
    })
);

await Bun.write(
  "extractedReceivables.json",
  JSON.stringify(extractedReceivables, null, 2)
);

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { extractTopReceivable, generateTopReceivable } from "./receivables";
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
      const result = await extractTopReceivable(filePath);
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

const receivables = await Promise.all(
  extractedReceivables
    .filter((result) => result.hasTopReceivables && result.text)
    .map(async (result) => {
      let receivable;

      try {
        console.log(
          `Generating top receivables for ${result.filePath} (${result.year})`
        );
        receivable = await generateTopReceivable({
          model: siliconflow("Pro/deepseek-ai/DeepSeek-V3"),
          prompt: result.text!.slice(0, 1000),
        });
      } catch (error) {
        console.error(
          `Failed to generate top receivables for ${result.filePath} (${result.year}):`,
          error
        );
        return {
          ...result,
          error: `Failed to generate top receivables: ${
            error instanceof Error ? error.message : String(error)
          }`,
        };
      }

      console.log(
        `Generated top receivables for ${result.filePath} (${result.year}) used ${receivable.usage.totalTokens} tokens`
      );
      return {
        ...result,
        usage: receivable.usage,
        topReceivables: receivable.object,
      };
    })
);

await Bun.write("receivables.json", JSON.stringify(receivables, null, 2));

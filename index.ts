import { readdir } from "node:fs/promises";
import { basename, relative } from "node:path";
import { siliconflow } from "./ai";
import {
  extractTopReceivable,
  extractTopReceivable2014orLater,
  generateTopReceivable,
} from "./receivables";

export async function generateReceivables(directory: string) {
  const files = await readdir(directory, {
    withFileTypes: true,
    recursive: true,
  });

  const loaded = await Promise.all(
    files
      .filter((file) => file.isFile() && file.name.endsWith(".txt"))
      .map(async (file) => {
        const filePath = `${file.parentPath}/${file.name}`;
        // const result = await extractTopReceivable2014orLater(filePath);
        const result = await extractTopReceivable2014orLater(filePath);
        return {
          ...result,
          filePath: relative(dataDir, filePath),
          year: relative(dataDir, file.parentPath),
        };
      })
  );

  await Bun.write(
    `${basename(directory)}-loaded.json`,
    JSON.stringify(loaded, null, 2)
  );

  let errorCount = 0;
  let totalTokens = 0;

  const receivables = await Promise.all(
    loaded
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
          errorCount++;
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
        totalTokens += receivable.usage.totalTokens;

        return {
          ...result,
          usage: receivable.usage,
          topReceivables: receivable.object,
        };
      })
  );

  if (errorCount > 0) {
    console.error(
      `Encountered ${errorCount} errors while generating top receivables.`
    );
  }
  console.log(
    `Generated top receivables for ${
      receivables.length
    } files, used ${totalTokens} tokens in total, average ${
      totalTokens / receivables.length
    } tokens per file.`
  );
  await Bun.write(
    `${basename(directory)}-receivables.json`,
    JSON.stringify(receivables, null, 2)
  );

  return receivables;
}

if (!process.env.DATA_DIR) {
  throw new Error("DATA_DIR environment variable is not set");
}
const dataDir = process.env.DATA_DIR;
const directories = await readdir(dataDir, { withFileTypes: true });
for (const dir of directories) {
  if (dir.isDirectory()) {
    console.log(`Processing directory: ${dir.name}`);
    await generateReceivables(`${dataDir}/${dir.name}`);
  }
}

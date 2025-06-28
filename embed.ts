import { type LanguageModelUsage } from "ai";
import type { generateReceivables } from ".";

type Result = Awaited<ReturnType<typeof generateReceivables>>[number];
type Receivable = Extract<Result, { usage: LanguageModelUsage }>;
function hasTopReceivables(r: Result): r is Receivable {
  return "topReceivables" in r && r.topReceivables !== undefined;
}

if (!process.env.RECEIVABLES_FILE) {
  throw new Error("RECEIVABLES_FILE environment variable is not set");
}
const results = (await Bun.file(
  process.env.RECEIVABLES_FILE
).json()) as Result[];
const receivables = results.filter(hasTopReceivables);

const part = receivables
  .slice(0, 100)
  .map((r) => ({
    filePath: r.filePath,
    ...r.topReceivables,
  }))
  .filter((r) => r.hasTopReceivables)
  .map((r) => ({
    filePath: r.filePath,
    ...r.topReceivables,
  }));

console.log(part);

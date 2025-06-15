import { generateObject } from "ai";
import z from "zod";

export interface ExtractTopReceivablesResult {
  filePath: string;
  hasTopReceivables: boolean;

  lineno?: number;
  text?: string;
}

export async function extractTopReceivables(
  filePath: string
): Promise<ExtractTopReceivablesResult> {
  const text = await Bun.file(filePath).text();
  const lines = text.split("\n");

  for (const [lineno, line] of lines.entries()) {
    if (line.includes("按欠款方归集的期末余额前五名的应收账款")) {
      return {
        filePath,
        hasTopReceivables: true,

        lineno: lineno + 1,
        text: lines.slice(lineno, lineno + 200).join("\n"),
      };
    }
  }
  return {
    filePath,
    hasTopReceivables: false,
  };
}

export const TopReceivable = z.object({
  debtorName: z.string(),
  isMasked: z.boolean(),
  endingBalance: z.number().nullable(),
  percentageOfTotal: z.number().nullable(),
});

export async function generateTopReceivables({
  model,
  prompt,
}: Parameters<typeof generateObject>[0]) {
  return await generateObject({
    model,
    schema: z.object({
      hasTopReceivables: z.boolean(),
      topReceivables: z.array(TopReceivable),
    }),
    prompt: `
Given the following OCR-extracted text from a Chinese listed company's annual report PDF, extract the table for "按欠款方归集的期末余额前五名的应收账款" (Top 5 accounts receivable by debtor at period end). 
Return an array of up to 5 objects with these fields:
- debtorName: the name of the debtor (string)
- isMasked: true if the debtor name is masked or anonymized (e.g., "公司一", "客户1"), false otherwise
- endingBalance: the ending balance for this debtor (number, or null if not available)
- percentageOfTotal: the percentage of total receivables (number, or null if not available)

If the table is not found, set hasTopReceivables to false and topReceivables to an empty array.
If found, set hasTopReceivables to true and fill topReceivables accordingly.

Text:
"""${prompt}"""
`,
  });
}

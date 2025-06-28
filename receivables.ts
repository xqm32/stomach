import { generateObject } from "ai";
import z from "zod";

export interface ExtractTopReceivablesResult {
  filePath: string;
  hasTopReceivables: boolean;

  lineno?: number;
  startPos?: number;
  text?: string;
}

export async function extractTopReceivable(
  filePath: string
): Promise<ExtractTopReceivablesResult> {
  const text = await Bun.file(filePath).text();
  const lines = text.split("\n");

  for (const [lineno, line] of lines.entries()) {
    const hasTopReceivables =
      line.includes("前五名") && line.includes("应收账款");
    const startPos = Math.min(line.indexOf("前五名"), line.indexOf("应收账款"));

    if (hasTopReceivables) {
      return {
        filePath,
        hasTopReceivables: true,

        lineno: lineno + 1,
        startPos: startPos,
        text: lines
          .slice(lineno, lineno + 200)
          .join("\n")
          .slice(startPos - 20, startPos + 1000),
      };
    }
  }
  return {
    filePath,
    hasTopReceivables: false,
  };
}

export async function extractTopReceivable2014orLater(
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

export async function generateTopReceivable({
  model,
  prompt,
}: {
  model: Parameters<typeof generateObject>[0]["model"];
  prompt: string;
}) {
  return await generateObject({
    model,
    schema: z.object({
      hasTopReceivables: z.boolean(),
      topReceivables: z.array(TopReceivable),
      isComplete: z.boolean(),
    }),
    prompt: `
Given the following OCR-extracted text from a Chinese listed company's annual report PDF, extract the table for "按欠款方归集的期末余额前五名的应收账款" (Top 5 accounts receivable by debtor at period end).
Return an object with these fields:
- hasTopReceivables: true if the table is found, false otherwise
- topReceivables: an array (up to 5) of objects with:
  - debtorName: the name of the debtor (string)
  - isMasked: true if the debtor name is masked or anonymized (e.g., "公司一", "客户1"), false otherwise
  - endingBalance: the ending balance for this debtor (number, or null if not available)
  - percentageOfTotal: the percentage of total receivables (number, or null if not available)
- isComplete: true if the destination table "按欠款方归集的期末余额前五名的应收账款" is fully extracted and not truncated; set isComplete to false only if this specific table is present but appears to be truncated or incomplete due to the prompt being cut off. If the table is missing entirely, set isComplete to true.
Clarification for isComplete:
- Set isComplete to false ONLY if the table "按欠款方归集的期末余额前五名的应收账款" is present in the text but appears to be truncated or incomplete specifically because the provided prompt was cut off (for example, the table is interrupted mid-row or ends abruptly due to prompt length).
- If the table is present and is followed by the next section header (such as "(6)" or another heading), or if the table appears to be fully listed as in the original document (even if the table itself is incomplete in the source), set isComplete to true.
- If the table is missing entirely, set isComplete to true.
- Do NOT set isComplete to false for cases where the table is incomplete in the original document or only contains partial data; only set it to false if the extraction was cut off due to prompt length.
If the table is not found, set hasTopReceivables to false, topReceivables to an empty array, and isComplete to true.
If found, set hasTopReceivables to true, fill topReceivables accordingly, and set isComplete to false only if the extracted table is incomplete or truncated due to the prompt being cut off.

Text:
"""${prompt}"""
`,
  });
}

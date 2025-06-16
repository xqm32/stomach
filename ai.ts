import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

if (!process.env.SILICONFLOW_API_KEY) {
  throw new Error("SILICONFLOW_API_KEY environment variable is not set");
}
export const siliconflow = createOpenAICompatible({
  name: "SiliconFlow",
  baseURL: "https://api.siliconflow.cn/v1",
  apiKey: process.env.SILICONFLOW_API_KEY,
});

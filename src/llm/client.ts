import OpenAI from "openai";
import type { LLMMessage } from "../types.js";

export class LLMClient {
  private client: OpenAI;
  readonly model: string;

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async chat(messages: LLMMessage[], jsonMode = true): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages as OpenAI.ChatCompletionMessageParam[],
      response_format: jsonMode ? { type: "json_object" } : undefined,
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("LLM returned empty response");
    }
    return content;
  }

  async chatWithVision(
    systemPrompt: string,
    userText: string,
    screenshotBase64: string
  ): Promise<string> {
    const messages: LLMMessage[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userText },
          {
            type: "image_url",
            image_url: { url: `data:image/png;base64,${screenshotBase64}` },
          },
        ],
      },
    ];
    return this.chat(messages);
  }
}

export function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(cleaned) as T;
}

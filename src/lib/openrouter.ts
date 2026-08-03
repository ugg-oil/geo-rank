import OpenAI from "openai";
import { PIPELINE_REQUEST_TIMEOUT_MS } from "@/lib/pipeline-timeouts";

let _client: OpenAI | null = null;

export function getOpenRouter(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY!,
      timeout: PIPELINE_REQUEST_TIMEOUT_MS,
      maxRetries: 1,
    });
  }
  return _client;
}

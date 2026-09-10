import { DEFAULT_MODELS } from "./models";

const BASE_URL = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
}

export interface ChatResult {
  model: string;
  content: string;
  reasoning?: string;
  usage: ChatUsage;
  ttftMs: number;
  totalMs: number;
  tokensPerSecond: number;
}

export interface ChatOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  thinking?: boolean;
  reasoningEffort?: "low" | "medium" | "high";
  jsonMode?: boolean;
  signal?: AbortSignal;
}

export function hasApiKey(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY?.trim());
}

function apiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "Falta DEEPSEEK_API_KEY. Añádela en .env.local (ver .env.example).",
    );
  }
  return key;
}

interface StreamChunk {
  choices?: Array<{
    delta?: { content?: string | null; reasoning_content?: string | null };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    prompt_cache_hit_tokens?: number;
    prompt_cache_miss_tokens?: number;
    completion_tokens_details?: { reasoning_tokens?: number };
    prompt_tokens_details?: { cached_tokens?: number };
  };
}

export async function streamChat(options: ChatOptions): Promise<ChatResult> {
  const key = apiKey();
  const started = Date.now();
  let firstTokenAt = 0;

  const body: Record<string, unknown> = {
    model: options.model,
    messages: options.messages,
    stream: true,
    stream_options: { include_usage: true },
  };

  if (options.temperature != null) body.temperature = options.temperature;
  if (options.maxTokens != null) body.max_tokens = options.maxTokens;
  if (options.thinking === true) body.thinking = { type: "enabled" };
  if (options.thinking === false) body.thinking = { type: "disabled" };
  if (options.reasoningEffort) body.reasoning_effort = options.reasoningEffort;
  if (options.jsonMode && options.thinking !== true) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `DeepSeek respondió ${response.status} ${response.statusText}. ${detail.slice(0, 600)}`,
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let reasoning = "";
  let usage: ChatUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    reasoningTokens: 0,
    cachedTokens: 0,
  };

  const markFirstToken = () => {
    if (firstTokenAt === 0) firstTokenAt = Date.now() - started;
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;

      let chunk: StreamChunk;
      try {
        chunk = JSON.parse(payload) as StreamChunk;
      } catch {
        continue;
      }

      const delta = chunk.choices?.[0]?.delta;
      if (delta?.reasoning_content) {
        markFirstToken();
        reasoning += delta.reasoning_content;
      }
      if (delta?.content) {
        markFirstToken();
        content += delta.content;
      }

      if (chunk.usage) {
        usage = {
          promptTokens: chunk.usage.prompt_tokens ?? 0,
          completionTokens: chunk.usage.completion_tokens ?? 0,
          totalTokens: chunk.usage.total_tokens ?? 0,
          reasoningTokens:
            chunk.usage.completion_tokens_details?.reasoning_tokens ?? 0,
          cachedTokens:
            chunk.usage.prompt_tokens_details?.cached_tokens ??
            chunk.usage.prompt_cache_hit_tokens ??
            0,
        };
      }
    }
  }

  const totalMs = Date.now() - started;
  const ttftMs = firstTokenAt || (content || reasoning ? totalMs : 0);
  const streamMs = Math.max(totalMs - ttftMs, 1);
  const tokensPerSecond = usage.completionTokens
    ? usage.completionTokens / (streamMs / 1000)
    : 0;

  return {
    model: options.model,
    content,
    reasoning: reasoning || undefined,
    usage,
    ttftMs,
    totalMs,
    tokensPerSecond,
  };
}

export async function streamMany(
  models: string[],
  options: Omit<ChatOptions, "model">,
): Promise<Array<{ model: string; result?: ChatResult; error?: string }>> {
  const settled = await Promise.allSettled(
    models.map((model) => streamChat({ ...options, model })),
  );
  return settled.map((entry, index) => {
    const model = models[index];
    if (entry.status === "fulfilled") {
      return { model, result: entry.value };
    }
    return {
      model,
      error:
        entry.reason instanceof Error
          ? entry.reason.message
          : String(entry.reason),
    };
  });
}

export async function listRemoteModels(): Promise<string[]> {
  const key = apiKey();
  const response = await fetch(`${BASE_URL}/models`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`No se pudo listar modelos (${response.status}).`);
  }
  const data = (await response.json()) as { data?: Array<{ id?: string }> };
  return (data.data ?? [])
    .map((item) => item.id)
    .filter((id): id is string => Boolean(id));
}

export function parseJsonLoose<T>(raw: string): T {
  const cleaned = raw
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) {
      throw new Error("La respuesta del modelo no contiene JSON válido.");
    }
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  }
}

export { DEFAULT_MODELS };

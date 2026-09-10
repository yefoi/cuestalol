import { DEFAULT_MODELS, getModel } from "./models";

export type ProviderId = "opencode-go" | "deepseek";

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  baseUrl: string;
  requiresSession: boolean;
  note: string;
}

interface ProviderConfig extends ProviderInfo {
  apiKey: string;
}

const DEFAULT_OPENCODE_BASE = "https://opencode.ai/zen/go/v1";
const DEFAULT_DEEPSEEK_BASE = "https://api.deepseek.com";
const CLIENT_USER_AGENT = "cuestalo/0.1";

let fallbackSessionId: string | null = null;

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `cuestalo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function normalizeBase(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function resolveProvider(): ProviderConfig {
  const opencodeKey = process.env.OPENCODE_API_KEY?.trim();
  if (opencodeKey) {
    return {
      id: "opencode-go",
      label: "OpenCode Go",
      baseUrl: normalizeBase(
        process.env.OPENCODE_BASE_URL ?? DEFAULT_OPENCODE_BASE,
      ),
      apiKey: opencodeKey,
      requiresSession: true,
      note: "Suscripción OpenCode Go ($10/mes). Los precios mostrados son las tarifas de referencia.",
    };
  }

  const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (deepseekKey) {
    return {
      id: "deepseek",
      label: "DeepSeek",
      baseUrl: normalizeBase(
        process.env.DEEPSEEK_BASE_URL ?? DEFAULT_DEEPSEEK_BASE,
      ),
      apiKey: deepseekKey,
      requiresSession: false,
      note: "Facturación directa de DeepSeek por token.",
    };
  }

  throw new Error(
    "Falta una clave de API. Define OPENCODE_API_KEY o DEEPSEEK_API_KEY en .env.local (ver .env.example).",
  );
}

export function hasApiKey(): boolean {
  return Boolean(
    process.env.OPENCODE_API_KEY?.trim() ||
      process.env.DEEPSEEK_API_KEY?.trim(),
  );
}

export function providerInfo(): ProviderInfo | null {
  try {
    const { id, label, baseUrl, requiresSession, note } = resolveProvider();
    return { id, label, baseUrl, requiresSession, note };
  } catch {
    return null;
  }
}

function buildHeaders(
  config: ProviderConfig,
  sessionId?: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
    "User-Agent": CLIENT_USER_AGENT,
  };
  if (config.requiresSession) {
    if (!fallbackSessionId) fallbackSessionId = randomId();
    headers["x-opencode-session"] = sessionId?.trim() || fallbackSessionId;
  }
  return headers;
}

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
  sessionId?: string;
  signal?: AbortSignal;
}

interface StreamChunk {
  choices?: Array<{
    delta?: {
      content?: string | null;
      reasoning_content?: string | null;
      reasoning?: string | null;
    };
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
  const config = resolveProvider();
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

  const supportsThinking = getModel(options.model)?.supportsThinking ?? false;
  if (supportsThinking) {
    if (options.thinking === true) body.thinking = { type: "enabled" };
    if (options.thinking === false) body.thinking = { type: "disabled" };
    if (options.reasoningEffort) {
      body.reasoning_effort = options.reasoningEffort;
    }
  }
  if (options.jsonMode && options.thinking !== true) {
    body.response_format = { type: "json_object" };
  }

  const send = () =>
    fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: buildHeaders(config, options.sessionId),
      body: JSON.stringify(body),
      signal: options.signal,
    });

  let response = await send();

  if (!response.ok && body.response_format) {
    delete body.response_format;
    const retry = await send();
    if (retry.ok) response = retry;
  }

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `${config.label} respondió ${response.status} ${response.statusText}. ${detail.slice(0, 600)}`,
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
      const reasoningDelta = delta?.reasoning_content ?? delta?.reasoning;
      if (reasoningDelta) {
        markFirstToken();
        reasoning += reasoningDelta;
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
  const config = resolveProvider();
  const response = await fetch(`${config.baseUrl}/models`, {
    headers: buildHeaders(config),
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

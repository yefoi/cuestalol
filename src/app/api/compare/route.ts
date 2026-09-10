import { NextResponse } from "next/server";

import { streamMany, type ChatMessage } from "@/lib/deepseek";
import {
  computeCost,
  currentTier,
  DEFAULT_MODELS,
  MODELS,
} from "@/lib/models";

export const runtime = "nodejs";
export const maxDuration = 120;

interface CompareBody {
  prompt?: unknown;
  system?: unknown;
  models?: unknown;
  temperature?: unknown;
  maxTokens?: unknown;
  thinking?: unknown;
  reasoningEffort?: unknown;
  sessionId?: unknown;
}

export async function POST(request: Request) {
  let body: CompareBody;
  try {
    body = (await request.json()) as CompareBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json(
      { error: "El prompt no puede estar vacío." },
      { status: 400 },
    );
  }
  if (prompt.length > 20_000) {
    return NextResponse.json(
      { error: "El prompt es demasiado largo (máx. 20.000 caracteres)." },
      { status: 400 },
    );
  }

  const requested = Array.isArray(body.models)
    ? body.models.filter((m): m is string => typeof m === "string")
    : [];
  const models = (requested.length ? requested : DEFAULT_MODELS).filter(
    (m) => MODELS[m],
  );
  if (!models.length) {
    return NextResponse.json(
      { error: "Ningún modelo válido seleccionado." },
      { status: 400 },
    );
  }

  const messages: ChatMessage[] = [];
  if (typeof body.system === "string" && body.system.trim()) {
    messages.push({ role: "system", content: body.system.trim() });
  }
  messages.push({ role: "user", content: prompt });

  const temperature =
    typeof body.temperature === "number" ? body.temperature : undefined;
  const maxTokens =
    typeof body.maxTokens === "number" && body.maxTokens > 0
      ? Math.min(body.maxTokens, MODELS["deepseek-flash"].maxOutput)
      : undefined;
  const thinking = typeof body.thinking === "boolean" ? body.thinking : false;
  const reasoningEffort =
    body.reasoningEffort === "low" ||
    body.reasoningEffort === "medium" ||
    body.reasoningEffort === "high"
      ? body.reasoningEffort
      : undefined;

  const at = new Date();
  const outcomes = await streamMany(models, {
    messages,
    temperature,
    maxTokens,
    thinking,
    reasoningEffort,
    sessionId:
      typeof body.sessionId === "string" ? body.sessionId : undefined,
  });

  const results = outcomes.map(({ model, result, error }) => {
    if (!result) {
      return { model, ok: false, error: error ?? "Error desconocido." };
    }
    const cost = computeCost(model, result.usage, at);
    return {
      model,
      ok: true,
      content: result.content,
      reasoning: result.reasoning,
      ttftMs: result.ttftMs,
      totalMs: result.totalMs,
      tokensPerSecond: result.tokensPerSecond,
      usage: result.usage,
      cost,
    };
  });

  return NextResponse.json({
    tier: currentTier(at),
    at: at.toISOString(),
    results,
  });
}

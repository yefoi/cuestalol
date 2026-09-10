import { NextResponse } from "next/server";

import { parseJsonLoose, streamChat, type ChatMessage } from "@/lib/deepseek";
import {
  computeCost,
  costForTier,
  currentTier,
  DEFAULT_ESTIMATOR_MODEL,
  getModel,
  MODELS,
  type Usage,
} from "@/lib/models";

export const runtime = "nodejs";
export const maxDuration = 120;

interface EstimateBody {
  idea?: unknown;
  projectType?: unknown;
  detail?: unknown;
  model?: unknown;
  thinking?: unknown;
  reasoningEffort?: unknown;
  hourlyRate?: unknown;
  hoursPerDay?: unknown;
  teamSize?: unknown;
  sessionId?: unknown;
}

interface RawFeature {
  name?: unknown;
  description?: unknown;
  complexity?: unknown;
  humanHours?: unknown;
  aiInputTokens?: unknown;
  aiOutputTokens?: unknown;
}

interface RawPlan {
  summary?: unknown;
  projectType?: unknown;
  complexity?: unknown;
  suggestedStack?: unknown;
  features?: unknown;
  assumptions?: unknown;
  risks?: unknown;
  notes?: unknown;
}

function num(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function strArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function buildSystemPrompt(): string {
  return [
    "Eres un arquitecto de software y estimador senior.",
    "El usuario describe una idea de producto. Descompónla en funcionalidades y estima (1) el esfuerzo humano y (2) el consumo de tokens de un desarrollador que use un asistente de IA para implementar cada funcionalidad.",
    "",
    "Responde SIEMPRE y ÚNICAMENTE con un objeto JSON válido, sin texto adicional ni bloques de código, con esta forma exacta:",
    "{",
    '  "summary": string,',
    '  "projectType": string,',
    '  "complexity": "baja" | "media" | "alta",',
    '  "suggestedStack": string[],',
    '  "features": [',
    "    {",
    '      "name": string,',
    '      "description": string,',
    '      "complexity": "baja" | "media" | "alta",',
    '      "humanHours": number,',
    '      "aiInputTokens": number,',
    '      "aiOutputTokens": number',
    "    }",
    "  ],",
    '  "assumptions": string[],',
    '  "risks": string[],',
    '  "notes": string',
    "}",
    "",
    "Reglas:",
    "- Entre 5 y 15 funcionalidades, cubriendo frontend, backend, datos, autenticación, despliegue y pruebas cuando apliquen.",
    "- humanHours: horas de desarrollo de un dev senior para esa funcionalidad (sin contar gestión). Sé realista.",
    "- aiInputTokens y aiOutputTokens: tokens totales sumando TODAS las iteraciones (planificación, generación, correcciones, tests y documentación) que consumiría un dev usando un asistente IA para esa funcionalidad, asumiendo cache miss. Sé realista.",
    "- Rangos de referencia por funcionalidad (ajusta según el contexto): complejidad baja ≈ 20k-60k input / 10k-25k output; media ≈ 60k-200k input / 25k-90k output; alta ≈ 200k-800k input / 90k-350k output.",
    "- No incluyas precios ni campos adicionales.",
  ].join("\n");
}

export async function POST(request: Request) {
  let body: EstimateBody;
  try {
    body = (await request.json()) as EstimateBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const idea = typeof body.idea === "string" ? body.idea.trim() : "";
  if (idea.length < 10) {
    return NextResponse.json(
      { error: "Describe la idea con algo más de detalle (mín. 10 caracteres)." },
      { status: 400 },
    );
  }
  if (idea.length > 8_000) {
    return NextResponse.json(
      { error: "La descripción es demasiado larga (máx. 8.000 caracteres)." },
      { status: 400 },
    );
  }

  const model =
    typeof body.model === "string" && MODELS[body.model]
      ? body.model
      : DEFAULT_ESTIMATOR_MODEL;
  const thinking = body.thinking === true;
  const projectType = str(body.projectType, "No especificado");
  const detail = str(body.detail, "normal");

  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt() },
    {
      role: "user",
      content: [
        "Idea del proyecto:",
        `"""${idea}"""`,
        "",
        `Tipo de proyecto: ${projectType}`,
        `Nivel de detalle: ${detail}`,
        "",
        "Genera el JSON de estimación.",
      ].join("\n"),
    },
  ];

  let chat;
  try {
    chat = await streamChat({
      model,
      messages,
      thinking,
      reasoningEffort: thinking ? "high" : undefined,
      jsonMode: true,
      temperature: 0.2,
      maxTokens: 8_000,
      sessionId:
        typeof body.sessionId === "string" ? body.sessionId : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Error al llamar a DeepSeek.",
      },
      { status: 502 },
    );
  }

  let raw: RawPlan;
  try {
    raw = parseJsonLoose<RawPlan>(chat.content);
  } catch {
    return NextResponse.json(
      {
        error: "El modelo no devolvió un plan válido. Prueba de nuevo.",
        raw: chat.content.slice(0, 1_500),
      },
      { status: 502 },
    );
  }

  const features = (Array.isArray(raw.features) ? raw.features : [])
    .map((item) => {
      const feature = (item ?? {}) as RawFeature;
      return {
        name: str(feature.name, "Funcionalidad"),
        description: str(feature.description, ""),
        complexity: str(feature.complexity, "media"),
        humanHours: num(feature.humanHours),
        aiInputTokens: Math.round(num(feature.aiInputTokens)),
        aiOutputTokens: Math.round(num(feature.aiOutputTokens)),
      };
    })
    .filter((feature) => feature.name);

  if (!features.length) {
    return NextResponse.json(
      {
        error: "El plan generado no contiene funcionalidades. Prueba de nuevo.",
        raw: chat.content.slice(0, 1_500),
      },
      { status: 502 },
    );
  }

  const totalHours = features.reduce((sum, f) => sum + f.humanHours, 0);
  const totalInput = features.reduce((sum, f) => sum + f.aiInputTokens, 0);
  const totalOutput = features.reduce((sum, f) => sum + f.aiOutputTokens, 0);

  const hoursPerDay = Math.min(Math.max(num(body.hoursPerDay, 6), 1), 12);
  const teamSize = Math.min(Math.max(num(body.teamSize, 1), 1), 20);
  const hourlyRate = Math.min(Math.max(num(body.hourlyRate, 50), 0), 1_000);

  const workDays = totalHours / hoursPerDay;
  const calendarDays = workDays / teamSize;

  const at = new Date();
  const usage: Usage = {
    promptTokens: totalInput,
    completionTokens: totalOutput,
  };

  const aiCosts = Object.keys(MODELS).map((modelId) => {
    const missOff = costForTier(modelId, usage, "off-peak");
    const missPeak = costForTier(modelId, usage, "peak");
    const cachedUsage: Usage = {
      ...usage,
      cachedTokens: Math.round(totalInput * 0.5),
    };
    const hitOff = costForTier(modelId, cachedUsage, "off-peak");
    const hitPeak = costForTier(modelId, cachedUsage, "peak");
    const info = getModel(modelId);
    return {
      modelId,
      label: info?.label ?? modelId,
      offPeak: { miss: missOff.totalCost, cached50: hitOff.totalCost },
      peak: { miss: missPeak.totalCost, cached50: hitPeak.totalCost },
      range: {
        min: hitOff.totalCost,
        max: missPeak.totalCost,
      },
    };
  });

  const estimationCall = computeCost(model, chat.usage, at);

  return NextResponse.json({
    tier: currentTier(at),
    at: at.toISOString(),
    model,
    timing: {
      ttftMs: chat.ttftMs,
      totalMs: chat.totalMs,
      tokensPerSecond: chat.tokensPerSecond,
    },
    usage: chat.usage,
    estimationCall,
    plan: {
      summary: str(raw.summary),
      projectType: str(raw.projectType, projectType),
      complexity: str(raw.complexity, "media"),
      suggestedStack: strArray(raw.suggestedStack),
      features,
      assumptions: strArray(raw.assumptions),
      risks: strArray(raw.risks),
      notes: str(raw.notes),
    },
    totals: {
      featureCount: features.length,
      humanHours: totalHours,
      workDays,
      calendarDays,
      aiInputTokens: totalInput,
      aiOutputTokens: totalOutput,
      aiTotalTokens: totalInput + totalOutput,
    },
    schedule: {
      hoursPerDay,
      teamSize,
      hourlyRate,
      humanCost: totalHours * hourlyRate,
    },
    aiCosts,
  });
}

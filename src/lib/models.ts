export type PricingTier = "peak" | "off-peak";

export interface ModelPricing {
  cacheHitInput: number;
  cacheMissInput: number;
  output: number;
}

export interface ModelInfo {
  id: string;
  label: string;
  version: string;
  family: string;
  contextLength: number;
  maxOutput: number;
  supportsThinking: boolean;
  supportsVision: boolean;
  thinkingDefault: boolean;
  description: string;
  note?: string;
  providers: string[];
  monthlyLimitUsd?: number;
  pricing: {
    peak: ModelPricing;
    offPeak: ModelPricing;
  };
}

export interface Usage {
  promptTokens: number;
  completionTokens: number;
  reasoningTokens?: number;
  cachedTokens?: number;
  totalTokens?: number;
}

export interface CostBreakdown {
  tier: PricingTier;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  cachedTokens: number;
  uncachedInputTokens: number;
  outputTokens: number;
  pricing: ModelPricing;
}

export interface ModelCost extends CostBreakdown {
  modelId: string;
  nowTier: PricingTier;
  peak: CostBreakdown;
  offPeak: CostBreakdown;
}

function fixed(
  input: number,
  output: number,
  cacheHit: number,
): ModelInfo["pricing"] {
  const pricing: ModelPricing = {
    cacheHitInput: cacheHit,
    cacheMissInput: input,
    output,
  };
  return { peak: pricing, offPeak: pricing };
}

function dsPricing(
  offInput: number,
  offOutput: number,
  offCache: number,
): ModelInfo["pricing"] {
  const factor = 2;
  return {
    offPeak: {
      cacheHitInput: offCache,
      cacheMissInput: offInput,
      output: offOutput,
    },
    peak: {
      cacheHitInput: offCache * factor,
      cacheMissInput: offInput * factor,
      output: offOutput * factor,
    },
  };
}

export const MODELS: Record<string, ModelInfo> = {
  "deepseek-flash": {
    id: "deepseek-flash",
    label: "DeepSeek V4.1 Flash",
    version: "DeepSeek-V4.1-Flash",
    family: "DeepSeek",
    contextLength: 1_000_000,
    maxOutput: 384_000,
    supportsThinking: true,
    supportsVision: true,
    thinkingDefault: true,
    description:
      "Modelo principal: rápido y económico. Supera a V4 Pro en rendimiento, coste y velocidad.",
    providers: ["deepseek", "opencode-go"],
    monthlyLimitUsd: 15,
    pricing: dsPricing(0.15, 0.6, 0.003),
  },
  "deepseek-v4-pro": {
    id: "deepseek-v4-pro",
    label: "DeepSeek V4 Pro",
    version: "DeepSeek-V4-Pro-0813",
    family: "DeepSeek",
    contextLength: 1_000_000,
    maxOutput: 384_000,
    supportsThinking: true,
    supportsVision: false,
    thinkingDefault: true,
    description:
      "Tier superior para razonamiento y código exigente. En retirada: sus peticiones se enrutan a V4.1 Flash.",
    note: "Desde el 14/09/2026 las peticiones se enrutan a V4.1 Flash y se facturan a precio Flash.",
    providers: ["deepseek", "opencode-go"],
    monthlyLimitUsd: 15,
    pricing: dsPricing(0.66, 1.98, 0.022),
  },
  "deepseek-v4-flash": {
    id: "deepseek-v4-flash",
    label: "DeepSeek V4 Flash",
    version: "DeepSeek-V4-Flash",
    family: "DeepSeek",
    contextLength: 1_000_000,
    maxOutput: 384_000,
    supportsThinking: true,
    supportsVision: false,
    thinkingDefault: true,
    description: "Variante Flash de V4 con buen equilibrio coste/calidad.",
    providers: ["opencode-go"],
    monthlyLimitUsd: 30,
    pricing: dsPricing(0.15, 0.6, 0.003),
  },
  "deepseek-v4-flash-vision-exp": {
    id: "deepseek-v4-flash-vision-exp",
    label: "DeepSeek V4 Flash Vision",
    version: "V4-Flash-Vision-Exp",
    family: "DeepSeek",
    contextLength: 1_000_000,
    maxOutput: 384_000,
    supportsThinking: true,
    supportsVision: true,
    thinkingDefault: true,
    description: "Experimental con entrada de imágenes, facturadas como tokens.",
    providers: ["opencode-go"],
    monthlyLimitUsd: 15,
    pricing: dsPricing(0.15, 0.6, 0.003),
  },
  "mimo-v2.5": {
    id: "mimo-v2.5",
    label: "MiMo V2.5",
    version: "MiMo-V2.5",
    family: "MiMo",
    contextLength: 256_000,
    maxOutput: 128_000,
    supportsThinking: false,
    supportsVision: false,
    thinkingDefault: false,
    description: "El más económico del catálogo: ideal para tráfico gratuito.",
    providers: ["opencode-go"],
    monthlyLimitUsd: 60,
    pricing: fixed(0.14, 0.28, 0.0028),
  },
  "mimo-v2.5-pro": {
    id: "mimo-v2.5-pro",
    label: "MiMo V2.5 Pro",
    version: "MiMo-V2.5-Pro",
    family: "MiMo",
    contextLength: 256_000,
    maxOutput: 128_000,
    supportsThinking: false,
    supportsVision: false,
    thinkingDefault: false,
    description: "Versión Pro de MiMo, aún muy barata.",
    providers: ["opencode-go"],
    monthlyLimitUsd: 15,
    pricing: fixed(0.435, 0.87, 0.003625),
  },
  "glm-5.3-flash": {
    id: "glm-5.3-flash",
    label: "GLM 5.3 Flash",
    version: "GLM-5.3-Flash",
    family: "GLM",
    contextLength: 256_000,
    maxOutput: 128_000,
    supportsThinking: false,
    supportsVision: false,
    thinkingDefault: false,
    description: "Rápido y barato, con gran límite mensual incluido.",
    providers: ["opencode-go"],
    monthlyLimitUsd: 60,
    pricing: fixed(0.15, 0.5, 0.03),
  },
  "glm-5.3": {
    id: "glm-5.3",
    label: "GLM 5.3",
    version: "GLM-5.3",
    family: "GLM",
    contextLength: 256_000,
    maxOutput: 128_000,
    supportsThinking: true,
    supportsVision: false,
    thinkingDefault: false,
    description: "Modelo GLM de alta calidad para código y razonamiento.",
    providers: ["opencode-go"],
    monthlyLimitUsd: 15,
    pricing: fixed(1.4, 4.4, 0.26),
  },
  "glm-5.1": {
    id: "glm-5.1",
    label: "GLM 5.1",
    version: "GLM-5.1",
    family: "GLM",
    contextLength: 256_000,
    maxOutput: 128_000,
    supportsThinking: true,
    supportsVision: false,
    thinkingDefault: false,
    description: "Generación anterior de GLM, buen límite mensual.",
    providers: ["opencode-go"],
    monthlyLimitUsd: 60,
    pricing: fixed(1.4, 4.4, 0.26),
  },
  "kimi-k2.6": {
    id: "kimi-k2.6",
    label: "Kimi K2.6",
    version: "Kimi-K2.6",
    family: "Kimi",
    contextLength: 256_000,
    maxOutput: 128_000,
    supportsThinking: false,
    supportsVision: false,
    thinkingDefault: false,
    description: "Fuerte en código, con contexto largo.",
    providers: ["opencode-go"],
    monthlyLimitUsd: 60,
    pricing: fixed(0.95, 4.0, 0.16),
  },
  "kimi-k2.7-code": {
    id: "kimi-k2.7-code",
    label: "Kimi K2.7 Code",
    version: "Kimi-K2.7-Code",
    family: "Kimi",
    contextLength: 256_000,
    maxOutput: 128_000,
    supportsThinking: false,
    supportsVision: false,
    thinkingDefault: false,
    description: "Especializado en código.",
    providers: ["opencode-go"],
    monthlyLimitUsd: 60,
    pricing: fixed(0.95, 4.0, 0.19),
  },
  "kimi-k3": {
    id: "kimi-k3",
    label: "Kimi K3",
    version: "Kimi-K3",
    family: "Kimi",
    contextLength: 256_000,
    maxOutput: 128_000,
    supportsThinking: true,
    supportsVision: false,
    thinkingDefault: false,
    description: "El más potente y caro: resérvalo para planes de pago.",
    providers: ["opencode-go"],
    monthlyLimitUsd: 15,
    pricing: fixed(3.0, 15.0, 0.3),
  },
  "longcat-2.0": {
    id: "longcat-2.0",
    label: "LongCat 2.0",
    version: "LongCat-2.0",
    family: "LongCat",
    contextLength: 128_000,
    maxOutput: 128_000,
    supportsThinking: false,
    supportsVision: false,
    thinkingDefault: false,
    description: "Barato y con buen límite para uso general.",
    providers: ["opencode-go"],
    monthlyLimitUsd: 60,
    pricing: fixed(0.3, 1.2, 0.006),
  },
  "minimax-m3": {
    id: "minimax-m3",
    label: "MiniMax M3",
    version: "MiniMax-M3",
    family: "MiniMax",
    contextLength: 256_000,
    maxOutput: 128_000,
    supportsThinking: false,
    supportsVision: false,
    thinkingDefault: false,
    description: "Buen equilibrio para tareas generales.",
    providers: ["opencode-go"],
    monthlyLimitUsd: 60,
    pricing: fixed(0.3, 1.2, 0.06),
  },
  "minimax-m2.7": {
    id: "minimax-m2.7",
    label: "MiniMax M2.7",
    version: "MiniMax-M2.7",
    family: "MiniMax",
    contextLength: 256_000,
    maxOutput: 128_000,
    supportsThinking: false,
    supportsVision: false,
    thinkingDefault: false,
    description: "Generación anterior, buen límite mensual.",
    providers: ["opencode-go"],
    monthlyLimitUsd: 60,
    pricing: fixed(0.3, 1.2, 0.06),
  },
  hy3: {
    id: "hy3",
    label: "Hy3",
    version: "Hy3",
    family: "Hy",
    contextLength: 256_000,
    maxOutput: 128_000,
    supportsThinking: false,
    supportsVision: false,
    thinkingDefault: false,
    description: "Modelo económico con gran límite mensual.",
    providers: ["opencode-go"],
    monthlyLimitUsd: 60,
    pricing: fixed(0.14, 0.58, 0.035),
  },
  "qwen3.8-flash": {
    id: "qwen3.8-flash",
    label: "Qwen3.8 Flash",
    version: "Qwen3.8-Flash",
    family: "Qwen",
    contextLength: 256_000,
    maxOutput: 128_000,
    supportsThinking: false,
    supportsVision: false,
    thinkingDefault: false,
    description: "Rápido y económico, con caché de escritura.",
    providers: ["opencode-go"],
    monthlyLimitUsd: 30,
    pricing: fixed(0.15, 0.47, 0.016),
  },
  "qwen3.8-max": {
    id: "qwen3.8-max",
    label: "Qwen3.8 Max",
    version: "Qwen3.8-Max",
    family: "Qwen",
    contextLength: 256_000,
    maxOutput: 128_000,
    supportsThinking: true,
    supportsVision: false,
    thinkingDefault: false,
    description: "Top de gama de Qwen, para tareas exigentes.",
    providers: ["opencode-go"],
    monthlyLimitUsd: 15,
    pricing: fixed(2.0, 6.0, 0.25),
  },
  "qwen3.7-plus": {
    id: "qwen3.7-plus",
    label: "Qwen3.7 Plus",
    version: "Qwen3.7-Plus",
    family: "Qwen",
    contextLength: 256_000,
    maxOutput: 128_000,
    supportsThinking: false,
    supportsVision: false,
    thinkingDefault: false,
    description: "Gama media de Qwen con buen límite mensual.",
    providers: ["opencode-go"],
    monthlyLimitUsd: 60,
    pricing: fixed(0.4, 1.6, 0.04),
  },
};

export const DEFAULT_MODELS = ["deepseek-flash", "deepseek-v4-pro"];
export const DEFAULT_ESTIMATOR_MODEL = "deepseek-flash";

export const PEAK_HOURS_UTC = [
  { from: 1, to: 4 },
  { from: 6, to: 10 },
];

export const PEAK_HOURS_LABEL = "01:00–04:00 y 06:00–10:00 UTC (lunes a viernes)";

export function isPeakUTC(date: Date = new Date()): boolean {
  const day = date.getUTCDay();
  if (day === 0 || day === 6) return false;
  const hour = date.getUTCHours();
  return PEAK_HOURS_UTC.some((r) => hour >= r.from && hour < r.to);
}

export function currentTier(date: Date = new Date()): PricingTier {
  return isPeakUTC(date) ? "peak" : "off-peak";
}

export function getModel(modelId: string): ModelInfo | undefined {
  return MODELS[modelId];
}

export function modelsForProvider(providerId?: string | null): ModelInfo[] {
  const all = Object.values(MODELS);
  if (!providerId) return all;
  return all.filter((model) => model.providers.includes(providerId));
}

export function costForTier(
  modelId: string,
  usage: Usage,
  tier: PricingTier,
): CostBreakdown {
  const model = MODELS[modelId];
  if (!model) {
    throw new Error(`Modelo desconocido: ${modelId}`);
  }
  const pricing = tier === "peak" ? model.pricing.peak : model.pricing.offPeak;
  const cachedTokens = Math.max(
    0,
    Math.min(usage.cachedTokens ?? 0, usage.promptTokens),
  );
  const uncachedInputTokens = Math.max(usage.promptTokens - cachedTokens, 0);
  const inputCost =
    (cachedTokens / 1_000_000) * pricing.cacheHitInput +
    (uncachedInputTokens / 1_000_000) * pricing.cacheMissInput;
  const outputCost = (usage.completionTokens / 1_000_000) * pricing.output;

  return {
    tier,
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    cachedTokens,
    uncachedInputTokens,
    outputTokens: usage.completionTokens,
    pricing,
  };
}

export function computeCost(
  modelId: string,
  usage: Usage,
  at: Date = new Date(),
): ModelCost {
  const nowTier = currentTier(at);
  const current = costForTier(modelId, usage, nowTier);
  return {
    modelId,
    nowTier,
    ...current,
    peak: costForTier(modelId, usage, "peak"),
    offPeak: costForTier(modelId, usage, "off-peak"),
  };
}

export function estimateTokensFromText(text: string): number {
  return Math.ceil(text.length / 4);
}

export function modelCatalog() {
  const now = new Date();
  return {
    baseUrl: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
    serverTimeUtc: now.toISOString(),
    tier: currentTier(now),
    isPeak: isPeakUTC(now),
    peakHours: PEAK_HOURS_LABEL,
    defaults: DEFAULT_MODELS,
    estimatorModel: DEFAULT_ESTIMATOR_MODEL,
    models: Object.values(MODELS),
  };
}

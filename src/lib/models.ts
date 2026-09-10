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
  contextLength: number;
  maxOutput: number;
  supportsThinking: boolean;
  supportsVision: boolean;
  thinkingDefault: boolean;
  description: string;
  note?: string;
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

export const MODELS: Record<string, ModelInfo> = {
  "deepseek-flash": {
    id: "deepseek-flash",
    label: "DeepSeek Flash",
    version: "DeepSeek-V4.1-Flash",
    contextLength: 1_000_000,
    maxOutput: 384_000,
    supportsThinking: true,
    supportsVision: true,
    thinkingDefault: true,
    description:
      "Modelo principal: rápido y económico. Supera a V4 Pro en rendimiento, coste y velocidad.",
    pricing: {
      offPeak: { cacheHitInput: 0.003, cacheMissInput: 0.15, output: 0.6 },
      peak: { cacheHitInput: 0.006, cacheMissInput: 0.3, output: 1.2 },
    },
  },
  "deepseek-v4-pro": {
    id: "deepseek-v4-pro",
    label: "DeepSeek V4 Pro",
    version: "DeepSeek-V4-Pro-0813",
    contextLength: 1_000_000,
    maxOutput: 384_000,
    supportsThinking: true,
    supportsVision: false,
    thinkingDefault: true,
    description:
      "Tier superior para razonamiento y código exigente. En retirada: sus peticiones se enrutarán a V4.1 Flash.",
    note: "Desde el 14/09/2026 las peticiones se enrutan a V4.1 Flash y se facturan a precio Flash.",
    pricing: {
      offPeak: { cacheHitInput: 0.022, cacheMissInput: 0.66, output: 1.98 },
      peak: { cacheHitInput: 0.044, cacheMissInput: 1.32, output: 3.96 },
    },
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

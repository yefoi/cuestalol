import type { ModelCost, ModelInfo, PricingTier, Usage } from "./models";

export interface ProviderSummary {
  id: string;
  label: string;
  baseUrl: string;
  requiresSession: boolean;
  note: string;
}

export interface Catalog {
  baseUrl: string;
  serverTimeUtc: string;
  tier: PricingTier;
  isPeak: boolean;
  peakHours: string;
  defaults: string[];
  estimatorModel: string;
  models: ModelInfo[];
  hasApiKey: boolean;
  provider: ProviderSummary | null;
  verified?: boolean;
  remoteModels?: string[];
  verifyError?: string;
}

export interface CompareResult {
  model: string;
  ok: boolean;
  error?: string;
  content?: string;
  reasoning?: string;
  ttftMs?: number;
  totalMs?: number;
  tokensPerSecond?: number;
  usage?: Usage;
  cost?: ModelCost;
}

export interface CompareResponse {
  tier: PricingTier;
  at: string;
  results: CompareResult[];
}

export interface EstimateFeature {
  name: string;
  description: string;
  complexity: string;
  humanHours: number;
  aiInputTokens: number;
  aiOutputTokens: number;
}

export interface AiCostEstimate {
  modelId: string;
  label: string;
  offPeak: { miss: number; cached50: number };
  peak: { miss: number; cached50: number };
  range: { min: number; max: number };
}

export interface EstimateResponse {
  tier: PricingTier;
  at: string;
  model: string;
  timing: { ttftMs: number; totalMs: number; tokensPerSecond: number };
  usage: Usage;
  estimationCall: ModelCost;
  plan: {
    summary: string;
    projectType: string;
    complexity: string;
    suggestedStack: string[];
    features: EstimateFeature[];
    assumptions: string[];
    risks: string[];
    notes: string;
  };
  totals: {
    featureCount: number;
    humanHours: number;
    workDays: number;
    calendarDays: number;
    aiInputTokens: number;
    aiOutputTokens: number;
    aiTotalTokens: number;
  };
  schedule: {
    hoursPerDay: number;
    teamSize: number;
    hourlyRate: number;
    humanCost: number;
  };
  aiCosts: AiCostEstimate[];
}

export type HistoryKind = "compare" | "estimate";

export interface HistoryEntry {
  id: string;
  kind: HistoryKind;
  createdAt: string;
  label: string;
  prompt?: string;
  idea?: string;
  compare?: CompareResponse;
  estimate?: EstimateResponse;
}

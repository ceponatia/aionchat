/** Model capabilities and metadata. */
export interface ModelMetadata {
  /** Model identifier (e.g., "aion-labs/aion-2.0"). */
  id: string;
  /** Display name for UI. */
  displayName: string;
  /** Whether the model supports reasoning features. */
  supportsReasoning: boolean;
  /** Maximum context window in tokens. */
  contextWindow: number;
  /** Cost tier for billing/display purposes. */
  costTier: "free" | "low" | "medium" | "high";
}

/** Default model identifier. */
export const DEFAULT_MODEL_ID = "aion-labs/aion-2.0";

/** Registry of known OpenRouter models with metadata. */
const MODEL_REGISTRY: readonly ModelMetadata[] = [
  {
    id: "aion-labs/aion-2.0",
    displayName: "Aion 2.0",
    supportsReasoning: true,
    contextWindow: 128000,
    costTier: "medium",
  },
  {
    id: "deepseek/deepseek-chat",
    displayName: "DeepSeek Chat",
    supportsReasoning: false,
    contextWindow: 64000,
    costTier: "low",
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    displayName: "Claude 3.5 Sonnet",
    supportsReasoning: false,
    contextWindow: 200000,
    costTier: "high",
  },
  {
    id: "openai/gpt-4o",
    displayName: "GPT-4o",
    supportsReasoning: false,
    contextWindow: 128000,
    costTier: "high",
  },
  {
    id: "google/gemini-2.0-flash-exp:free",
    displayName: "Gemini 2.0 Flash (Free)",
    supportsReasoning: false,
    contextWindow: 1000000,
    costTier: "free",
  },
] as const;

/** Fallback metadata for unknown models. */
const FALLBACK_METADATA: Omit<ModelMetadata, "id" | "displayName"> = {
  supportsReasoning: false,
  contextWindow: 32000,
  costTier: "medium",
};

/** Model ID lookup map for performance. */
const MODEL_MAP = new Map<string, ModelMetadata>(
  MODEL_REGISTRY.map((model) => [model.id, model]),
);

/**
 * Normalize a model ID by trimming whitespace.
 * Returns the default model ID if the input is empty.
 */
export function normalizeModelId(modelId: string | null | undefined): string {
  const trimmed = modelId?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : DEFAULT_MODEL_ID;
}

/**
 * Get metadata for a model ID.
 * Returns fallback metadata for unknown models with a generated display name.
 */
export function getModelMetadata(modelId: string): ModelMetadata {
  const normalized = normalizeModelId(modelId);
  const registered = MODEL_MAP.get(normalized);

  if (registered) {
    return registered;
  }

  // Generate a display name from the model ID
  const parts = normalized.split("/");
  const displayName = parts[parts.length - 1] ?? normalized;

  return {
    id: normalized,
    displayName,
    ...FALLBACK_METADATA,
  };
}

/**
 * Returns true when the model id exists in the known registry.
 */
export function isKnownModelId(modelId: string | null | undefined): boolean {
  return MODEL_MAP.has(normalizeModelId(modelId));
}

/**
 * Check if a model ID is valid (non-empty after normalization).
 */
export function isValidModelId(modelId: string | null | undefined): boolean {
  const trimmed = modelId?.trim() ?? "";
  return trimmed.length > 0;
}

/**
 * Get all known models from the registry.
 */
export function getKnownModels(): readonly ModelMetadata[] {
  return MODEL_REGISTRY;
}

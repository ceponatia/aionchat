"use client";

import { useCallback, useState } from "react";

import { DEFAULT_MODEL_ID, normalizeModelId } from "@/lib/model-registry";

const DEFAULT_MODEL_KEY = "aionchat:defaultModel";

interface UseDefaultModelReturn {
  defaultModel: string;
  setDefaultModel: (modelId: string) => void;
  isHydrated: boolean;
}

/**
 * Hook for managing the app-wide default model setting in localStorage.
 * Returns the default model ID and a setter to update it.
 */
export function useDefaultModel(): UseDefaultModelReturn {
  const canUseStorage = typeof window !== "undefined";
  const [defaultModel, setDefaultModelState] = useState<string>(() => {
    if (!canUseStorage) {
      return DEFAULT_MODEL_ID;
    }

    return normalizeModelId(localStorage.getItem(DEFAULT_MODEL_KEY));
  });

  const setDefaultModel = useCallback((modelId: string) => {
    const normalized = normalizeModelId(modelId);
    setDefaultModelState(normalized);
    localStorage.setItem(DEFAULT_MODEL_KEY, normalized);
  }, []);

  return {
    defaultModel,
    setDefaultModel,
    isHydrated: canUseStorage,
  };
}

"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import {
  getKnownModels,
  getModelMetadata,
  isKnownModelId,
  normalizeModelId,
} from "@/lib/model-registry";

interface AppSettingsProps {
  defaultModel: string;
  onDefaultModelChange: (modelId: string) => void;
}

export function AppSettings({
  defaultModel,
  onDefaultModelChange,
}: AppSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [useCustom, setUseCustom] = useState(() => {
    return !isKnownModelId(defaultModel);
  });

  const effectiveModel = normalizeModelId(defaultModel);
  const metadata = getModelMetadata(effectiveModel);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === "custom") {
      setUseCustom(true);
      onDefaultModelChange("");
    } else {
      setUseCustom(false);
      onDefaultModelChange(value);
    }
  };

  return (
    <div className="px-3 pb-4 pt-1">
      <div className="glass-panel rounded-[28px] px-4 py-4">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-between text-left text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground hover:text-foreground"
        >
          <span>App Settings</span>
          {isExpanded ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>

        {isExpanded ? (
          <div className="mt-3 space-y-2">
            <label className="block">
              <span className="mb-2 block text-xs text-muted-foreground">
                Default Model
              </span>
              {useCustom ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={defaultModel}
                    onChange={(e) => onDefaultModelChange(e.target.value)}
                    placeholder="OpenRouter model ID"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-cyan-300/40 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setUseCustom(false);
                      onDefaultModelChange(normalizeModelId(null));
                    }}
                    className="text-xs text-sky-400 hover:underline"
                  >
                    Use known model
                  </button>
                </div>
              ) : (
                <select
                  value={effectiveModel}
                  onChange={handleSelectChange}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-2 text-xs text-foreground focus:border-cyan-300/40 focus:outline-none"
                >
                  {getKnownModels().map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.displayName}
                    </option>
                  ))}
                  <option value="custom">Custom...</option>
                </select>
              )}
            </label>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Context:</span>
                <span className="text-foreground">
                  {(metadata.contextWindow / 1000).toFixed(0)}K tokens
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reasoning:</span>
                <span
                  className={
                    metadata.supportsReasoning
                      ? "text-green-400"
                      : "text-muted-foreground"
                  }
                >
                  {metadata.supportsReasoning ? "Yes" : "No"}
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Default model for new conversations
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

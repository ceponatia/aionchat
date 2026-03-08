"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  PromptAssemblyResult,
  PromptPreviewRequestBody,
} from "@/lib/types";

interface UsePromptPreviewReturn {
  promptPreview: PromptAssemblyResult | null;
  promptPreviewDraft: string;
  promptPreviewError: string | null;
  isPromptPreviewLoading: boolean;
  loadPromptPreview: (
    conversationId: string,
    draftContent: string,
  ) => Promise<void>;
  clearPromptPreview: () => void;
}

export function usePromptPreview(
  activeConversationId: string | null,
): UsePromptPreviewReturn {
  const [promptPreview, setPromptPreview] =
    useState<PromptAssemblyResult | null>(null);
  const [promptPreviewDraft, setPromptPreviewDraft] = useState("");
  const [promptPreviewError, setPromptPreviewError] = useState<string | null>(
    null,
  );
  const [isPromptPreviewLoading, setIsPromptPreviewLoading] = useState(false);
  const activeConversationIdRef = useRef<string | null>(activeConversationId);
  const requestIdRef = useRef(0);

  const clearPromptPreview = useCallback(() => {
    requestIdRef.current += 1;
    setPromptPreview(null);
    setPromptPreviewDraft("");
    setPromptPreviewError(null);
    setIsPromptPreviewLoading(false);
  }, []);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
    if (!activeConversationId) {
      clearPromptPreview();
    }
  }, [activeConversationId, clearPromptPreview]);

  const loadPromptPreview = useCallback(
    async (conversationId: string, draftContent: string) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setIsPromptPreviewLoading(true);
      setPromptPreviewError(null);

      try {
        const body: PromptPreviewRequestBody = { content: draftContent };
        const response = await fetch(
          `/api/conversations/${conversationId}/prompt-preview`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          },
        );

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(payload?.error ?? "Unable to load prompt preview");
        }

        const preview = (await response.json()) as PromptAssemblyResult;
        if (
          requestIdRef.current !== requestId ||
          activeConversationIdRef.current !== conversationId
        ) {
          return;
        }

        setPromptPreview(preview);
        setPromptPreviewDraft(draftContent);
      } catch (error: unknown) {
        if (
          requestIdRef.current !== requestId ||
          activeConversationIdRef.current !== conversationId
        ) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Unable to load prompt preview";
        setPromptPreviewError(message);
      } finally {
        if (requestIdRef.current === requestId) {
          setIsPromptPreviewLoading(false);
        }
      }
    },
    [],
  );

  return {
    promptPreview,
    promptPreviewDraft,
    promptPreviewError,
    isPromptPreviewLoading,
    loadPromptPreview,
    clearPromptPreview,
  };
}

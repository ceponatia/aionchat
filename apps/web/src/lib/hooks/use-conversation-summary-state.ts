"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ConversationSummaryState } from "@/lib/types";

interface UseConversationSummaryStateReturn {
  summaryState: ConversationSummaryState | null;
  summaryError: string | null;
  isSummaryLoading: boolean;
  loadSummaryState: (conversationId: string) => Promise<void>;
  refreshConversationSummary: (conversationId: string) => Promise<void>;
  clearSummaryState: () => void;
}

// eslint-disable-next-line max-lines-per-function -- preserves request guards and refresh behavior from the existing page implementation
export function useConversationSummaryState(
  activeConversationId: string | null,
): UseConversationSummaryStateReturn {
  const [summaryState, setSummaryState] =
    useState<ConversationSummaryState | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const activeConversationIdRef = useRef<string | null>(activeConversationId);
  const summaryRequestIdRef = useRef(0);
  const isSummaryLoadingRef = useRef(false);

  const clearSummaryState = useCallback(() => {
    summaryRequestIdRef.current += 1;
    isSummaryLoadingRef.current = false;
    setSummaryState(null);
    setSummaryError(null);
    setIsSummaryLoading(false);
  }, []);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
    if (!activeConversationId) {
      clearSummaryState();
    }
  }, [activeConversationId, clearSummaryState]);

  const loadSummaryState = useCallback(async (conversationId: string) => {
    const requestId = summaryRequestIdRef.current + 1;
    summaryRequestIdRef.current = requestId;
    isSummaryLoadingRef.current = true;
    setIsSummaryLoading(true);
    setSummaryError(null);

    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/summary`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          payload?.error ?? "Unable to load conversation summary",
        );
      }

      const state = (await response.json()) as ConversationSummaryState;
      if (
        summaryRequestIdRef.current !== requestId ||
        activeConversationIdRef.current !== conversationId
      ) {
        return;
      }

      setSummaryState(state);
    } catch (error: unknown) {
      if (
        summaryRequestIdRef.current !== requestId ||
        activeConversationIdRef.current !== conversationId
      ) {
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : "Unable to load conversation summary";
      setSummaryError(message);
    } finally {
      if (summaryRequestIdRef.current === requestId) {
        isSummaryLoadingRef.current = false;
        setIsSummaryLoading(false);
      }
    }
  }, []);

  const refreshConversationSummary = useCallback(
    async (conversationId: string) => {
      if (isSummaryLoadingRef.current) {
        return;
      }

      isSummaryLoadingRef.current = true;
      setIsSummaryLoading(true);
      setSummaryError(null);

      try {
        const response = await fetch(
          `/api/conversations/${conversationId}/summary/refresh`,
          {
            method: "POST",
          },
        );

        if (!response.ok) {
          await loadSummaryState(conversationId);
          return;
        }

        await loadSummaryState(conversationId);
      } catch (error: unknown) {
        if (activeConversationIdRef.current === conversationId) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to refresh conversation summary";
          setSummaryError(message);
        }
      } finally {
        isSummaryLoadingRef.current = false;
        if (activeConversationIdRef.current === conversationId) {
          setIsSummaryLoading(false);
        }
      }
    },
    [loadSummaryState],
  );

  return {
    summaryState,
    summaryError,
    isSummaryLoading,
    loadSummaryState,
    refreshConversationSummary,
    clearSummaryState,
  };
}

"use client";

import { useCallback, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { ConversationMessage, PaginatedMessagesResponse } from "@/lib/types";

interface ApiErrorResponse {
  error?: string;
}

interface UseMessagesReturn {
  messages: ConversationMessage[];
  hasMore: boolean;
  isLoadingMessages: boolean;
  isLoadingMore: boolean;
  loadMessages: (conversationId: string) => Promise<void>;
  loadMore: () => Promise<void>;
  clearMessages: () => void;
  setMessages: Dispatch<SetStateAction<ConversationMessage[]>>;
}

async function parseOrThrow<T>(
  response: Response,
  fallback: string,
): Promise<T> {
  if (!response.ok) {
    const body = (await response
      .json()
      .catch(() => null)) as ApiErrorResponse | null;
    throw new Error(body?.error ?? fallback);
  }

  return (await response.json()) as T;
}

async function fetchPage(
  conversationId: string,
  before: string | null,
): Promise<PaginatedMessagesResponse> {
  const params = new URLSearchParams({ limit: "20" });
  if (before) {
    params.set("before", before);
  }

  const response = await fetch(
    `/api/conversations/${conversationId}/messages?${params.toString()}`,
    {
      cache: "no-store",
    },
  );

  return parseOrThrow<PaginatedMessagesResponse>(
    response,
    "Unable to load messages",
  );
}

export function useMessages(): UseMessagesReturn {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const activeConversationIdRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);

  const loadMessages = useCallback(async (conversationId: string) => {
    const requestId = ++requestIdRef.current;
    activeConversationIdRef.current = conversationId;
    setIsLoadingMessages(true);

    try {
      const page = await fetchPage(conversationId, null);
      if (requestId !== requestIdRef.current) return;

      setMessages(page.messages);
      setHasMore(page.hasMore);
      setNextCursor(page.nextCursor);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoadingMessages(false);
      }
    }
  }, []);

  const loadMore = useCallback(async () => {
    const conversationId = activeConversationIdRef.current;
    if (!conversationId || !nextCursor || isLoadingMore || isLoadingMessages) {
      return;
    }

    const requestId = requestIdRef.current;
    setIsLoadingMore(true);

    try {
      const page = await fetchPage(conversationId, nextCursor);
      if (
        requestId !== requestIdRef.current ||
        activeConversationIdRef.current !== conversationId
      ) {
        return;
      }

      setMessages((prev) => [...page.messages, ...prev]);
      setHasMore(page.hasMore);
      setNextCursor(page.nextCursor);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoadingMore(false);
      }
    }
  }, [isLoadingMessages, isLoadingMore, nextCursor]);

  const clearMessages = useCallback(() => {
    requestIdRef.current += 1;
    activeConversationIdRef.current = null;
    setMessages([]);
    setHasMore(false);
    setNextCursor(null);
    setIsLoadingMessages(false);
    setIsLoadingMore(false);
  }, []);

  return {
    messages,
    hasMore,
    isLoadingMessages,
    isLoadingMore,
    loadMessages,
    loadMore,
    clearMessages,
    setMessages,
  };
}

"use client";

import { useCallback, useState } from "react";

import type { CreateTagBody, TagItem, UpdateTagBody } from "@/lib/types";

interface ApiErrorResponse {
  error?: string;
}

interface UseTagsReturn {
  tags: TagItem[];
  isLoading: boolean;
  loadTags: () => Promise<void>;
  createTag: (body: CreateTagBody) => Promise<TagItem>;
  updateTag: (id: string, body: UpdateTagBody) => Promise<TagItem>;
  deleteTag: (id: string) => Promise<void>;
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

async function fetchTags(): Promise<TagItem[]> {
  const response = await fetch("/api/tags", { cache: "no-store" });
  return parseOrThrow<TagItem[]>(response, "Unable to load tags");
}

export function useTags(): UseTagsReturn {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadTags = useCallback(async () => {
    setIsLoading(true);
    try {
      setTags(await fetchTags());
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createTag = useCallback(async (body: CreateTagBody) => {
    const response = await fetch("/api/tags", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const tag = await parseOrThrow<TagItem>(response, "Unable to create tag");
    setTags(await fetchTags());
    return tag;
  }, []);

  const updateTag = useCallback(async (id: string, body: UpdateTagBody) => {
    const response = await fetch(`/api/tags/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const tag = await parseOrThrow<TagItem>(response, "Unable to update tag");
    setTags(await fetchTags());
    return tag;
  }, []);

  const deleteTag = useCallback(async (id: string) => {
    const response = await fetch(`/api/tags/${id}`, {
      method: "DELETE",
    });
    await parseOrThrow<{ ok: boolean }>(response, "Unable to delete tag");
    setTags(await fetchTags());
  }, []);

  return {
    tags,
    isLoading,
    loadTags,
    createTag,
    updateTag,
    deleteTag,
  };
}
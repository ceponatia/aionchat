"use client";

import { useCallback, useState } from "react";

import type {
  CreateLoreEntryBody,
  LoreEntryDetail,
  LoreEntryListItem,
  UpdateLoreEntryBody,
} from "@/lib/types";

interface ApiErrorResponse {
  error?: string;
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

interface UseLoreEntriesReturn {
  loreEntries: LoreEntryListItem[];
  isLoading: boolean;
  loadLoreEntries: () => Promise<void>;
  getLoreEntry: (id: string) => Promise<LoreEntryDetail>;
  createLoreEntry: (data: CreateLoreEntryBody) => Promise<string>;
  updateLoreEntry: (id: string, data: UpdateLoreEntryBody) => Promise<void>;
  deleteLoreEntry: (id: string) => Promise<void>;
}

async function fetchLoreEntries(): Promise<LoreEntryListItem[]> {
  const response = await fetch("/api/lore-entries", { cache: "no-store" });
  return parseOrThrow<LoreEntryListItem[]>(
    response,
    "Unable to load lore entries",
  );
}

export function useLoreEntries(): UseLoreEntriesReturn {
  const [loreEntries, setLoreEntries] = useState<LoreEntryListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadLoreEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      setLoreEntries(await fetchLoreEntries());
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getLoreEntry = useCallback(async (id: string) => {
    const response = await fetch(`/api/lore-entries/${id}`, {
      cache: "no-store",
    });
    return parseOrThrow<LoreEntryDetail>(response, "Unable to load lore entry");
  }, []);

  const createLoreEntry = useCallback(async (data: CreateLoreEntryBody) => {
    const response = await fetch("/api/lore-entries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    const created = await parseOrThrow<LoreEntryDetail>(
      response,
      "Unable to create lore entry",
    );
    setLoreEntries(await fetchLoreEntries());
    return created.id;
  }, []);

  const updateLoreEntry = useCallback(
    async (id: string, data: UpdateLoreEntryBody) => {
      const response = await fetch(`/api/lore-entries/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      await parseOrThrow<LoreEntryDetail>(response, "Unable to update lore entry");
      setLoreEntries(await fetchLoreEntries());
    },
    [],
  );

  const deleteLoreEntry = useCallback(async (id: string) => {
    const response = await fetch(`/api/lore-entries/${id}`, {
      method: "DELETE",
    });
    await parseOrThrow<{ ok: boolean }>(response, "Unable to delete lore entry");
    setLoreEntries(await fetchLoreEntries());
  }, []);

  return {
    loreEntries,
    isLoading,
    loadLoreEntries,
    getLoreEntry,
    createLoreEntry,
    updateLoreEntry,
    deleteLoreEntry,
  };
}
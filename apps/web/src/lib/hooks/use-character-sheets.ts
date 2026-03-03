"use client";

import { useCallback, useState } from "react";

import type {
  CharacterSheetListItem,
  CharacterSheetDetail,
  CreateCharacterSheetBody,
  UpdateCharacterSheetBody,
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

interface UseCharacterSheetsReturn {
  characterSheets: CharacterSheetListItem[];
  isLoading: boolean;
  loadCharacterSheets: () => Promise<void>;
  getCharacterSheet: (id: string) => Promise<CharacterSheetDetail>;
  createCharacterSheet: (data: CreateCharacterSheetBody) => Promise<string>;
  updateCharacterSheet: (
    id: string,
    data: UpdateCharacterSheetBody,
  ) => Promise<void>;
  deleteCharacterSheet: (id: string) => Promise<void>;
}

async function fetchCharacterSheets(): Promise<CharacterSheetListItem[]> {
  const response = await fetch("/api/character-sheets", { cache: "no-store" });
  return parseOrThrow<CharacterSheetListItem[]>(
    response,
    "Unable to load character sheets",
  );
}

export function useCharacterSheets(): UseCharacterSheetsReturn {
  const [characterSheets, setCharacterSheets] = useState<
    CharacterSheetListItem[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadCharacterSheets = useCallback(async () => {
    setIsLoading(true);
    try {
      setCharacterSheets(await fetchCharacterSheets());
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getCharacterSheet = useCallback(async (id: string) => {
    const response = await fetch(`/api/character-sheets/${id}`, {
      cache: "no-store",
    });
    return parseOrThrow<CharacterSheetDetail>(
      response,
      "Unable to load character sheet",
    );
  }, []);

  const createCharacterSheet = useCallback(
    async (data: CreateCharacterSheetBody) => {
      const response = await fetch("/api/character-sheets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const created = await parseOrThrow<CharacterSheetDetail>(
        response,
        "Unable to create character sheet",
      );
      setCharacterSheets(await fetchCharacterSheets());
      return created.id;
    },
    [],
  );

  const updateCharacterSheet = useCallback(
    async (id: string, data: UpdateCharacterSheetBody) => {
      const response = await fetch(`/api/character-sheets/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      await parseOrThrow<CharacterSheetDetail>(
        response,
        "Unable to update character sheet",
      );
      setCharacterSheets(await fetchCharacterSheets());
    },
    [],
  );

  const deleteCharacterSheet = useCallback(async (id: string) => {
    const response = await fetch(`/api/character-sheets/${id}`, {
      method: "DELETE",
    });
    await parseOrThrow<{ ok: boolean }>(
      response,
      "Unable to delete character sheet",
    );
    setCharacterSheets(await fetchCharacterSheets());
  }, []);

  return {
    characterSheets,
    isLoading,
    loadCharacterSheets,
    getCharacterSheet,
    createCharacterSheet,
    updateCharacterSheet,
    deleteCharacterSheet,
  };
}

"use client";

import { createContext, useContext } from "react";

export interface AppPreferencesContextValue {
  defaultModel: string;
  setDefaultModel: (modelId: string) => void;
  isDefaultModelHydrated: boolean;
}

export const AppPreferencesContext =
  createContext<AppPreferencesContextValue | null>(null);

export function useAppPreferences(): AppPreferencesContextValue {
  const context = useContext(AppPreferencesContext);
  if (!context) {
    throw new Error(
      "useAppPreferences must be used within AppPreferencesProvider",
    );
  }

  return context;
}

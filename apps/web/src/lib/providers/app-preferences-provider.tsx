"use client";

import { useMemo, type ReactNode } from "react";

import { useDefaultModel } from "@/lib/hooks/use-default-model";
import {
  AppPreferencesContext,
  type AppPreferencesContextValue,
} from "@/lib/providers/app-preferences-context";

export { useAppPreferences } from "@/lib/providers/app-preferences-context";

export function AppPreferencesProvider({ children }: { children: ReactNode }) {
  const { defaultModel, setDefaultModel, isHydrated } = useDefaultModel();

  const value = useMemo<AppPreferencesContextValue>(
    () => ({
      defaultModel,
      setDefaultModel,
      isDefaultModelHydrated: isHydrated,
    }),
    [defaultModel, isHydrated, setDefaultModel],
  );

  return (
    <AppPreferencesContext.Provider value={value}>
      {children}
    </AppPreferencesContext.Provider>
  );
}

"use client";

import type { ReactNode } from "react";

import { useAppPreferences } from "@/lib/providers/app-preferences-provider";
import { ConversationContext } from "@/lib/providers/conversation-context";
import { useConversationProviderValue } from "@/lib/providers/use-conversation-provider-value";

export { useConversation } from "@/lib/providers/conversation-context";
export function ConversationProvider({ children }: { children: ReactNode }) {
  const { defaultModel, isDefaultModelHydrated } = useAppPreferences();
  const value = useConversationProviderValue({
    defaultModel,
    isDefaultModelHydrated,
  });

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
}

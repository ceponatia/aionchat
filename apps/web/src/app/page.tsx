"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ChatInput } from "@/components/chat/chat-input";
import { ChatShell } from "@/components/chat/chat-shell";
import { MessageList } from "@/components/chat/message-list";
import { Sidebar } from "@/components/sidebar/sidebar";
import { Button } from "@/components/ui/button";
import { useConversations } from "@/lib/hooks/use-conversations";
import type { AionReasoningDetail, ChatResponseBody } from "@/lib/types";

interface UIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoningDetails?: AionReasoningDetail[] | null;
  createdAt: string;
}

interface ApiErrorResponse {
  error?: string;
}

function buildUserMessage(content: string): UIMessage {
  return {
    id: crypto.randomUUID(),
    role: "user",
    content,
    reasoningDetails: null,
    createdAt: new Date().toISOString(),
  };
}

function generateTitle(firstUserMessage: string): string {
  const trimmed = firstUserMessage.trim();
  if (trimmed.length <= 60) {
    return trimmed;
  }

  const truncated = trimmed.slice(0, 60);
  const lastSpace = truncated.lastIndexOf(" ");
  return lastSpace > 20
    ? `${truncated.slice(0, lastSpace)}...`
    : `${truncated}...`;
}

export default function HomePage() {
  const {
    conversations,
    activeId,
    activeMessages,
    activeTitle,
    isLoading: isConversationLoading,
    isHydrated,
    createConversation,
    selectConversation,
    loadConversations,
    renameConversation,
    deleteConversation,
    clearActiveConversation,
  } = useConversations();

  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setMessages(
      activeMessages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        reasoningDetails: message.reasoningDetails,
        createdAt: message.createdAt,
      })),
    );
  }, [activeMessages]);

  async function handleSend(): Promise<void> {
    const content = input.trim();
    if (!content || isLoading) {
      return;
    }

    setIsLoading(true);
    setMessages((previous) => [...previous, buildUserMessage(content)]);
    setInput("");

    const shouldAutotitle = !activeId;

    try {
      const activeConversationId =
        activeId ?? (await createConversation(undefined, { select: false }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          conversationId: activeConversationId,
          content,
        }),
      });

      if (!response.ok) {
        const body = (await response
          .json()
          .catch(() => null)) as ApiErrorResponse | null;
        throw new Error(body?.error ?? "Unable to send message");
      }

      const body = (await response.json()) as ChatResponseBody;
      setMessages((previous) => [
        ...previous,
        {
          id: body.message.id,
          role: body.message.role,
          content: body.message.content,
          reasoningDetails: body.message.reasoningDetails,
          createdAt: body.message.createdAt,
        },
      ]);

      if (shouldAutotitle) {
        await renameConversation(activeConversationId, generateTitle(content));
      }

      await loadConversations();
      await selectConversation(activeConversationId);
    } catch (err: unknown) {
      const fallbackMessage = "Message failed. Please try again.";
      const message = err instanceof Error ? err.message : fallbackMessage;
      toast.error("Failed to send message", {
        description: message,
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleNewChat(): void {
    setInput("");

    void (async () => {
      try {
        await createConversation();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Unable to create conversation";
        toast.error("Failed to create conversation", {
          description: message,
          duration: 5000,
        });
      } finally {
        setIsSidebarOpen(false);
      }
    })();
  }

  function handleSelectConversation(id: string): void {
    void (async () => {
      try {
        await selectConversation(id);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Unable to load conversation";
        toast.error("Could not load conversation", {
          description: message,
          duration: 5000,
        });
      } finally {
        setIsSidebarOpen(false);
      }
    })();
  }

  function handleRenameConversation(id: string, title: string): Promise<void> {
    return renameConversation(id, title).catch((err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Unable to rename conversation";
      toast.error("Failed to rename conversation", {
        description: message,
        duration: 5000,
      });
    });
  }

  function handleDeleteConversation(id: string): Promise<void> {
    return deleteConversation(id)
      .then(() => {
        if (id === activeId) {
          setMessages([]);
        }
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Unable to delete conversation";
        toast.error("Failed to delete conversation", {
          description: message,
          duration: 5000,
        });
      });
  }

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent): void {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
        const target = event.target;
        let isEditable = false;

        if (target instanceof HTMLElement) {
          const tagName = target.tagName;
          isEditable =
            tagName === "INPUT" ||
            tagName === "TEXTAREA" ||
            target.isContentEditable;
        } else if (document.activeElement instanceof HTMLElement) {
          const activeElement = document.activeElement;
          const tagName = activeElement.tagName;
          isEditable =
            tagName === "INPUT" ||
            tagName === "TEXTAREA" ||
            activeElement.isContentEditable;
        }
        if (!isEditable) {
          event.preventDefault();
          handleNewChat();
        }
      }

      if (event.key === "Escape") {
        setIsSidebarOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, []);

  return (
    <ChatShell
      sidebar={
        <Sidebar
          onNewChat={handleNewChat}
          conversations={conversations}
          activeId={activeId}
          isLoading={isConversationLoading || !isHydrated}
          onSelectConversation={handleSelectConversation}
          onRenameConversation={handleRenameConversation}
          onDeleteConversation={handleDeleteConversation}
        />
      }
      isSidebarOpen={isSidebarOpen}
      onCloseSidebar={() => setIsSidebarOpen(false)}
    >
      <header className="safe-area-pt border-b border-border bg-panel px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              PH05 Reasoning UX
            </p>
            <h2 className="text-sm font-medium text-foreground sm:text-base">
              {activeTitle ?? "Aion-2.0 Conversation"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {activeId ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearActiveConversation();
                  setMessages([]);
                }}
              >
                Clear Active
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Toggle sidebar"
            >
              Menu
            </Button>
          </div>
        </div>
      </header>

      <MessageList
        messages={messages}
        isLoading={isLoading}
        hasAnyConversations={conversations.length > 0}
      />

      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        isLoading={isLoading}
      />
    </ChatShell>
  );
}

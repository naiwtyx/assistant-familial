"use client";

import { Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMyMembership } from "@/features/family/components/family-provider";
import { cn } from "@/lib/utils";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Qu'est-ce qu'il me manque pour des pâtes carbonara ?",
  "Ajoute du lait et des œufs à la liste de courses",
  "Qu'est-ce que j'ai dans le frigo ?",
];

export function AssistantView() {
  const { canUseAi } = useMyMembership();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (!canUseAi) {
    return (
      <main className="mx-auto flex min-h-[calc(100dvh-8.5rem)] w-full max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
        <Sparkles className="text-muted-foreground size-8 opacity-40" />
        <p className="text-muted-foreground text-sm">
          L&apos;accès à l&apos;assistant a été désactivé par un parent.
        </p>
      </main>
    );
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = (await response.json()) as { text?: string; error?: string };

      if (!response.ok || data.error) {
        throw new Error(data.error ?? "L'assistant n'a pas pu répondre.");
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.text ?? "" }]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
      // On retire le message utilisateur resté sans réponse.
      setMessages((prev) => prev.slice(0, -1));
      setInput(trimmed);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-8.5rem)] w-full max-w-md flex-col p-4">
      <header className="mb-3">
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <Sparkles className="text-primary size-5" />
          Assistant
        </h1>
        <p className="text-muted-foreground text-sm">
          Gère tes courses, ton inventaire et tes recettes en langage naturel.
        </p>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto pb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-2 pt-6">
            <p className="text-muted-foreground text-center text-sm">Essaie par exemple :</p>
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => send(suggestion)}
                className="bg-muted/50 hover:bg-muted rounded-xl border px-3 py-2 text-left text-sm transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                {message.content}
              </div>
            </div>
          ))
        )}

        {isLoading ? (
          <div className="flex justify-start">
            <div className="bg-muted text-muted-foreground rounded-2xl px-3.5 py-2 text-sm">
              L&apos;assistant réfléchit…
            </div>
          </div>
        ) : null}

        <div ref={endRef} />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
        className="bg-background sticky bottom-0 flex gap-2 pt-2"
      >
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Écris ta demande…"
          disabled={isLoading}
          className="flex-1"
          autoComplete="off"
        />
        <Button type="submit" size="icon" disabled={isLoading || !input.trim()} aria-label="Envoyer">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}

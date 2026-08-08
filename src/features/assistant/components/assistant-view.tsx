"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Send, Sparkles, Undo2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ASK_BAR_STORAGE_KEY } from "@/features/assistant/components/ask-bar";
import {
  executeActions,
  sendAssistantMessage,
  undoActions,
  type ChatMessage,
  type ExecutedAction,
  type ProposedAction,
} from "@/features/assistant/services/assistant.service";
import { useMyMembership } from "@/features/family/components/family-provider";
import { getErrorMessage } from "@/lib/get-error-message";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

// Exemples orientés ACTION (section 11) : montrent ce que l'assistant sait faire.
const SUGGESTIONS = [
  "Que puis-je cuisiner ce soir ?",
  "Ajoute du lait et des œufs aux courses",
  "Quelles tâches sont en retard ?",
  "Planifie le dîner de demain",
];

type UiMessage = {
  role: "user" | "assistant";
  content: string;
  actions?: ProposedAction[]; // proposées, en attente de confirmation
  executed?: ExecutedAction[]; // après confirmation
  dismissed?: boolean;
  busy?: boolean;
  undone?: boolean;
};

export function AssistantView() {
  const { canUseAi } = useMyMembership();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    const prefill = window.sessionStorage.getItem(ASK_BAR_STORAGE_KEY);
    if (prefill) {
      window.sessionStorage.removeItem(ASK_BAR_STORAGE_KEY);
      setInput(prefill);
    }
  }, []);

  function patchMessage(index: number, patch: Partial<UiMessage>) {
    setMessages((prev) => prev.map((message, i) => (i === index ? { ...message, ...patch } : message)));
  }

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

    const history: ChatMessage[] = [
      ...messages.map((m): ChatMessage => ({ role: m.role, content: m.content })),
      { role: "user", content: trimmed },
    ];
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setIsLoading(true);

    try {
      const reply = await sendAssistantMessage(history);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: reply.text,
          actions: reply.actions.length > 0 ? reply.actions : undefined,
        },
      ]);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setMessages((prev) => prev.slice(0, -1));
      setInput(trimmed);
    } finally {
      setIsLoading(false);
    }
  }

  async function confirm(index: number, actions: ProposedAction[]) {
    patchMessage(index, { busy: true });
    try {
      const results = await executeActions(actions);
      const ok = results.filter((r) => r.ok).length;
      const failed = results.length - ok;
      haptic(ok > 0 ? "success" : "warning");
      patchMessage(index, { busy: false, actions: undefined, executed: results });
      // L'exécution se fait côté serveur : on rafraîchit les caches pour que
      // les onglets (Courses, Tâches, Recettes…) reflètent le changement tout
      // de suite, sans dépendre du temps réel.
      void queryClient.invalidateQueries();
      if (ok > 0) toast.success(ok > 1 ? `${ok} actions effectuées` : "C'est fait");
      if (failed > 0) toast.error(`${failed} action(s) en échec`);
    } catch (error) {
      patchMessage(index, { busy: false });
      toast.error(getErrorMessage(error));
    }
  }

  async function undo(index: number, executed: ExecutedAction[]) {
    const specs = executed.filter((r) => r.ok && r.undo).map((r) => r.undo);
    if (specs.length === 0) return;
    patchMessage(index, { busy: true });
    try {
      await undoActions(specs);
      haptic("light");
      patchMessage(index, { busy: false, undone: true });
      void queryClient.invalidateQueries();
      toast.success("Annulé");
    } catch (error) {
      patchMessage(index, { busy: false });
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-8.5rem)] w-full max-w-md flex-col p-4">
      <header className="mb-3">
        <h1 className="font-heading flex items-center gap-2 text-xl font-semibold tracking-tight">
          <Sparkles className="text-primary size-5" strokeWidth={1.75} />
          Assistant
        </h1>
        <p className="text-muted-foreground text-sm">
          Demande, il s&apos;occupe de ta maison — courses, repas, tâches, agenda.
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
                className="bg-card hover:bg-accent/50 shadow-soft rounded-xl px-3.5 py-2.5 text-left text-sm transition-all active:scale-[0.99]"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className="motion-in flex flex-col gap-2">
              {message.content ? (
                <div className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
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
              ) : null}

              {/* Carte de proposition : liste des actions + confirmation. */}
              {message.actions && !message.dismissed ? (
                <ActionProposal
                  actions={message.actions}
                  busy={message.busy ?? false}
                  onConfirm={() => confirm(index, message.actions!)}
                  onDismiss={() => patchMessage(index, { dismissed: true })}
                />
              ) : null}

              {/* Carte de feedback : ce qui a été fait + Annuler. */}
              {message.executed ? (
                <ActionFeedback
                  executed={message.executed}
                  undone={message.undone ?? false}
                  busy={message.busy ?? false}
                  onUndo={() => undo(index, message.executed!)}
                />
              ) : null}
            </div>
          ))
        )}

        {isLoading ? (
          <div className="flex justify-start">
            <div className="bg-muted text-muted-foreground flex items-center gap-2 rounded-2xl px-3.5 py-2 text-sm">
              <Loader2 className="size-3.5 animate-spin" />
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

function ActionProposal({
  actions,
  busy,
  onConfirm,
  onDismiss,
}: {
  actions: ProposedAction[];
  busy: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="bg-ai-gradient shadow-ai flex flex-col gap-3 rounded-2xl p-3.5">
      <div className="flex items-center gap-2">
        <Sparkles className="text-primary size-3.5" strokeWidth={2} />
        <span className="text-primary text-[11px] font-semibold tracking-[0.08em] uppercase">
          {actions.length > 1 ? `${actions.length} actions proposées` : "Action proposée"}
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {actions.map((action) => (
          <li key={action.id} className="flex items-start gap-2 text-[13.5px]">
            <span className="text-primary mt-1.5 size-1.5 shrink-0 rounded-full bg-current" />
            {action.label}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button
          onClick={onConfirm}
          disabled={busy}
          className="h-9 flex-[2] rounded-xl transition-transform active:scale-[0.98]"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" strokeWidth={2} />}
          {actions.length > 1 ? `Confirmer les ${actions.length}` : "Confirmer"}
        </Button>
        <Button
          variant="ghost"
          onClick={onDismiss}
          disabled={busy}
          className="h-9 flex-1 rounded-xl"
        >
          Ignorer
        </Button>
      </div>
    </div>
  );
}

function ActionFeedback({
  executed,
  undone,
  busy,
  onUndo,
}: {
  executed: ExecutedAction[];
  undone: boolean;
  busy: boolean;
  onUndo: () => void;
}) {
  const canUndo = !undone && executed.some((r) => r.ok && r.undo);
  return (
    <div className="bg-card shadow-soft flex flex-col gap-2 rounded-2xl p-3.5">
      <ul className="flex flex-col gap-1.5">
        {executed.map((result) => (
          <li key={result.id} className="flex items-start gap-2 text-[13.5px]">
            {result.ok ? (
              <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Check className="size-2.5" strokeWidth={3} />
              </span>
            ) : (
              <span className="text-destructive bg-destructive/10 mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full">
                <X className="size-2.5" strokeWidth={3} />
              </span>
            )}
            <span className={cn(undone && "text-muted-foreground line-through")}>{result.summary}</span>
          </li>
        ))}
      </ul>
      {undone ? (
        <p className="text-muted-foreground text-xs">Annulé.</p>
      ) : canUndo ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={busy}
          className="text-muted-foreground hover:text-foreground -ml-1 self-start"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Undo2 className="size-3.5" strokeWidth={1.75} />}
          Annuler
        </Button>
      ) : null}
    </div>
  );
}

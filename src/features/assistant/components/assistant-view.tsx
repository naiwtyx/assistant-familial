"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Send, ShoppingCart, Sparkles, Undo2, X } from "lucide-react";
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
  "Organise ma semaine",
  "Que puis-je cuisiner ce soir ?",
  "Ajoute du lait et des œufs aux courses",
  "Quelles tâches sont en retard ?",
];

type UiMessage = {
  role: "user" | "assistant";
  content: string;
  actions?: ProposedAction[]; // proposées, en attente de confirmation
  executed?: ExecutedAction[]; // après confirmation
  dismissed?: boolean;
  busy?: boolean;
  undone?: boolean;
  followupDone?: boolean; // ingrédients manquants ajoutés aux courses
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

  async function addFollowup(index: number, actions: ProposedAction[]) {
    patchMessage(index, { busy: true });
    try {
      const results = await executeActions(actions);
      const ok = results.filter((r) => r.ok).length;
      haptic(ok > 0 ? "success" : "warning");
      patchMessage(index, { busy: false, followupDone: true });
      void queryClient.invalidateQueries();
      if (ok > 0) toast.success(ok > 1 ? `${ok} articles ajoutés aux courses` : "Ajouté aux courses");
    } catch (error) {
      patchMessage(index, { busy: false });
      toast.error(getErrorMessage(error));
    }
  }

  return (
    // Hauteur bornée = viewport - encoche - réserve de la barre de nav (pb-24 du
    // layout). Ainsi les messages défilent DANS la zone du milieu et la barre de
    // saisie se pose juste au-dessus de la navigation (plus derrière).
    <div className="mx-auto flex h-[calc(100dvh-env(safe-area-inset-top)-6rem)] w-full max-w-md flex-col px-4 pt-3">
      <header className="mb-2 shrink-0">
        <h1 className="font-heading flex items-center gap-2 text-xl font-semibold tracking-tight">
          <Sparkles className="text-primary size-5" strokeWidth={1.75} />
          Assistant
        </h1>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto pb-3">
        {messages.length === 0 ? (
          // État vide centré et invitant (plutôt qu'une liste posée en haut).
          <div className="flex h-full flex-col items-center justify-center gap-5 px-2 text-center">
            <div className="bg-ai-gradient shadow-ai flex size-14 items-center justify-center rounded-3xl">
              <Sparkles className="text-primary size-7" strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-heading text-[17px] font-semibold">Comment puis-je aider ?</p>
              <p className="text-muted-foreground mt-1 text-sm text-balance">
                Demande en langage naturel — je m&apos;occupe des courses, repas, tâches et de
                l&apos;agenda.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => send(suggestion)}
                  className="bg-card hover:bg-accent/50 shadow-soft flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-[13.5px] transition-all active:scale-[0.99]"
                >
                  <Sparkles className="text-primary/70 size-3.5 shrink-0" strokeWidth={2} />
                  {suggestion}
                </button>
              ))}
            </div>
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

              {/* Carte de feedback : ce qui a été fait + Annuler + suite éventuelle. */}
              {message.executed ? (
                <ActionFeedback
                  executed={message.executed}
                  undone={message.undone ?? false}
                  busy={message.busy ?? false}
                  followupDone={message.followupDone ?? false}
                  onUndo={() => undo(index, message.executed!)}
                  onFollowup={(actions) => addFollowup(index, actions)}
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
        className="border-border/50 bg-background flex shrink-0 items-center gap-2 border-t pt-3 pb-3"
      >
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Écris ta demande…"
          disabled={isLoading}
          className="h-11 flex-1 rounded-xl"
          autoComplete="off"
        />
        <Button
          type="submit"
          size="icon"
          disabled={isLoading || !input.trim()}
          aria-label="Envoyer"
          className="size-11 shrink-0 rounded-xl transition-transform active:scale-95"
        >
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
      {actions.length === 1 && actions[0]!.type === "plan_week" ? (
        <WeekGrid action={actions[0]!} />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {actions.map((action) => (
            <li key={action.id} className="flex items-start gap-2 text-[13.5px]">
              <span className="text-primary mt-1.5 size-1.5 shrink-0 rounded-full bg-current" />
              {action.label}
            </li>
          ))}
        </ul>
      )}
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
  followupDone,
  onUndo,
  onFollowup,
}: {
  executed: ExecutedAction[];
  undone: boolean;
  busy: boolean;
  followupDone: boolean;
  onUndo: () => void;
  onFollowup: (actions: ProposedAction[]) => void;
}) {
  const canUndo = !undone && executed.some((r) => r.ok && r.undo);
  const followup = executed.flatMap((r) => r.followup ?? []);
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

      {/* Suite proposée : ajouter les ingrédients manquants aux courses. */}
      {!undone && !followupDone && followup.length > 0 ? (
        <Button
          onClick={() => onFollowup(followup)}
          disabled={busy}
          variant="outline"
          size="sm"
          className="mt-1 self-start rounded-full"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <ShoppingCart className="size-3.5" strokeWidth={1.75} />}
          Ajouter {followup.length} ingrédient{followup.length > 1 ? "s" : ""} manquant
          {followup.length > 1 ? "s" : ""} aux courses
        </Button>
      ) : null}
      {followupDone ? (
        <p className="text-emerald-600 dark:text-emerald-400 text-xs">✓ Ingrédients ajoutés aux courses.</p>
      ) : null}

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

/** Grille de la semaine proposée (7 jours × midi/soir). */
function WeekGrid({ action }: { action: ProposedAction }) {
  const slots = Array.isArray(action.params.slots)
    ? (action.params.slots as { date: string; slot: "midi" | "soir"; recipeName: string }[])
    : [];
  const byDate = new Map<string, { midi?: string; soir?: string }>();
  for (const s of slots) {
    const day = byDate.get(s.date) ?? {};
    if (s.slot === "midi") day.midi = s.recipeName;
    else day.soir = s.recipeName;
    byDate.set(s.date, day);
  }
  const missing = Array.isArray(action.params.missing) ? action.params.missing.length : 0;

  return (
    <div className="flex flex-col gap-1.5">
      {[...byDate.entries()].map(([date, day]) => (
        <div key={date} className="flex items-baseline gap-2 text-[13px]">
          <span className="text-muted-foreground w-16 shrink-0 text-[11px] font-medium capitalize">
            {new Date(`${date}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })}
          </span>
          <span className="min-w-0 flex-1 truncate">
            {day.midi ?? "—"}
            <span className="text-muted-foreground/50 mx-1.5">·</span>
            {day.soir ?? "—"}
          </span>
        </div>
      ))}
      {missing > 0 ? (
        <p className="text-muted-foreground mt-1 text-xs">
          {missing} ingrédient{missing > 1 ? "s" : ""} manquant{missing > 1 ? "s" : ""} — tu pourras
          les ajouter aux courses après.
        </p>
      ) : null}
    </div>
  );
}

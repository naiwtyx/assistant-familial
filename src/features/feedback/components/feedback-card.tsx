"use client";

import { Bug, Lightbulb, MessageSquarePlus, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

import { useSubmitFeedback } from "../hooks/use-feedback";
import { collectFeedbackContext, type FeedbackKind } from "../services/feedback.service";

const KINDS: { value: FeedbackKind; label: string; icon: typeof Bug; placeholder: string }[] = [
  {
    value: "bug",
    label: "Bug",
    icon: Bug,
    placeholder: "Qu'est-ce qui n'a pas marché ? Sur quel écran ?",
  },
  {
    value: "idea",
    label: "Idée",
    icon: Lightbulb,
    placeholder: "Une fonctionnalité ou une amélioration que tu aimerais…",
  },
  {
    value: "other",
    label: "Autre",
    icon: MessageSquarePlus,
    placeholder: "Dis-nous tout — ce que tu aimes, ce qui te gêne…",
  },
];

/**
 * Carte « Aide & retours » des Réglages : ouvre un dialogue pour signaler un
 * bug ou partager une idée. Le contexte technique (page, appareil) est joint
 * automatiquement. Discret par choix : on ne sollicite jamais l'utilisateur.
 */
export function FeedbackCard({ familyId }: { familyId: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [message, setMessage] = useState("");
  const submit = useSubmitFeedback();

  const placeholder = KINDS.find((k) => k.value === kind)?.placeholder ?? "";

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = message.trim();
    if (trimmed.length < 3) {
      toast.error("Ajoute un petit message avant d'envoyer.");
      return;
    }
    submit.mutate(
      { kind, message: trimmed, familyId, context: collectFeedbackContext() },
      {
        onSuccess: () => {
          haptic("success");
          toast.success("Merci ! Ton retour a bien été envoyé.");
          setMessage("");
          setOpen(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group bg-card shadow-soft flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-all active:scale-[0.99]"
      >
        <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
          <MessageSquarePlus className="size-[18px]" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium">Donner un avis · signaler un bug</p>
          <p className="text-muted-foreground text-xs">
            L&apos;app est en test — ton retour aide vraiment à l&apos;améliorer
          </p>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ton retour</DialogTitle>
            <DialogDescription>
              Bug, idée ou remarque : tout nous intéresse. On joint automatiquement l&apos;écran
              où tu es pour t&apos;aider plus vite.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid grid-cols-3 gap-2">
              {KINDS.map((option) => {
                const Icon = option.icon;
                const selected = option.value === kind;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setKind(option.value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-medium transition-all active:scale-95",
                      selected
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "text-muted-foreground border-border hover:bg-accent/40",
                    )}
                    aria-pressed={selected}
                  >
                    <Icon className="size-4" strokeWidth={1.75} />
                    {option.label}
                  </button>
                );
              })}
            </div>

            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={placeholder}
              rows={5}
              maxLength={2000}
              autoFocus
              className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 min-h-28 w-full resize-none rounded-xl border bg-transparent px-3 py-2.5 text-[15px] outline-none transition-colors focus-visible:ring-3 dark:bg-input/30"
            />

            {/* Barre d'action collée en bas : reste au-dessus du clavier iOS. */}
            <div className="sticky bottom-0 -mx-5 -mb-5 flex gap-2 border-t bg-popover/95 px-5 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button type="submit" disabled={submit.isPending} className="flex-[2]">
                <Send className="size-4" strokeWidth={1.75} />
                {submit.isPending ? "Envoi…" : "Envoyer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

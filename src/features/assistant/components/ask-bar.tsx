"use client";

import { ArrowUpRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { cn } from "@/lib/utils";

const PLACEHOLDERS = [
  "Qu'est-ce qu'il me manque pour des pâtes carbonara ?",
  "Planifie ma semaine de repas",
  "Ajoute du lait et des œufs aux courses",
  "Quelles tâches sont en retard ?",
  "Qu'est-ce qui périme bientôt ?",
];

export const ASK_BAR_STORAGE_KEY = "assistant:prefill";

/**
 * Barre "Demandez quelque chose…" — présente sur les pages clés pour rendre
 * l'assistant IA omniprésent sans surcharger l'écran. Cliquer redirige vers
 * /assistant en pré-remplissant la question via sessionStorage.
 */
export function AskBar({ className }: { className?: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0]);

  useEffect(() => {
    // Placeholder qui tourne toutes les 4 secondes -> subtile animation "vivante".
    let index = 0;
    const id = window.setInterval(() => {
      index = (index + 1) % PLACEHOLDERS.length;
      setPlaceholder(PLACEHOLDERS[index]);
    }, 4000);
    return () => window.clearInterval(id);
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      window.sessionStorage.setItem(ASK_BAR_STORAGE_KEY, trimmed);
    }
    router.push("/assistant");
  }

  return (
    <form
      onSubmit={submit}
      className={cn(
        "group relative flex items-center gap-2 rounded-2xl border border-transparent bg-ai-gradient p-2 pl-3 shadow-ai transition-all",
        "focus-within:border-primary/30 focus-within:shadow-elevated",
        className,
      )}
    >
      <Sparkles
        className="text-primary size-4 shrink-0 transition-transform group-focus-within:scale-110"
        aria-hidden
      />
      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className="placeholder:text-muted-foreground/80 flex-1 bg-transparent text-sm outline-none placeholder:transition-opacity"
        aria-label="Demandez quelque chose à l'assistant"
      />
      <button
        type="submit"
        aria-label="Envoyer à l'assistant"
        className="bg-primary text-primary-foreground hover:bg-primary/90 flex size-8 shrink-0 items-center justify-center rounded-xl transition-all active:scale-95"
      >
        <ArrowUpRight className="size-4" />
      </button>
    </form>
  );
}

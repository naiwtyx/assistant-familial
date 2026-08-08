"use client";

import { Calendar, Clock } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Champs date/heure fiables sur iOS. Problème : `<input type="date">` natif
 * rend un champ quasi vide sur iOS Safari (texte du format peu/pas visible),
 * ce qui donne des "boîtes fantômes". Solution : on affiche NOTRE propre
 * contenu (icône + valeur formatée ou placeholder) et on superpose le vrai
 * input natif transparent par-dessus — le tap ouvre donc le sélecteur natif
 * iOS/Android, mais l'apparence est 100 % sous notre contrôle.
 */

function formatDateDisplay(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}

const fieldShell =
  "relative flex h-11 w-full items-center gap-2 rounded-lg border border-input bg-muted/40 px-3 text-[15px] transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50";

export function DateField({
  value,
  onChange,
  min,
  placeholder = "Choisir une date",
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  placeholder?: string;
  ariaLabel?: string;
}) {
  return (
    <div className={fieldShell}>
      <Calendar className="text-muted-foreground size-4 shrink-0" strokeWidth={1.75} />
      <span className={cn("truncate", !value && "text-muted-foreground")}>
        {value ? formatDateDisplay(value) : placeholder}
      </span>
      <input
        type="date"
        value={value}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel ?? placeholder}
        // Transparent mais interactif : capte le tap et ouvre le picker natif.
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  );
}

export function TimeField({
  value,
  onChange,
  placeholder = "Choisir l'heure",
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}) {
  return (
    <div className={fieldShell}>
      <Clock className="text-muted-foreground size-4 shrink-0" strokeWidth={1.75} />
      <span className={cn("truncate tabular-nums", !value && "text-muted-foreground")}>
        {value ? value.slice(0, 5) : placeholder}
      </span>
      <input
        type="time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel ?? placeholder}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  );
}

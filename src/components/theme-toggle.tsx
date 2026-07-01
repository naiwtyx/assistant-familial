"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Clair", icon: Sun },
  { value: "dark", label: "Sombre", icon: Moon },
  { value: "system", label: "Système", icon: Monitor },
] as const;

/** Sélecteur segmenté clair / sombre / système. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Évite un mismatch d'hydratation : le thème réel n'est connu que côté client.
  useEffect(() => setMounted(true), []);
  const current = mounted ? (theme ?? "system") : "system";

  return (
    <div className="bg-muted grid grid-cols-3 gap-1 rounded-lg p-1">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          aria-pressed={current === value}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm transition-colors",
            current === value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-4" />
          {label}
        </button>
      ))}
    </div>
  );
}

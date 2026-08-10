"use client";

import { SubPageHeader } from "@/components/shared/settings-nav";
import { ThemeToggle } from "@/components/theme-toggle";

/** Page Apparence : sélecteur de thème (clair / sombre / système). */
export function AppearanceView() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 p-5 pb-8">
      <SubPageHeader backHref="/reglages" backLabel="Réglages" title="Apparence" />

      <section className="motion-in flex flex-col gap-2">
        <p className="text-muted-foreground px-1 text-[11px] font-semibold tracking-[0.08em] uppercase">
          Thème
        </p>
        <div className="bg-card shadow-soft rounded-2xl p-4">
          <ThemeToggle />
          <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
            « Système » suit automatiquement le réglage clair/sombre de ton appareil.
          </p>
        </div>
      </section>
    </main>
  );
}

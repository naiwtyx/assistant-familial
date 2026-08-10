"use client";

import { SubPageHeader } from "@/components/shared/settings-nav";
import { PremiumSettings } from "@/features/premium/components/premium-settings";

/** Page « Assistant Budget » : comparatif Gratuit/Premium + gestion (admin). */
export function BudgetSettingsView() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 p-5 pb-8">
      <SubPageHeader
        backHref="/reglages"
        backLabel="Réglages"
        title="Assistant Budget"
        subtitle="Comprends tes dépenses et gère mieux ton budget"
      />

      <div className="motion-in">
        <PremiumSettings />
      </div>
    </main>
  );
}

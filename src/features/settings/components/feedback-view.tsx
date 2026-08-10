"use client";

import { SubPageHeader } from "@/components/shared/settings-nav";
import { useActiveFamily } from "@/features/family/components/family-provider";
import { FeedbackCard } from "@/features/feedback/components/feedback-card";

/** Page Aide : donner un avis / signaler un bug (réutilise FeedbackCard). */
export function FeedbackView() {
  const family = useActiveFamily();

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 p-5 pb-8">
      <SubPageHeader
        backHref="/reglages"
        backLabel="Réglages"
        title="Aide & retours"
        subtitle="L'app est en test — ton retour aide vraiment à l'améliorer"
      />

      <div className="motion-in">
        <FeedbackCard familyId={family.id} />
      </div>
    </main>
  );
}

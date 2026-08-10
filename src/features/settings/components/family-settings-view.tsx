"use client";

import { SubPageHeader } from "@/components/shared/settings-nav";
import { useActiveFamily } from "@/features/family/components/family-provider";
import { FamilyMembersList } from "@/features/family/components/family-members-list";
import { InviteCard } from "@/features/family/components/invite-card";

/** Page Famille : liste des membres du foyer + invitation. */
export function FamilySettingsView() {
  const family = useActiveFamily();

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 p-5 pb-8">
      <SubPageHeader
        backHref="/reglages"
        backLabel="Réglages"
        title="Famille"
        subtitle="Les membres de ton foyer"
      />

      <div className="motion-in flex flex-col gap-3">
        <FamilyMembersList familyId={family.id} />
        <InviteCard familyId={family.id} />
      </div>
    </main>
  );
}

"use client";

import { useActiveFamily } from "@/features/family/components/family-provider";
import { InviteCard } from "@/features/family/components/invite-card";
import { ParentsSubPage } from "@/features/family/components/parents-sub-page";
import { PendingInvitesCard } from "@/features/family/components/pending-invites-card";

export default function ParentsInvitationsPage() {
  const family = useActiveFamily();
  return (
    <ParentsSubPage title="Invitations" subtitle="Codes d'invitation et demandes en attente">
      <div className="flex flex-col gap-3">
        <PendingInvitesCard familyId={family.id} />
        <InviteCard familyId={family.id} />
      </div>
    </ParentsSubPage>
  );
}

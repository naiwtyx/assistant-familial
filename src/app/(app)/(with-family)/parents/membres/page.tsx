"use client";

import { useActiveFamily } from "@/features/family/components/family-provider";
import { MemberRoles } from "@/features/family/components/member-roles";
import { ParentsSubPage } from "@/features/family/components/parents-sub-page";

export default function ParentsMembersPage() {
  const family = useActiveFamily();
  return (
    <ParentsSubPage title="Membres & droits" subtitle="Gérer les rôles de chaque membre">
      <MemberRoles familyId={family.id} />
    </ParentsSubPage>
  );
}

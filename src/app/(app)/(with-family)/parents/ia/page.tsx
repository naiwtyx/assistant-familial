"use client";

import { AiMemberAccess } from "@/features/family/components/ai-member-access";
import { useActiveFamily } from "@/features/family/components/family-provider";
import { ParentsSubPage } from "@/features/family/components/parents-sub-page";

export default function ParentsAiAccessPage() {
  const family = useActiveFamily();
  return (
    <ParentsSubPage
      title="Accès à l'IA"
      subtitle="Autoriser chaque membre à utiliser l'assistant"
    >
      <AiMemberAccess familyId={family.id} />
    </ParentsSubPage>
  );
}

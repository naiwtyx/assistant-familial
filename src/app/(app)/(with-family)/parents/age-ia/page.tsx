"use client";

import { AiMinAgeSetting } from "@/features/family/components/ai-min-age-setting";
import { useActiveFamily } from "@/features/family/components/family-provider";
import { ParentsSubPage } from "@/features/family/components/parents-sub-page";

export default function ParentsAiMinAgePage() {
  const family = useActiveFamily();
  return (
    <ParentsSubPage
      title="Âge minimum pour l'IA"
      subtitle="Limiter l'accès à l'assistant selon l'âge"
    >
      <AiMinAgeSetting familyId={family.id} />
    </ParentsSubPage>
  );
}

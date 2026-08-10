"use client";

import { useActiveFamily } from "@/features/family/components/family-provider";
import { ParentsSubPage } from "@/features/family/components/parents-sub-page";
import { ShoppingReminderCard } from "@/features/family/components/shopping-reminder-card";

export default function ParentsSettingsPage() {
  const family = useActiveFamily();
  return (
    <ParentsSubPage title="Paramètres du foyer" subtitle="Options réservées aux parents">
      <ShoppingReminderCard familyId={family.id} />
    </ParentsSubPage>
  );
}

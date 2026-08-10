"use client";

import { BudgetDashboard } from "@/features/budget/components/budget-dashboard";
import { useActiveFamily } from "@/features/family/components/family-provider";
import { ParentsSubPage } from "@/features/family/components/parents-sub-page";

export default function ParentsBudgetPage() {
  const family = useActiveFamily();
  return (
    <ParentsSubPage title="Budget du foyer" subtitle="Plafond mensuel, dépenses et historique">
      <BudgetDashboard familyId={family.id} />
    </ParentsSubPage>
  );
}

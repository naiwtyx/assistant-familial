import type { Metadata } from "next";

import { BudgetSettingsView } from "@/features/settings/components/budget-settings-view";

export const metadata: Metadata = { title: "Assistant Budget" };

export default function BudgetSettingsPage() {
  return <BudgetSettingsView />;
}

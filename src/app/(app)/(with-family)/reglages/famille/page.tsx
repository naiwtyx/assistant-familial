import type { Metadata } from "next";

import { FamilySettingsView } from "@/features/settings/components/family-settings-view";

export const metadata: Metadata = { title: "Famille" };

export default function FamilySettingsPage() {
  return <FamilySettingsView />;
}

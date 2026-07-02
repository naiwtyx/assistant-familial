import type { Metadata } from "next";

import { SettingsView } from "@/features/settings/components/settings-view";

export const metadata: Metadata = { title: "Réglages" };

export default function ReglagesPage() {
  return <SettingsView />;
}

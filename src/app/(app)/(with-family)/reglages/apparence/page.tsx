import type { Metadata } from "next";

import { AppearanceView } from "@/features/settings/components/appearance-view";

export const metadata: Metadata = { title: "Apparence" };

export default function AppearancePage() {
  return <AppearanceView />;
}

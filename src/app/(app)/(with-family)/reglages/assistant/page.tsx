import type { Metadata } from "next";

import { AssistantPrefsView } from "@/features/settings/components/assistant-prefs-view";

export const metadata: Metadata = { title: "Assistant IA" };

export default function AssistantPrefsPage() {
  return <AssistantPrefsView />;
}

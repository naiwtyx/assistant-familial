import type { Metadata } from "next";

import { HouseholdKnowledgePage } from "@/features/patterns/components/household-knowledge-page";

export const metadata: Metadata = { title: "Ce que l'assistant a appris" };

export default function ApprentissagePage() {
  return <HouseholdKnowledgePage />;
}

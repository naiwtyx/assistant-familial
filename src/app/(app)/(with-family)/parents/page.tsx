import type { Metadata } from "next";

import { ParentsView } from "@/features/family/components/parents-view";

export const metadata: Metadata = { title: "Espace parents" };

export default function ParentsPage() {
  return <ParentsView />;
}

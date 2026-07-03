import type { Metadata } from "next";

import { IdeasView } from "@/features/ideas/components/ideas-view";

export const metadata: Metadata = { title: "Boîte à idées" };

export default function IdeesPage() {
  return <IdeasView />;
}

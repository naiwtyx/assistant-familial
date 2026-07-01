import type { Metadata } from "next";

import { InventoryView } from "@/features/inventory/components/inventory-view";

export const metadata: Metadata = { title: "Inventaire" };

export default function InventairePage() {
  return <InventoryView />;
}

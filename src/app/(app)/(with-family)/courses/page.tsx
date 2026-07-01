import type { Metadata } from "next";

import { ShoppingListView } from "@/features/shopping/components/shopping-list-view";

export const metadata: Metadata = { title: "Courses" };

export default function CoursesPage() {
  return <ShoppingListView />;
}

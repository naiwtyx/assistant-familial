import type { Metadata } from "next";

import { RecipesView } from "@/features/recipes/components/recipes-view";

export const metadata: Metadata = { title: "Recettes" };

export default function RecettesPage() {
  return <RecipesView />;
}

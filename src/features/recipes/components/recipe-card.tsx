import { ChevronRight, Users } from "lucide-react";
import Link from "next/link";

import type { Recipe } from "@/types/db";

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Link
      href={`/recettes/${recipe.id}`}
      className="bg-card hover:bg-muted/50 flex items-center gap-3 rounded-xl border p-3 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{recipe.name}</p>
        <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
          <Users className="size-3" />
          {recipe.servings} pers.
        </p>
      </div>
      <ChevronRight className="text-muted-foreground size-4 shrink-0" />
    </Link>
  );
}

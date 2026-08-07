"use client";

import { BookOpen, Plus } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { FeedSkeleton } from "@/components/shared/list-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { PageSuggestion } from "@/components/shared/page-suggestion";
import { Button } from "@/components/ui/button";
import { useActiveFamily } from "@/features/family/components/family-provider";
import { useInventory } from "@/features/inventory/hooks/use-inventory";
import { getExpiryStatus } from "@/features/inventory/lib/expiry";

import { useRecipes } from "../hooks/use-recipes";
import { RecipeCard } from "./recipe-card";
import { RecipeFormDialog } from "./recipe-form-dialog";

export function RecipesView() {
  const family = useActiveFamily();
  const { data: recipes, isLoading, isError } = useRecipes(family.id);
  const { data: inventory } = useInventory(family.id);
  const [creating, setCreating] = useState(false);

  const expiringCount =
    inventory?.filter((item) => {
      const status = getExpiryStatus(item.expiry_date);
      return status === "soon" || status === "expired";
    }).length ?? 0;
  const suggestion = (() => {
    if (expiringCount >= 2 && (recipes?.length ?? 0) >= 3) {
      return `${expiringCount} produits vont bientôt périmer — demande à l'assistant quelles recettes les utilisent.`;
    }
    if ((recipes?.length ?? 0) === 1) {
      return "Ajoute quelques recettes de plus pour que l'assistant puisse te planifier une semaine variée.";
    }
    return null;
  })();

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 p-5 pb-8">
      <PageHeader
        title="Recettes"
        subtitle={family.name}
        actions={
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" strokeWidth={1.75} />
            Nouvelle
          </Button>
        }
      />

      <PageSuggestion text={suggestion} />

      {isLoading ? (
        <FeedSkeleton />
      ) : isError ? (
        <p className="text-destructive text-sm">Impossible de charger les recettes.</p>
      ) : recipes && recipes.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Aucune recette"
          description="Crée ta première recette. Elle pourra être planifiée dans la semaine et comparée à ton inventaire."
          action={
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-4" strokeWidth={1.75} />
              Créer ma première recette
            </Button>
          }
        />
      ) : (
        <div className="motion-in-delay-1 flex flex-col gap-2">
          {recipes?.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}

      <RecipeFormDialog familyId={family.id} open={creating} onOpenChange={setCreating} />
    </main>
  );
}

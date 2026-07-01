"use client";

import { BookOpen, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useActiveFamily } from "@/features/family/components/family-provider";

import { useRecipes } from "../hooks/use-recipes";
import { RecipeCard } from "./recipe-card";
import { RecipeFormDialog } from "./recipe-form-dialog";

export function RecipesView() {
  const family = useActiveFamily();
  const { data: recipes, isLoading, isError } = useRecipes(family.id);
  const [creating, setCreating] = useState(false);

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Recettes</h1>
          <p className="text-muted-foreground text-sm">{family.name}</p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          Nouvelle
        </Button>
      </header>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Chargement…</p>
      ) : isError ? (
        <p className="text-destructive text-sm">Impossible de charger les recettes.</p>
      ) : recipes && recipes.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-2 py-12 text-center text-sm">
          <BookOpen className="size-8 opacity-40" />
          <p>
            Aucune recette.
            <br />
            Crée ta première recette.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {recipes?.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}

      <RecipeFormDialog familyId={family.id} open={creating} onOpenChange={setCreating} />
    </main>
  );
}

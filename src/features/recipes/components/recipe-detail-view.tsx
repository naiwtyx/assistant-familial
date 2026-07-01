"use client";

import { ArrowLeft, Minus, Pencil, Plus, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { useActiveFamily } from "@/features/family/components/family-provider";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

import { useDeleteRecipe, useRecipe } from "../hooks/use-recipes";
import { formatQuantity, scaleQuantity } from "../lib/scale";
import { RecipeComparison } from "./recipe-comparison";
import { RecipeFormDialog } from "./recipe-form-dialog";

export function RecipeDetailView({ recipeId }: { recipeId: string }) {
  const family = useActiveFamily();
  const router = useRouter();
  const { data: recipe, isLoading, isError } = useRecipe(recipeId);
  const deleteRecipe = useDeleteRecipe(family.id);

  const [editing, setEditing] = useState(false);
  const [targetServings, setTargetServings] = useState<number | null>(null);

  // Initialise l'affichage sur le nombre de personnes de la recette.
  useEffect(() => {
    if (recipe && targetServings === null) setTargetServings(recipe.servings);
  }, [recipe, targetServings]);

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-md p-6">
        <p className="text-muted-foreground text-sm">Chargement…</p>
      </main>
    );
  }

  if (isError || !recipe) {
    return (
      <main className="mx-auto w-full max-w-md p-6">
        <p className="text-destructive text-sm">Recette introuvable.</p>
      </main>
    );
  }

  const servings = targetServings ?? recipe.servings;
  const isScaled = servings !== recipe.servings;

  // Ingrédients ajustés au nombre de personnes choisi (réutilisés pour la comparaison).
  const scaledIngredients = recipe.ingredients.map((ingredient) => ({
    name: ingredient.name,
    quantity: scaleQuantity(ingredient.quantity, recipe.servings, servings),
    unit: ingredient.unit,
  }));

  function handleDelete() {
    deleteRecipe.mutate(recipeId, {
      onSuccess: () => {
        toast.success("Recette supprimée");
        router.replace("/recettes");
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 p-6">
      <div className="flex items-center justify-between">
        <Link
          href="/recettes"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}
        >
          <ArrowLeft className="size-4" />
          Recettes
        </Link>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setEditing(true)} aria-label="Modifier">
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
            disabled={deleteRecipe.isPending}
            aria-label="Supprimer"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <header>
        <h1 className="text-2xl font-bold tracking-tight">{recipe.name}</h1>
        <p className="text-muted-foreground mt-1 flex items-center gap-1 text-sm">
          <Users className="size-4" />
          Recette pour {recipe.servings} personne{recipe.servings > 1 ? "s" : ""}
        </p>
      </header>

      {/* Ajusteur du nombre de personnes : recalcule les quantités à la volée. */}
      <div className="bg-muted/40 flex items-center justify-between rounded-xl border p-3">
        <span className="text-sm font-medium">Pour combien de personnes ?</span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => setTargetServings(Math.max(1, servings - 1))}
            disabled={servings <= 1}
            aria-label="Moins de personnes"
          >
            <Minus className="size-4" />
          </Button>
          <span className="w-8 text-center text-sm font-semibold tabular-nums">{servings}</span>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => setTargetServings(Math.min(50, servings + 1))}
            disabled={servings >= 50}
            aria-label="Plus de personnes"
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      <section className="flex flex-col gap-1">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Ingrédients</h2>
          {isScaled ? (
            <button
              type="button"
              onClick={() => setTargetServings(recipe.servings)}
              className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
            >
              Réinitialiser
            </button>
          ) : null}
        </div>
        <ul className="divide-border divide-y">
          {recipe.ingredients.map((ingredient) => (
            <li key={ingredient.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{ingredient.name}</span>
              <span className="text-muted-foreground tabular-nums">
                {formatQuantity(scaleQuantity(ingredient.quantity, recipe.servings, servings))}
                {ingredient.unit ? ` ${ingredient.unit}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <RecipeComparison familyId={family.id} ingredients={scaledIngredients} />

      <RecipeFormDialog
        familyId={family.id}
        recipe={recipe}
        open={editing}
        onOpenChange={setEditing}
      />
    </main>
  );
}

"use client";

import { ArrowLeft, ChefHat, Minus, Pencil, Plus, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { useActiveFamily } from "@/features/family/components/family-provider";
import { getErrorMessage } from "@/lib/get-error-message";
import { haptic } from "@/lib/haptics";
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
  const hasIngredients = recipe.ingredients.length > 0;

  const scaledIngredients = recipe.ingredients.map((ingredient) => ({
    name: ingredient.name,
    quantity: scaleQuantity(ingredient.quantity, recipe.servings, servings),
    unit: ingredient.unit,
  }));

  function handleDelete() {
    haptic("warning");
    deleteRecipe.mutate(recipeId, {
      onSuccess: () => {
        toast.success("Recette supprimée");
        router.replace("/recettes");
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 p-5 pb-8">
      {/* Barre de nav discrète + actions à droite (édition/suppression). */}
      <div className="motion-in flex items-center justify-between">
        <Link
          href="/recettes"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 rounded-full")}
        >
          <ArrowLeft className="size-4" strokeWidth={1.75} />
          Recettes
        </Link>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => setEditing(true)}
            aria-label="Modifier"
          >
            <Pencil className="size-4" strokeWidth={1.75} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive rounded-full"
            onClick={handleDelete}
            disabled={deleteRecipe.isPending}
            aria-label="Supprimer"
          >
            <Trash2 className="size-4" strokeWidth={1.75} />
          </Button>
        </div>
      </div>

      {/* Header premium : icône colorée + titre + info personnes. */}
      <header className="motion-in-delay-1 flex items-start gap-3">
        <div className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-2xl">
          <ChefHat className="size-6" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-2xl leading-tight font-semibold tracking-tight">
            {recipe.name}
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
            <Users className="size-3.5" strokeWidth={1.75} />
            Recette pour {recipe.servings} personne{recipe.servings > 1 ? "s" : ""}
          </p>
        </div>
      </header>

      {/* Ajusteur du nombre de personnes : uniquement si on a des ingrédients. */}
      {hasIngredients ? (
        <div className="motion-in-delay-2 bg-card shadow-soft flex items-center justify-between rounded-2xl p-4">
          <div>
            <p className="text-[13px] font-medium">Pour combien de personnes ?</p>
            <p className="text-muted-foreground text-xs">
              Les quantités s&apos;ajustent automatiquement
            </p>
          </div>
          <div className="bg-muted/60 flex items-center rounded-full p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full"
              onClick={() => setTargetServings(Math.max(1, servings - 1))}
              disabled={servings <= 1}
              aria-label="Moins de personnes"
            >
              <Minus className="size-3.5" strokeWidth={2} />
            </Button>
            <span className="w-6 text-center text-sm font-semibold tabular-nums">{servings}</span>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full"
              onClick={() => setTargetServings(Math.min(50, servings + 1))}
              disabled={servings >= 50}
              aria-label="Plus de personnes"
            >
              <Plus className="size-3.5" strokeWidth={2} />
            </Button>
          </div>
        </div>
      ) : null}

      {/* Section ingrédients : liste OU empty state selon la présence. */}
      <section className="motion-in-delay-2 flex flex-col gap-2">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="text-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase">
            Ingrédients
          </h2>
          {hasIngredients && isScaled ? (
            <button
              type="button"
              onClick={() => setTargetServings(recipe.servings)}
              className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
            >
              Réinitialiser
            </button>
          ) : null}
        </div>

        {hasIngredients ? (
          <ul className="bg-card shadow-soft flex flex-col rounded-2xl p-1">
            {recipe.ingredients.map((ingredient) => (
              <li
                key={ingredient.id}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-[15px]"
              >
                <span className="min-w-0 flex-1 truncate">{ingredient.name}</span>
                <span className="text-muted-foreground shrink-0 tabular-nums">
                  {formatQuantity(scaleQuantity(ingredient.quantity, recipe.servings, servings))}
                  {ingredient.unit ? ` ${ingredient.unit}` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="bg-card shadow-soft flex flex-col items-center gap-3 rounded-2xl px-4 py-8 text-center">
            <div className="bg-muted flex size-11 items-center justify-center rounded-2xl">
              <ChefHat className="text-muted-foreground size-5 opacity-60" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[14px] font-medium">Aucun ingrédient</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Tu peux compléter cette recette maintenant ou plus tard.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
              className="mt-1 rounded-full"
            >
              <Plus className="size-4" strokeWidth={2} />
              Ajouter des ingrédients
            </Button>
          </div>
        )}
      </section>

      {/* Comparaison avec l'inventaire (seulement si on a des ingrédients). */}
      {hasIngredients ? (
        <RecipeComparison familyId={family.id} ingredients={scaledIngredients} />
      ) : null}

      <RecipeFormDialog
        familyId={family.id}
        recipe={recipe}
        open={editing}
        onOpenChange={setEditing}
      />
    </main>
  );
}

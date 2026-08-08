"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/get-error-message";
import { haptic } from "@/lib/haptics";

import { useCreateRecipe, useUpdateRecipe } from "../hooks/use-recipes";
import { recipeSchema } from "../schemas/recipe.schema";
import type { RecipeWithIngredients } from "../services/recipe.service";

/** Quantité gardée en chaîne dans le formulaire (saisie souple des décimales). */
type IngredientRow = { name: string; quantity: string; unit: string };

type Props = {
  familyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Présent => mode édition. */
  recipe?: RecipeWithIngredients;
};

function emptyRow(): IngredientRow {
  return { name: "", quantity: "1", unit: "" };
}

export function RecipeFormDialog({ familyId, open, onOpenChange, recipe }: Props) {
  const isEdit = Boolean(recipe);
  const create = useCreateRecipe(familyId);
  const update = useUpdateRecipe(familyId);
  const pending = create.isPending || update.isPending;

  const [name, setName] = useState("");
  const [servings, setServings] = useState(4);
  const [rows, setRows] = useState<IngredientRow[]>([]);

  useEffect(() => {
    if (!open) return;
    setName(recipe?.name ?? "");
    setServings(recipe?.servings ?? 4);
    // Départ vide : on ne présente PAS de champ ingrédient tant que l'utilisateur
    // ne clique pas "+ Ajouter" — création rapide au titre seul possible.
    setRows(
      recipe && recipe.ingredients.length > 0
        ? recipe.ingredients.map((i) => ({
            name: i.name,
            quantity: String(i.quantity),
            unit: i.unit ?? "",
          }))
        : [],
    );
  }, [open, recipe]);

  function updateRow(index: number, patch: Partial<IngredientRow>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }
  function addRow() {
    setRows((current) => [...current, emptyRow()]);
  }
  function removeRow(index: number) {
    setRows((current) => current.filter((_, i) => i !== index));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    // Filtre les lignes vides : un utilisateur qui ajoute un champ puis change
    // d'avis ne doit pas être bloqué par une validation stricte.
    const cleanIngredients = rows
      .map((row) => ({ ...row, name: row.name.trim() }))
      .filter((row) => row.name.length > 0)
      .map((row) => ({
        name: row.name,
        quantity: Number(row.quantity) || 1,
        unit: row.unit,
      }));

    const parsed = recipeSchema.safeParse({
      name,
      servings,
      ingredients: cleanIngredients,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Formulaire invalide");
      return;
    }

    const onSuccess = () => {
      haptic("success");
      onOpenChange(false);
    };
    const onError = (error: unknown) => toast.error(getErrorMessage(error));

    if (isEdit && recipe) {
      update.mutate({ id: recipe.id, input: parsed.data }, { onSuccess, onError });
    } else {
      create.mutate(parsed.data, { onSuccess, onError });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier la recette" : "Nouvelle recette"}</DialogTitle>
          <DialogDescription>
            Un nom suffit — tu pourras compléter les ingrédients plus tard.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-5">
          {/* Nom : le point de départ. Grande hauteur, autofocus. */}
          <div className="grid gap-1.5">
            <Label htmlFor="rec-name" className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              Nom de la recette
            </Label>
            <Input
              id="rec-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex. Pâtes au steak haché"
              autoFocus
              className="h-11 text-[15px]"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="rec-serv" className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              Nombre de personnes
            </Label>
            <Input
              id="rec-serv"
              type="number"
              min={1}
              max={50}
              value={servings}
              onChange={(event) => setServings(Math.max(1, Number(event.target.value) || 1))}
              className="h-11 w-24 text-[15px] tabular-nums"
            />
          </div>

          {/* Ingrédients : section secondaire, label explicite "(optionnel)". */}
          <div className="grid gap-2">
            <div className="flex items-baseline justify-between">
              <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                Ingrédients{" "}
                <span className="text-muted-foreground/70 font-normal normal-case tracking-normal">
                  (optionnel)
                </span>
              </Label>
              {rows.length > 0 ? (
                <span className="text-muted-foreground/70 text-xs">
                  {rows.length} ingrédient{rows.length > 1 ? "s" : ""}
                </span>
              ) : null}
            </div>

            {rows.length === 0 ? (
              <p className="text-muted-foreground rounded-xl border border-dashed px-3 py-3 text-center text-xs">
                Aucun ingrédient. Tu peux les ajouter maintenant ou plus tard.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {rows.map((row, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={row.name}
                      onChange={(event) => updateRow(index, { name: event.target.value })}
                      placeholder="Ingrédient"
                      className="h-10 flex-1"
                      aria-label={`Ingrédient ${index + 1}`}
                    />
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={row.quantity}
                      onChange={(event) => updateRow(index, { quantity: event.target.value })}
                      className="h-10 w-14 text-center tabular-nums"
                      aria-label="Quantité"
                    />
                    <Input
                      value={row.unit}
                      onChange={(event) => updateRow(index, { unit: event.target.value })}
                      placeholder="unité"
                      className="h-10 w-16"
                      aria-label="Unité"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive size-9 shrink-0"
                      onClick={() => removeRow(index)}
                      aria-label="Retirer l'ingrédient"
                    >
                      <Trash2 className="size-4" strokeWidth={1.75} />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRow}
              className="justify-self-start"
            >
              <Plus className="size-4" strokeWidth={1.75} />
              Ajouter un ingrédient
            </Button>
          </div>

          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending} className="min-w-[100px]">
              {pending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

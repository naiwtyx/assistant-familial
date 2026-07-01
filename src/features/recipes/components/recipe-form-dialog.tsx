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
  const [rows, setRows] = useState<IngredientRow[]>([emptyRow()]);

  useEffect(() => {
    if (!open) return;
    setName(recipe?.name ?? "");
    setServings(recipe?.servings ?? 4);
    setRows(
      recipe && recipe.ingredients.length > 0
        ? recipe.ingredients.map((i) => ({
            name: i.name,
            quantity: String(i.quantity),
            unit: i.unit ?? "",
          }))
        : [emptyRow()],
    );
  }, [open, recipe]);

  function updateRow(index: number, patch: Partial<IngredientRow>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }
  function addRow() {
    setRows((current) => [...current, emptyRow()]);
  }
  function removeRow(index: number) {
    setRows((current) => (current.length > 1 ? current.filter((_, i) => i !== index) : current));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = recipeSchema.safeParse({
      name,
      servings,
      ingredients: rows.map((row) => ({
        name: row.name,
        quantity: Number(row.quantity),
        unit: row.unit,
      })),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Formulaire invalide");
      return;
    }

    const onSuccess = () => onOpenChange(false);
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
          <DialogDescription>Nom, nombre de personnes et ingrédients.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="rec-name">Nom</Label>
            <Input
              id="rec-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex. Pâtes à la carbonara"
              autoFocus
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="rec-serv">Nombre de personnes</Label>
            <Input
              id="rec-serv"
              type="number"
              min={1}
              max={50}
              value={servings}
              onChange={(event) => setServings(Math.max(1, Number(event.target.value) || 1))}
              className="w-24"
            />
          </div>

          <div className="grid gap-2">
            <Label>Ingrédients</Label>
            {rows.map((row, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={row.name}
                  onChange={(event) => updateRow(index, { name: event.target.value })}
                  placeholder="Ingrédient"
                  className="flex-1"
                  aria-label={`Ingrédient ${index + 1}`}
                />
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={row.quantity}
                  onChange={(event) => updateRow(index, { quantity: event.target.value })}
                  className="w-16 text-center"
                  aria-label="Quantité"
                />
                <Input
                  value={row.unit}
                  onChange={(event) => updateRow(index, { unit: event.target.value })}
                  placeholder="unité"
                  className="w-16"
                  aria-label="Unité"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive size-8 shrink-0"
                  onClick={() => removeRow(index)}
                  disabled={rows.length <= 1}
                  aria-label="Retirer l'ingrédient"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRow}
              className="justify-self-start"
            >
              <Plus className="size-4" />
              Ajouter un ingrédient
            </Button>
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

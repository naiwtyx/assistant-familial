"use client";

import { Check, ShoppingCart, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useInventory } from "@/features/inventory/hooks/use-inventory";
import { useAddShoppingItems } from "@/features/shopping/hooks/use-shopping-list";
import { getErrorMessage } from "@/lib/get-error-message";

import { compareIngredientsWithInventory, type IngredientNeed } from "../lib/compare";
import { formatQuantity } from "../lib/scale";

/**
 * Compare les ingrédients (ajustés au nombre de personnes) avec l'inventaire,
 * et permet d'ajouter les manquants à la liste de courses en un clic.
 */
export function RecipeComparison({
  familyId,
  ingredients,
}: {
  familyId: string;
  ingredients: IngredientNeed[];
}) {
  const { data: inventory, isLoading } = useInventory(familyId);
  const addToShopping = useAddShoppingItems(familyId);
  // Signature du lot déjà ajouté : le bouton reste grisé tant que les manquants
  // n'ont pas changé (nombre de personnes, inventaire, recette retouchée).
  const [addedSignature, setAddedSignature] = useState<string | null>(null);

  if (isLoading || !inventory) {
    return <p className="text-muted-foreground text-sm">Comparaison avec l&apos;inventaire…</p>;
  }

  const rows = compareIngredientsWithInventory(ingredients, inventory);
  const missing = rows.filter((row) => row.status !== "in_stock");

  const items = missing.map((row) => ({
    name: row.name,
    // On arrondit la quantité manquante au supérieur (au moins 1).
    quantity: Math.max(1, Math.ceil(row.missing)),
    unit: row.unit,
  }));
  const signature = items.map((item) => `${item.name}:${item.quantity}${item.unit ?? ""}`).join("|");
  const alreadyAdded = addedSignature !== null && addedSignature === signature;

  function handleAddMissing() {
    addToShopping.mutate(items, {
      onSuccess: () => {
        setAddedSignature(signature);
        toast.success("Ingrédients manquants ajoutés aux courses");
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold">Dans ton inventaire</h2>

      <ul className="divide-border divide-y">
        {rows.map((row, index) => (
          <li key={index} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="flex min-w-0 flex-1 items-center gap-2">
              {row.status === "in_stock" ? (
                <Check className="size-4 shrink-0 text-emerald-600" />
              ) : (
                <X className="text-destructive size-4 shrink-0" />
              )}
              <span className="truncate">{row.name}</span>
            </span>
            <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
              {row.status === "in_stock"
                ? "En stock"
                : `Manque ${formatQuantity(row.missing)}${row.unit ? ` ${row.unit}` : ""}`}
            </span>
          </li>
        ))}
      </ul>

      {missing.length > 0 ? (
        <Button
          onClick={handleAddMissing}
          disabled={addToShopping.isPending || alreadyAdded}
          variant={alreadyAdded ? "outline" : "default"}
          className="mt-1"
        >
          {alreadyAdded ? <Check className="size-4" /> : <ShoppingCart className="size-4" />}
          {alreadyAdded
            ? "Ajouté aux courses ✓"
            : `Ajouter les manquants aux courses (${missing.length})`}
        </Button>
      ) : (
        <p className="text-muted-foreground text-sm">Tu as tout ce qu&apos;il faut ✅</p>
      )}
    </section>
  );
}

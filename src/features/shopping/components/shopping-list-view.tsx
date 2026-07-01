"use client";

import { PackagePlus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useActiveFamily } from "@/features/family/components/family-provider";
import { useAddCheckedItemsToInventory } from "@/features/inventory/hooks/use-inventory";
import { getErrorMessage } from "@/lib/get-error-message";

import { useShoppingList } from "../hooks/use-shopping-list";
import { AddItemForm } from "./add-item-form";
import { ShoppingItemRow } from "./shopping-item-row";

export function ShoppingListView() {
  const family = useActiveFamily();
  const { data: items, isLoading, isError } = useShoppingList(family.id);
  const addToInventory = useAddCheckedItemsToInventory(family.id);

  const toBuy = items?.filter((item) => !item.is_checked) ?? [];
  const bought = items?.filter((item) => item.is_checked) ?? [];

  function handleAddToInventory() {
    addToInventory.mutate(bought, {
      onSuccess: () => toast.success("Articles ajoutés à l'inventaire"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-6">
      <header>
        <h1 className="text-xl font-bold tracking-tight">Liste de courses</h1>
        <p className="text-muted-foreground text-sm">{family.name}</p>
      </header>

      <AddItemForm familyId={family.id} />

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Chargement…</p>
      ) : isError ? (
        <p className="text-destructive text-sm">Impossible de charger la liste.</p>
      ) : items && items.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-2 py-12 text-center text-sm">
          <ShoppingCart className="size-8 opacity-40" />
          <p>
            Aucun article pour l&apos;instant.
            <br />
            Ajoute ton premier article ci-dessus.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <ul className="divide-border divide-y">
            {toBuy.map((item) => (
              <li key={item.id}>
                <ShoppingItemRow item={item} familyId={family.id} />
              </li>
            ))}
          </ul>

          {bought.length > 0 ? (
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-muted-foreground text-xs font-medium uppercase">
                  Déjà pris ({bought.length})
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddToInventory}
                  disabled={addToInventory.isPending}
                >
                  <PackagePlus className="size-4" />
                  Ajouter à l&apos;inventaire
                </Button>
              </div>
              <ul className="divide-border divide-y opacity-70">
                {bought.map((item) => (
                  <li key={item.id}>
                    <ShoppingItemRow item={item} familyId={family.id} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </main>
  );
}

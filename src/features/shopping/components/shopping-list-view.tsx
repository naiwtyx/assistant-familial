"use client";

import { Bell, PackagePlus, Share2, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useMyMembership } from "@/features/family/components/family-provider";
import { isAuthorized } from "@/features/family/lib/roles";
import { useAddCheckedItemsToInventory } from "@/features/inventory/hooks/use-inventory";
import { getErrorMessage } from "@/lib/get-error-message";

import { useShoppingList } from "../hooks/use-shopping-list";
import { AddItemForm } from "./add-item-form";
import { ShoppingItemRow } from "./shopping-item-row";

export function ShoppingListView() {
  const { family, role } = useMyMembership();
  const canRemind = isAuthorized(role);
  const { data: items, isLoading, isError } = useShoppingList(family.id);
  const addToInventory = useAddCheckedItemsToInventory(family.id);
  const [isReminding, setIsReminding] = useState(false);

  const toBuy = items?.filter((item) => !item.is_checked) ?? [];
  const bought = items?.filter((item) => item.is_checked) ?? [];

  function handleAddToInventory() {
    addToInventory.mutate(bought, {
      onSuccess: () => toast.success("Articles ajoutés à l'inventaire"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  async function handleShare() {
    if (toBuy.length === 0) return;
    const lines = toBuy.map((item) => {
      const qty = item.quantity > 1 ? `${item.quantity} ` : "";
      const unit = item.unit ? `${item.unit} ` : "";
      return `- ${qty}${unit}${item.name}`;
    });
    const text = `Liste de courses – ${family.name}\n${lines.join("\n")}`;
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title: "Liste de courses", text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Liste copiée dans le presse-papiers");
      }
    } catch (error) {
      // Partage annulé par l'utilisateur : on ignore.
      if ((error as Error)?.name !== "AbortError") {
        toast.error("Impossible de partager la liste");
      }
    }
  }

  async function handleRemind() {
    setIsReminding(true);
    try {
      const response = await fetch("/api/shopping/remind", { method: "POST" });
      const data = (await response.json()) as { sent?: number; error?: string };
      if (!response.ok || data.error) {
        throw new Error(data.error ?? "Impossible d'envoyer le rappel.");
      }
      toast.success(
        data.sent && data.sent > 0
          ? `Rappel envoyé à la famille (${data.sent})`
          : "Aucun appareil à notifier pour l'instant.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setIsReminding(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-6">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Liste de courses</h1>
          <p className="text-muted-foreground text-sm">{family.name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {canRemind ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRemind}
              disabled={isReminding}
              aria-label="Rappeler à la famille de compléter la liste"
              title="Rappeler à la famille"
            >
              <Bell className="size-5" />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            disabled={toBuy.length === 0}
            aria-label="Partager la liste"
            title="Partager la liste"
          >
            <Share2 className="size-5" />
          </Button>
        </div>
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

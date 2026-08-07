"use client";

import { Bell, PackagePlus, Share2, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { PageSuggestion } from "@/components/shared/page-suggestion";
import { Button } from "@/components/ui/button";
import { categoryLabel } from "@/config/constants";
import { useMyMembership } from "@/features/family/components/family-provider";
import { isAuthorized } from "@/features/family/lib/roles";
import { useAddCheckedItemsToInventory, useInventory } from "@/features/inventory/hooks/use-inventory";
import { getExpiryStatus } from "@/features/inventory/lib/expiry";
import { getErrorMessage } from "@/lib/get-error-message";

import { useShoppingList } from "../hooks/use-shopping-list";
import { groupByRayon } from "../lib/categorize";
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

  const { data: inventory } = useInventory(family.id);
  const expiringSoonCount =
    inventory?.filter((item) => getExpiryStatus(item.expiry_date) === "soon").length ?? 0;
  const suggestion = (() => {
    if (toBuy.length >= 8) {
      return `${toBuy.length} articles à acheter. Pense à faire les courses cette semaine.`;
    }
    if (expiringSoonCount >= 2) {
      return `${expiringSoonCount} produits en stock périment bientôt — planifie des recettes pour les utiliser avant d'acheter neuf.`;
    }
    if (toBuy.length === 0 && bought.length > 0) {
      return "Liste terminée ! Ajoute les articles à ton inventaire d'un tap.";
    }
    return null;
  })();

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
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 p-5 pb-8">
      <PageHeader
        title="Liste de courses"
        subtitle={family.name}
        actions={
          <>
            {canRemind ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRemind}
                disabled={isReminding}
                aria-label="Rappeler à la famille de compléter la liste"
                title="Rappeler à la famille"
              >
                <Bell className="size-[18px]" strokeWidth={1.75} />
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
              <Share2 className="size-[18px]" strokeWidth={1.75} />
            </Button>
          </>
        }
      />

      <PageSuggestion text={suggestion} />

      <AddItemForm familyId={family.id} />

      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <p className="text-destructive text-sm">Impossible de charger la liste.</p>
      ) : items && items.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Aucun article"
          description="Ajoute ton premier article ci-dessus. Ou scanne un ticket de caisse pour tout importer d'un coup."
        />
      ) : (
        <div className="flex flex-col gap-1">
          {(() => {
            const groups = groupByRayon(toBuy);
            // Un seul rayon -> liste simple, sans en-tête inutile.
            if (groups.length <= 1) {
              return (
                <ul className="bg-card shadow-soft flex flex-col rounded-2xl p-1">
                  {toBuy.map((item) => (
                    <li key={item.id}>
                      <ShoppingItemRow item={item} familyId={family.id} />
                    </li>
                  ))}
                </ul>
              );
            }
            return (
              <div className="flex flex-col gap-4">
                {groups.map((group) => (
                  <div key={group.key}>
                    <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                      {categoryLabel(group.key)}
                    </p>
                    <ul className="bg-card shadow-soft flex flex-col rounded-2xl p-1">
                      {group.items.map((item) => (
                        <li key={item.id}>
                          <ShoppingItemRow item={item} familyId={family.id} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            );
          })()}

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
              <ul className="bg-card shadow-soft flex flex-col rounded-2xl p-1 opacity-70">
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

"use client";

import { AlertTriangle, Camera, Package, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { FeedSkeleton } from "@/components/shared/list-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { PageSuggestion } from "@/components/shared/page-suggestion";
import { Button } from "@/components/ui/button";
import { useActiveFamily } from "@/features/family/components/family-provider";

import { useInventory } from "../hooks/use-inventory";
import { getExpiryStatus } from "../lib/expiry";
import { InventoryFormDialog } from "./inventory-form-dialog";
import { InventoryItemCard } from "./inventory-item-card";

// Ordre de tri : périmés d'abord, puis bientôt périmés, puis le reste.
const EXPIRY_RANK: Record<string, number> = { expired: 0, soon: 1 };

export function InventoryView() {
  const family = useActiveFamily();
  const router = useRouter();
  const { data: items, isLoading, isError } = useInventory(family.id);
  const [adding, setAdding] = useState(false);

  const expiredCount =
    items?.filter((item) => getExpiryStatus(item.expiry_date) === "expired").length ?? 0;
  const soonCount =
    items?.filter((item) => getExpiryStatus(item.expiry_date) === "soon").length ?? 0;

  const sortedItems = items
    ? [...items].sort(
        (a, b) =>
          (EXPIRY_RANK[getExpiryStatus(a.expiry_date) ?? ""] ?? 2) -
          (EXPIRY_RANK[getExpiryStatus(b.expiry_date) ?? ""] ?? 2),
      )
    : [];

  const suggestion = (() => {
    if (expiredCount >= 1) {
      const first = items?.find((item) => getExpiryStatus(item.expiry_date) === "expired");
      return `Retire ${first?.name ?? "les produits périmés"} de l'inventaire pour garder une vue à jour.`;
    }
    if (soonCount >= 1) {
      const first = items?.find((item) => getExpiryStatus(item.expiry_date) === "soon");
      return `Pense à utiliser ${first?.name ?? "les produits qui périment bientôt"} en priorité.`;
    }
    if ((items?.length ?? 0) >= 20) {
      return "Inventaire bien fourni — planifie tes repas de la semaine pour l'écouler avant d'acheter neuf.";
    }
    return null;
  })();

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 p-5 pb-8">
      <PageHeader
        title="Inventaire"
        subtitle={family.name}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => router.push("/scanner")}>
              <Camera className="size-4" strokeWidth={1.75} />
              Scanner
            </Button>
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus className="size-4" strokeWidth={1.75} />
              Ajouter
            </Button>
          </>
        }
      />

      <PageSuggestion text={suggestion} />

      {expiredCount > 0 || soonCount > 0 ? (
        <div className="motion-in-delay-1 flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/8 dark:text-amber-300">
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
            <AlertTriangle className="size-4" strokeWidth={1.75} />
          </div>
          <div className="flex flex-col gap-0.5">
            {expiredCount > 0 ? (
              <span>
                <strong>{expiredCount}</strong> produit{expiredCount > 1 ? "s" : ""} périmé
                {expiredCount > 1 ? "s" : ""}
              </span>
            ) : null}
            {soonCount > 0 ? (
              <span>
                <strong>{soonCount}</strong> produit{soonCount > 1 ? "s" : ""} à consommer bientôt
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <FeedSkeleton />
      ) : isError ? (
        <p className="text-destructive text-sm">Impossible de charger l&apos;inventaire.</p>
      ) : items && items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Ton inventaire est vide"
          description="Ajoute manuellement un produit, ou scanne un ticket de caisse pour tout importer d'un coup."
          action={
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus className="size-4" strokeWidth={1.75} />
              Ajouter un produit
            </Button>
          }
        />
      ) : (
        <div className="motion-in-delay-2 flex flex-col gap-2">
          {sortedItems.map((item) => (
            <InventoryItemCard key={item.id} item={item} familyId={family.id} />
          ))}
        </div>
      )}

      <InventoryFormDialog familyId={family.id} open={adding} onOpenChange={setAdding} />
    </main>
  );
}

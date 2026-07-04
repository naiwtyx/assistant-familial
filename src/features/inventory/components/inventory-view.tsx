"use client";

import { AlertTriangle, Camera, Package, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ListSkeleton } from "@/components/shared/list-skeleton";
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

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Inventaire</h1>
          <p className="text-muted-foreground text-sm">{family.name}</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push("/scanner")}
            aria-label="Scanner un ticket"
          >
            <Camera className="size-4" />
          </Button>
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" />
            Ajouter
          </Button>
        </div>
      </header>

      {expiredCount > 0 || soonCount > 0 ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div className="flex flex-col">
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
        <ListSkeleton />
      ) : isError ? (
        <p className="text-destructive text-sm">Impossible de charger l&apos;inventaire.</p>
      ) : items && items.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-2 py-12 text-center text-sm">
          <Package className="size-8 opacity-40" />
          <p>
            Ton inventaire est vide.
            <br />
            Ajoute ton premier produit.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sortedItems.map((item) => (
            <InventoryItemCard key={item.id} item={item} familyId={family.id} />
          ))}
        </div>
      )}

      <InventoryFormDialog familyId={family.id} open={adding} onOpenChange={setAdding} />
    </main>
  );
}

"use client";

import { ChevronLeft, ChevronRight, Receipt, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categoryLabel } from "@/config/constants";
import { useActiveFamily } from "@/features/family/components/family-provider";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

import { useMonthlyBudget, useMonthlyComparison, useSetFamilyBudget } from "../hooks/use-budget";
import { computeBudgetStatus } from "../lib/budget-status";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

export function BudgetDashboard({ familyId }: { familyId: string }) {
  const now = new Date();
  const family = useActiveFamily();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const { data, isLoading } = useMonthlyBudget(familyId, year, month);
  const { data: comparison } = useMonthlyComparison(familyId, year, month);

  const setBudget = useSetFamilyBudget(familyId);
  const [limit, setLimit] = useState<number | null>(family.monthly_budget);
  const [limitInput, setLimitInput] = useState(
    family.monthly_budget != null ? String(family.monthly_budget) : "",
  );

  function shiftMonth(delta: number) {
    const date = new Date(year, month + delta, 1);
    setYear(date.getFullYear());
    setMonth(date.getMonth());
  }

  function saveLimit() {
    const trimmed = limitInput.trim().replace(",", ".");
    const parsed = trimmed === "" ? null : Number(trimmed);
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) {
      toast.error("Montant invalide");
      setLimitInput(limit != null ? String(limit) : "");
      return;
    }
    if (parsed === limit) return;
    setBudget.mutate(parsed, {
      onSuccess: () => {
        setLimit(parsed);
        toast.success(parsed == null ? "Plafond retiré" : `Plafond : ${euro.format(parsed)}`);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  const maxAmount = data?.byCategory[0]?.amount ?? 0;
  const { overBudget, nearBudget } =
    data != null ? computeBudgetStatus(data.total, limit) : { overBudget: false, nearBudget: false };
  const hasLimit = limit != null && limit > 0;

  return (
    <div className="motion-in bg-card shadow-soft flex flex-col gap-5 rounded-3xl p-5">
      {/* En-tête compacte : titre + sélecteur de mois côte à côte. */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-xl">
            <Wallet className="size-4" strokeWidth={1.75} />
          </div>
          <h2 className="font-heading text-base font-semibold">Dépenses</h2>
        </div>
        <div className="bg-muted/60 flex items-center rounded-full p-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 rounded-full"
            onClick={() => shiftMonth(-1)}
            aria-label="Mois précédent"
          >
            <ChevronLeft className="size-3.5" strokeWidth={2} />
          </Button>
          <span className="min-w-[100px] text-center text-xs font-medium capitalize tabular-nums">
            {MONTHS[month]} {year}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 rounded-full"
            onClick={() => shiftMonth(1)}
            aria-label="Mois suivant"
          >
            <ChevronRight className="size-3.5" strokeWidth={2} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground py-6 text-center text-sm">Chargement…</p>
      ) : !data || data.byCategory.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center text-sm">
          <div className="bg-muted flex size-12 items-center justify-center rounded-2xl">
            <Receipt className="size-5 opacity-50" strokeWidth={1.75} />
          </div>
          <p>
            Aucune dépense ce mois-ci.
            <br />
            Scanne un ticket de caisse pour commencer.
          </p>
        </div>
      ) : (
        <>
          {/* Total : gros chiffre tabulaire, tendance en dessous. */}
          <div className="text-center">
            <p
              className={cn(
                "font-heading text-[32px] leading-none font-semibold tracking-tight tabular-nums",
                overBudget && "text-destructive",
              )}
            >
              {euro.format(data.total)}
            </p>
            <p className="text-muted-foreground mt-1.5 text-xs">
              total du mois
              {hasLimit ? ` · plafond ${euro.format(limit)}` : ""}
            </p>
            {comparison && comparison.changePercent != null ? (
              <p
                className={cn(
                  "mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide",
                  comparison.changeAmount > 0
                    ? "bg-destructive/10 text-destructive"
                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                )}
              >
                {comparison.changeAmount > 0 ? (
                  <TrendingUp className="size-3" strokeWidth={2} />
                ) : (
                  <TrendingDown className="size-3" strokeWidth={2} />
                )}
                {comparison.changePercent > 0 ? "+" : ""}
                {Math.round(comparison.changePercent)}% vs mois précédent
              </p>
            ) : null}
          </div>

          {hasLimit ? (
            <div>
              <div className="bg-muted/60 h-2.5 overflow-hidden rounded-full">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    overBudget
                      ? "bg-destructive"
                      : nearBudget
                        ? "bg-amber-500"
                        : "bg-primary",
                  )}
                  style={{ width: `${Math.min(100, (data.total / limit) * 100)}%` }}
                />
              </div>
              <p
                className={cn(
                  "mt-2 text-center text-[11px] font-medium",
                  overBudget
                    ? "text-destructive"
                    : nearBudget
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-muted-foreground",
                )}
              >
                {overBudget
                  ? `Plafond dépassé de ${euro.format(data.total - limit)}`
                  : `Il reste ${euro.format(limit - data.total)}`}
              </p>
            </div>
          ) : null}

          {/* Répartition par catégorie : barres proportionnelles à la plus grosse. */}
          <ul className="flex flex-col gap-3">
            {data.byCategory.map((row) => (
              <li key={row.category}>
                <div className="mb-1.5 flex justify-between text-[13px]">
                  <span className="text-foreground/90">{categoryLabel(row.category)}</span>
                  <span className="font-medium tabular-nums">{euro.format(row.amount)}</span>
                </div>
                <div className="bg-muted/60 h-1.5 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{ width: `${maxAmount > 0 ? (row.amount / maxAmount) * 100 : 0}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>

          {data.receipts.length > 0 ? (
            <div>
              <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-[0.08em] uppercase">
                Tickets récents
              </p>
              <ul className="bg-muted/30 flex flex-col gap-0.5 rounded-xl p-1">
                {data.receipts.map((receipt) => (
                  <li
                    key={receipt.id}
                    className="hover:bg-background/60 flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors"
                  >
                    <span className="truncate">
                      <span className="font-medium">{receipt.store ?? "Ticket"}</span>
                      <span className="text-muted-foreground">
                        {" · "}
                        {new Date(`${receipt.purchased_at}T00:00:00`).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {receipt.total != null ? euro.format(receipt.total) : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}

      {/* Plafond mensuel : bouton d'ajustement inline, discret mais accessible. */}
      <label className="border-border/60 flex items-center justify-between gap-3 border-t pt-4 text-[13px]">
        <span className="font-medium">Plafond mensuel</span>
        <span className="flex items-center gap-1.5">
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            value={limitInput}
            onChange={(event) => setLimitInput(event.target.value)}
            onBlur={saveLimit}
            placeholder="—"
            aria-label="Plafond de budget mensuel en euros"
            className="h-9 w-24 rounded-lg text-right tabular-nums"
          />
          <span className="text-muted-foreground text-sm">€</span>
        </span>
      </label>
    </div>
  );
}

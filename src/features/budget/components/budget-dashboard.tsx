"use client";

import { ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { categoryLabel } from "@/config/constants";
import { useActiveFamily } from "@/features/family/components/family-provider";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

import { useMonthlyBudget, useSetFamilyBudget } from "../hooks/use-budget";

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
  const overBudget = limit != null && limit > 0 && data != null && data.total > limit;
  const nearBudget =
    limit != null && limit > 0 && data != null && !overBudget && data.total >= limit * 0.8;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="text-primary size-4" />
          Dépenses
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => shiftMonth(-1)}
            aria-label="Mois précédent"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-medium capitalize">
            {MONTHS[month]} {year}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => shiftMonth(1)}
            aria-label="Mois suivant"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Chargement…</p>
        ) : !data || data.byCategory.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            Aucune dépense ce mois-ci.
            <br />
            Scanne un ticket de caisse pour commencer.
          </p>
        ) : (
          <>
            <div className="text-center">
              <p
                className={cn(
                  "text-2xl font-bold tabular-nums",
                  overBudget && "text-destructive",
                )}
              >
                {euro.format(data.total)}
              </p>
              <p className="text-muted-foreground text-xs">
                total du mois{limit != null && limit > 0 ? ` · plafond ${euro.format(limit)}` : ""}
              </p>
            </div>

            {limit != null && limit > 0 ? (
              <div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className={cn(
                      "h-full rounded-full",
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
                    "mt-1 text-center text-xs",
                    overBudget
                      ? "text-destructive font-medium"
                      : nearBudget
                        ? "font-medium text-amber-600 dark:text-amber-400"
                        : "text-muted-foreground",
                  )}
                >
                  {overBudget
                    ? `Plafond dépassé de ${euro.format(data.total - limit)}`
                    : `Il reste ${euro.format(limit - data.total)}`}
                </p>
              </div>
            ) : null}

            <ul className="flex flex-col gap-2">
              {data.byCategory.map((row) => (
                <li key={row.category}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{categoryLabel(row.category)}</span>
                    <span className="font-medium tabular-nums">{euro.format(row.amount)}</span>
                  </div>
                  <div className="bg-muted h-2 overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full rounded-full"
                      style={{ width: `${maxAmount > 0 ? (row.amount / maxAmount) * 100 : 0}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>

            {data.receipts.length > 0 ? (
              <div>
                <p className="text-muted-foreground mt-2 mb-1 text-xs font-medium uppercase">
                  Tickets
                </p>
                <ul className="divide-border divide-y text-sm">
                  {data.receipts.map((receipt) => (
                    <li key={receipt.id} className="flex justify-between gap-2 py-1.5">
                      <span className="truncate">
                        {receipt.store ?? "Ticket"} ·{" "}
                        {new Date(`${receipt.purchased_at}T00:00:00`).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {receipt.total != null ? euro.format(receipt.total) : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}

        <label className="flex items-center justify-between gap-3 border-t pt-3 text-sm">
          <span>Plafond mensuel</span>
          <span className="flex items-center gap-1">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              value={limitInput}
              onChange={(event) => setLimitInput(event.target.value)}
              onBlur={saveLimit}
              placeholder="—"
              aria-label="Plafond de budget mensuel en euros"
              className="h-9 w-24 text-right"
            />
            <span className="text-muted-foreground">€</span>
          </span>
        </label>
      </CardContent>
    </Card>
  );
}

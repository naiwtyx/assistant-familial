"use client";

import {
  ChevronLeft,
  ChevronRight,
  Info,
  Receipt,
  Sparkles,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categoryLabel } from "@/config/constants";
import { useActiveFamily } from "@/features/family/components/family-provider";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

import {
  useBudgetMetrics,
  useMonthlyBudget,
  useMonthlyComparison,
  useSetFamilyBudget,
} from "../hooks/use-budget";
import { computeBudgetStatus } from "../lib/budget-status";
import { projectMonthEnd, type WeekBucket } from "../lib/metrics";

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
  const { data: metrics } = useBudgetMetrics(familyId);

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

  // Projection fin de mois : uniquement pour le mois courant, avec assez de jours.
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const projection =
    isCurrentMonth && data ? projectMonthEnd(data.total, now.getDate(), daysInMonth) : null;

  // Une seule alerte, la plus pertinente (jamais d'alerte artificielle § 7).
  const alert = (() => {
    if (!isCurrentMonth) return null;
    if (projection != null && hasLimit) {
      if (projection > limit) {
        return {
          tone: "warn" as const,
          text: `Au rythme actuel, vous risquez de dépasser votre budget d'environ ${euro.format(projection - limit)}.`,
        };
      }
      return {
        tone: "ok" as const,
        text: `Au rythme actuel, vous devriez rester dans votre budget (~${euro.format(projection)} projetés).`,
      };
    }
    if (metrics?.weeklyAverage && metrics.thisWeek > 0) {
      const diff = (metrics.thisWeek - metrics.weeklyAverage) / metrics.weeklyAverage;
      if (Math.abs(diff) >= 0.1) {
        const pct = Math.round(Math.abs(diff) * 100);
        return diff < 0
          ? { tone: "ok" as const, text: `Vous dépensez ${pct}% de moins que d'habitude cette semaine.` }
          : { tone: "info" as const, text: `Vous dépensez ${pct}% de plus que d'habitude cette semaine.` };
      }
    }
    return null;
  })();

  const showMetrics = isCurrentMonth && metrics != null && metrics.receiptCount >= 3;

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

          {/* Alerte contextuelle (projection / rythme) — priorité visuelle haute. */}
          {alert ? (
            <div
              className={cn(
                "flex items-start gap-2.5 rounded-2xl p-3.5",
                alert.tone === "warn" &&
                  "border border-amber-500/25 bg-amber-500/5 dark:border-amber-400/25 dark:bg-amber-400/8",
                alert.tone === "ok" &&
                  "border border-emerald-500/25 bg-emerald-500/5 dark:border-emerald-400/25 dark:bg-emerald-400/8",
                alert.tone === "info" && "bg-primary/5 border-primary/15 border",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 shrink-0",
                  alert.tone === "warn" && "text-amber-600 dark:text-amber-400",
                  alert.tone === "ok" && "text-emerald-600 dark:text-emerald-400",
                  alert.tone === "info" && "text-primary",
                )}
              >
                {alert.tone === "warn" ? (
                  <TriangleAlert className="size-4" strokeWidth={2} />
                ) : alert.tone === "ok" ? (
                  <Sparkles className="size-4" strokeWidth={2} />
                ) : (
                  <Info className="size-4" strokeWidth={2} />
                )}
              </span>
              <p className="text-[13px] leading-snug">{alert.text}</p>
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

      {/* Tendances récentes (semaine, panier moyen, évolution) — mois courant
          uniquement, et seulement avec assez de tickets (§ 26). */}
      {showMetrics && metrics ? (
        <div className="border-border/60 flex flex-col gap-4 border-t pt-4">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Cette semaine" value={euro.format(metrics.thisWeek)} />
            <Metric label="Semaine précédente" value={euro.format(metrics.lastWeek)} />
            {metrics.weeklyAverage != null ? (
              <Metric label="Moyenne hebdo" value={euro.format(metrics.weeklyAverage)} />
            ) : null}
            {metrics.averageBasket != null ? (
              <Metric label="Panier moyen" value={euro.format(metrics.averageBasket)} />
            ) : null}
          </div>

          {metrics.weeks.filter((w) => w.total > 0).length >= 2 ? (
            <div>
              <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-[0.08em] uppercase">
                Évolution · 6 semaines
              </p>
              <WeeklyChart weeks={metrics.weeks} />
            </div>
          ) : null}
        </div>
      ) : null}

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

/** Petite métrique : libellé discret + valeur mise en avant. */
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/40 flex flex-col gap-0.5 rounded-xl p-3">
      <span className="text-muted-foreground text-[11px]">{label}</span>
      <span className="font-heading text-[17px] font-semibold tabular-nums">{value}</span>
    </div>
  );
}

const euroCompact = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

/**
 * Graphique d'évolution sobre : une barre par semaine, hauteur proportionnelle,
 * couleur d'accent, semaine courante mise en avant, valeur au-dessus. Pas de
 * librairie de charts (léger, thème-aware, § 22).
 */
function WeeklyChart({ weeks }: { weeks: WeekBucket[] }) {
  const max = Math.max(...weeks.map((w) => w.total), 1);
  return (
    <div className="flex items-end justify-between gap-1.5">
      {weeks.map((week, index) => {
        const isCurrent = index === weeks.length - 1;
        const heightPct = week.total > 0 ? Math.max(6, (week.total / max) * 100) : 3;
        const date = new Date(`${week.weekStartIso}T00:00:00`);
        return (
          <div key={week.weekStartIso} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className="text-muted-foreground text-[10px] tabular-nums">
              {week.total > 0 ? euroCompact.format(week.total) : "—"}
            </span>
            <div className="bg-muted/50 flex h-20 w-full items-end overflow-hidden rounded-md">
              <div
                className={cn(
                  "w-full rounded-md transition-all",
                  isCurrent ? "bg-primary" : "bg-primary/40",
                )}
                style={{ height: `${heightPct}%` }}
              />
            </div>
            <span className="text-muted-foreground text-[10px]">
              {date.toLocaleDateString("fr-FR", { day: "numeric", month: "numeric" })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

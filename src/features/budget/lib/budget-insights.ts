import type { CategoryTotal } from "./aggregate";

export type CategoryComparison = {
  category: string;
  amount: number;
  previousAmount: number;
  /** % d'évolution vs le mois précédent. null si pas de dépense le mois précédent (pas comparable). */
  changePercent: number | null;
};

export type MonthlyComparison = {
  total: number;
  previousTotal: number;
  changeAmount: number;
  changePercent: number | null;
  categories: CategoryComparison[];
};

/** Compare les dépenses du mois courant à celles du mois précédent, globalement et par catégorie. */
export function compareMonthlySpending(
  current: { total: number; byCategory: CategoryTotal[] },
  previous: { total: number; byCategory: CategoryTotal[] },
): MonthlyComparison {
  const changeAmount = current.total - previous.total;
  const changePercent = previous.total > 0 ? (changeAmount / previous.total) * 100 : null;

  const previousByCategory = new Map(previous.byCategory.map((row) => [row.category, row.amount]));
  const categories = current.byCategory.map((row) => {
    const previousAmount = previousByCategory.get(row.category) ?? 0;
    return {
      category: row.category,
      amount: row.amount,
      previousAmount,
      changePercent: previousAmount > 0 ? ((row.amount - previousAmount) / previousAmount) * 100 : null,
    };
  });

  return { total: current.total, previousTotal: previous.total, changeAmount, changePercent, categories };
}

const SIGNIFICANT_INCREASE_PERCENT = 30;
const SIGNIFICANT_INCREASE_MIN_AMOUNT = 15;

/** Catégories dont la dépense a significativement augmenté (utile pour alerter/résumer). */
export function significantIncreases(comparison: MonthlyComparison): CategoryComparison[] {
  return comparison.categories.filter(
    (row) =>
      row.changePercent != null &&
      row.changePercent >= SIGNIFICANT_INCREASE_PERCENT &&
      row.amount - row.previousAmount >= SIGNIFICANT_INCREASE_MIN_AMOUNT,
  );
}

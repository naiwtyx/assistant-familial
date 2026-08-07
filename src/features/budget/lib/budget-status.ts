export type BudgetStatus = {
  overBudget: boolean;
  nearBudget: boolean;
  /** Montant restant avant d'atteindre le plafond, ou null si pas de plafond ou dépassé. */
  remaining: number | null;
  /** Montant du dépassement, ou null si pas dépassé. */
  overage: number | null;
};

const NEAR_BUDGET_THRESHOLD = 0.8;

/** Calcule où en est le mois par rapport au plafond (`limit`). `limit` <= 0 ou null = pas de plafond. */
export function computeBudgetStatus(total: number, limit: number | null): BudgetStatus {
  const hasLimit = limit != null && limit > 0;
  if (!hasLimit) {
    return { overBudget: false, nearBudget: false, remaining: null, overage: null };
  }

  const overBudget = total > limit;
  const nearBudget = !overBudget && total >= limit * NEAR_BUDGET_THRESHOLD;

  return {
    overBudget,
    nearBudget,
    remaining: overBudget ? null : limit - total,
    overage: overBudget ? total - limit : null,
  };
}

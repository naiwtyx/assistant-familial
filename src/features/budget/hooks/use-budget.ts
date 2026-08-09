"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getBudgetMetrics,
  getMonthlyBudget,
  getMonthlyComparison,
  saveReceipt,
  setFamilyBudget,
  type SaveReceiptInput,
} from "../services/budget.service";

export const budgetKeys = {
  all: (familyId: string) => ["budget", familyId] as const,
  month: (familyId: string, year: number, month: number) =>
    ["budget", familyId, year, month] as const,
  comparison: (familyId: string, year: number, month: number) =>
    ["budget", familyId, year, month, "comparison"] as const,
  metrics: (familyId: string) => ["budget", familyId, "metrics"] as const,
};

export function useSaveReceipt(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<SaveReceiptInput, "familyId">) => saveReceipt({ ...input, familyId }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: budgetKeys.all(familyId) });
    },
  });
}

export function useMonthlyBudget(familyId: string, year: number, month: number) {
  return useQuery({
    queryKey: budgetKeys.month(familyId, year, month),
    queryFn: () => getMonthlyBudget(familyId, year, month),
  });
}

export function useMonthlyComparison(familyId: string, year: number, month: number) {
  return useQuery({
    queryKey: budgetKeys.comparison(familyId, year, month),
    queryFn: () => getMonthlyComparison(familyId, year, month),
  });
}

export function useBudgetMetrics(familyId: string) {
  return useQuery({
    queryKey: budgetKeys.metrics(familyId),
    queryFn: () => getBudgetMetrics(familyId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSetFamilyBudget(familyId: string) {
  return useMutation({
    mutationFn: (budget: number | null) => setFamilyBudget(familyId, budget),
  });
}

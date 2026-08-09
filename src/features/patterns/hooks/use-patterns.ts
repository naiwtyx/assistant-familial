"use client";

import { useQuery } from "@tanstack/react-query";

import { getHouseholdPatterns } from "../services/patterns.service";

export function useHouseholdPatterns(familyId: string) {
  return useQuery({
    queryKey: ["household-patterns", familyId],
    queryFn: () => getHouseholdPatterns(familyId),
    staleTime: 5 * 60 * 1000, // les habitudes bougent lentement : pas la peine de recalculer souvent
  });
}

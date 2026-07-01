"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { FamilyRole } from "../lib/roles";
import {
  createFamily,
  createInvite,
  getFamilyMembers,
  joinFamily,
  setMemberRole,
} from "../services/family.service";

export const familyKeys = {
  members: (familyId: string) => ["family-members", familyId] as const,
};

export function useCreateFamily() {
  return useMutation({ mutationFn: createFamily });
}

export function useJoinFamily() {
  return useMutation({ mutationFn: joinFamily });
}

export function useFamilyMembers(familyId: string) {
  return useQuery({
    queryKey: familyKeys.members(familyId),
    queryFn: () => getFamilyMembers(familyId),
  });
}

export function useCreateInvite(familyId: string) {
  return useMutation({ mutationFn: () => createInvite(familyId) });
}

export function useSetMemberRole(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: Exclude<FamilyRole, "owner"> }) =>
      setMemberRole(familyId, userId, role),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: familyKeys.members(familyId) });
    },
  });
}

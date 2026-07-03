"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { FamilyRole } from "../lib/roles";
import {
  approveInvite,
  createFamily,
  getFamilyMembers,
  getPendingInvites,
  joinFamily,
  setFamilyAiMinAge,
  setFamilyShoppingDay,
  setMemberBirthDate,
  setMemberPermission,
  setMemberRole,
} from "../services/family.service";

export const familyKeys = {
  members: (familyId: string) => ["family-members", familyId] as const,
  pendingInvites: (familyId: string) => ["pending-invites", familyId] as const,
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

export function usePendingInvites(familyId: string) {
  return useQuery({
    queryKey: familyKeys.pendingInvites(familyId),
    queryFn: () => getPendingInvites(familyId),
  });
}

export function useApproveInvite(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => approveInvite(inviteId),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: familyKeys.pendingInvites(familyId) });
    },
  });
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

export function useSetMemberPermission(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, canUseAi }: { userId: string; canUseAi: boolean }) =>
      setMemberPermission(familyId, userId, canUseAi),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: familyKeys.members(familyId) });
    },
  });
}

export function useSetMemberBirthDate(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, birthDate }: { userId: string; birthDate: string | null }) =>
      setMemberBirthDate(familyId, userId, birthDate),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: familyKeys.members(familyId) });
    },
  });
}

export function useSetFamilyAiMinAge(familyId: string) {
  return useMutation({
    mutationFn: (minAge: number | null) => setFamilyAiMinAge(familyId, minAge),
  });
}

export function useSetFamilyShoppingDay(familyId: string) {
  return useMutation({
    mutationFn: (day: number | null) => setFamilyShoppingDay(familyId, day),
  });
}

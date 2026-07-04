"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useRealtimeTable } from "@/hooks/use-realtime-table";

import {
  addChore,
  deleteChore,
  getChoreLeaderboard,
  getChores,
  setChoreDone,
  updateChore,
  type ChoreInput,
} from "../services/chores.service";

export const choresKeys = {
  list: (familyId: string) => ["chores", familyId] as const,
  leaderboard: (familyId: string) => ["chore-leaderboard", familyId] as const,
};

export function useChores(familyId: string) {
  const query = useQuery({
    queryKey: choresKeys.list(familyId),
    queryFn: () => getChores(familyId),
  });
  useRealtimeTable("chores", familyId, choresKeys.list(familyId));
  return query;
}

export function useChoreLeaderboard(familyId: string) {
  const query = useQuery({
    queryKey: choresKeys.leaderboard(familyId),
    queryFn: () => getChoreLeaderboard(familyId),
  });
  useRealtimeTable("activity_log", familyId, choresKeys.leaderboard(familyId));
  return query;
}

function useInvalidate(familyId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: choresKeys.list(familyId) });
}

export function useAddChore(familyId: string) {
  const invalidate = useInvalidate(familyId);
  return useMutation({
    mutationFn: (input: ChoreInput) => addChore(input),
    onSettled: invalidate,
  });
}

export function useUpdateChore(familyId: string) {
  const invalidate = useInvalidate(familyId);
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ChoreInput }) => updateChore(id, input),
    onSettled: invalidate,
  });
}

export function useSetChoreDone(familyId: string) {
  const invalidate = useInvalidate(familyId);
  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => setChoreDone(id, done),
    onSettled: invalidate,
  });
}

export function useDeleteChore(familyId: string) {
  const invalidate = useInvalidate(familyId);
  return useMutation({
    mutationFn: (id: string) => deleteChore(id),
    onSettled: invalidate,
  });
}

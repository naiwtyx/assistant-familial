"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useRealtimeTable } from "@/hooks/use-realtime-table";

import {
  addChore,
  deleteChore,
  getChores,
  setChoreDone,
  type AddChoreInput,
} from "../services/chores.service";

export const choresKeys = {
  list: (familyId: string) => ["chores", familyId] as const,
};

export function useChores(familyId: string) {
  const query = useQuery({
    queryKey: choresKeys.list(familyId),
    queryFn: () => getChores(familyId),
  });
  useRealtimeTable("chores", familyId, choresKeys.list(familyId));
  return query;
}

function useInvalidate(familyId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: choresKeys.list(familyId) });
}

export function useAddChore(familyId: string) {
  const invalidate = useInvalidate(familyId);
  return useMutation({
    mutationFn: (input: AddChoreInput) => addChore(input),
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

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useRealtimeTable } from "@/hooks/use-realtime-table";

import {
  addSuggestion,
  deleteSuggestion,
  getSuggestions,
  setSuggestionDone,
} from "../services/ideas.service";

export const ideasKeys = {
  list: (familyId: string) => ["suggestions", familyId] as const,
};

export function useSuggestions(familyId: string) {
  const query = useQuery({
    queryKey: ideasKeys.list(familyId),
    queryFn: () => getSuggestions(familyId),
  });
  useRealtimeTable("suggestions", familyId, ideasKeys.list(familyId));
  return query;
}

function useInvalidate(familyId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ideasKeys.list(familyId) });
}

export function useAddSuggestion(familyId: string) {
  const invalidate = useInvalidate(familyId);
  return useMutation({
    mutationFn: (content: string) => addSuggestion(familyId, content),
    onSettled: invalidate,
  });
}

export function useSetSuggestionDone(familyId: string) {
  const invalidate = useInvalidate(familyId);
  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => setSuggestionDone(id, done),
    onSettled: invalidate,
  });
}

export function useDeleteSuggestion(familyId: string) {
  const invalidate = useInvalidate(familyId);
  return useMutation({
    mutationFn: (id: string) => deleteSuggestion(id),
    onSettled: invalidate,
  });
}

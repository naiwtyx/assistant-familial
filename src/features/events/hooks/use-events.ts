"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useRealtimeTable } from "@/hooks/use-realtime-table";

import { addEvent, deleteEvent, getUpcomingEvents, type AddEventInput } from "../services/events.service";

export const eventsKeys = {
  list: (familyId: string) => ["events", familyId] as const,
};

export function useEvents(familyId: string) {
  const query = useQuery({
    queryKey: eventsKeys.list(familyId),
    queryFn: () => getUpcomingEvents(familyId),
  });
  useRealtimeTable("events", familyId, eventsKeys.list(familyId));
  return query;
}

function useInvalidate(familyId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: eventsKeys.list(familyId) });
}

export function useAddEvent(familyId: string) {
  const invalidate = useInvalidate(familyId);
  return useMutation({
    mutationFn: (input: AddEventInput) => addEvent(familyId, input),
    onSettled: invalidate,
  });
}

export function useDeleteEvent(familyId: string) {
  const invalidate = useInvalidate(familyId);
  return useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSettled: invalidate,
  });
}

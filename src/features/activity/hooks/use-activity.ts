"use client";

import { useQuery } from "@tanstack/react-query";

import { useRealtimeTable } from "@/hooks/use-realtime-table";

import { getActivity } from "../services/activity.service";

export const activityKeys = {
  list: (familyId: string) => ["activity", familyId] as const,
};

export function useActivity(familyId: string) {
  const query = useQuery({
    queryKey: activityKeys.list(familyId),
    queryFn: () => getActivity(familyId),
  });
  useRealtimeTable("activity_log", familyId, activityKeys.list(familyId));
  return query;
}

import { createClient } from "@/lib/supabase/client";
import type { FamilyEvent } from "@/types/db";

export type AddEventInput = {
  title: string;
  date: string;
  time: string | null;
  note: string | null;
};

function todayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Événements à venir (aujourd'hui et après), triés par date puis heure. */
export async function getUpcomingEvents(familyId: string): Promise<FamilyEvent[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("family_id", familyId)
    .gte("event_date", todayISO())
    .order("event_date", { ascending: true })
    .order("event_time", { ascending: true, nullsFirst: true });
  if (error) throw error;
  return data;
}

export async function addEvent(familyId: string, input: AddEventInput): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("events").insert({
    family_id: familyId,
    title: input.title.trim(),
    event_date: input.date,
    event_time: input.time,
    note: input.note,
    created_by: user?.id ?? null,
  });
  if (error) throw error;
}

export async function deleteEvent(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
}

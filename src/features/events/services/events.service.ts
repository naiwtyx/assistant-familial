import { logActivity } from "@/features/activity/services/activity.service";
import { createClient } from "@/lib/supabase/client";
import type { FamilyEvent } from "@/types/db";

export type EventRecurrence = "weekly" | "monthly";
export type AddEventInput = {
  title: string;
  date: string;
  time: string | null;
  note: string | null;
  recurrence: EventRecurrence | null;
};

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Prochaine occurrence (>= aujourd'hui) d'un événement récurrent. */
function nextOccurrence(baseISO: string, recurrence: EventRecurrence): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${baseISO}T00:00:00`);
  let guard = 0;
  while (date < today && guard < 1200) {
    if (recurrence === "weekly") date.setDate(date.getDate() + 7);
    else date.setMonth(date.getMonth() + 1);
    guard += 1;
  }
  return toISODate(date);
}

/**
 * Événements à venir : ponctuels (date future) + prochaine occurrence des
 * événements récurrents. Triés par date puis heure.
 */
export async function getUpcomingEvents(familyId: string): Promise<FamilyEvent[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("events").select("*").eq("family_id", familyId);
  if (error) throw error;

  const today = toISODate(new Date());
  const result: FamilyEvent[] = [];
  for (const event of data) {
    if (!event.recurrence) {
      if (event.event_date >= today) result.push(event);
    } else {
      const next = nextOccurrence(event.event_date, event.recurrence as EventRecurrence);
      result.push({ ...event, event_date: next });
    }
  }

  result.sort(
    (a, b) =>
      a.event_date.localeCompare(b.event_date) ||
      (a.event_time ?? "").localeCompare(b.event_time ?? ""),
  );
  return result;
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
    recurrence: input.recurrence,
    created_by: user?.id ?? null,
  });
  if (error) throw error;
  void logActivity(familyId, "event_add", { title: input.title.trim() });
}

export async function deleteEvent(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
}

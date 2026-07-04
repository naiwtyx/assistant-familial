import { logActivity } from "@/features/activity/services/activity.service";
import { createClient } from "@/lib/supabase/client";
import type { Chore } from "@/types/db";

export type ChoreRecurrence = "daily" | "weekly";
export type ChoreWithAssignees = Chore & { assigneeNames: string[] };

export type ChoreInput = {
  title: string;
  assigneeIds: string[];
  dueDate: string | null;
  points: number;
  recurrence: ChoreRecurrence | null;
};

/** Tâches de la famille, enrichies des prénoms des personnes assignées. */
export async function getChores(familyId: string): Promise<ChoreWithAssignees[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chores")
    .select("*")
    .eq("family_id", familyId)
    .order("done", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;

  const allIds = [...new Set(data.flatMap((chore) => chore.assignee_ids ?? []))];
  const byId = new Map<string, string>();
  if (allIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,display_name")
      .in("id", allIds);
    for (const profile of profiles ?? []) byId.set(profile.id, profile.display_name);
  }

  return data.map((chore) => {
    const assigneeIds = chore.assignee_ids ?? [];
    return {
      ...chore,
      assignee_ids: assigneeIds,
      assigneeNames: assigneeIds.map((id) => byId.get(id) ?? "Membre"),
    };
  });
}

/** Classement des points de la semaine, crédités à la personne qui a fait la tâche. */
export async function getChoreLeaderboard(
  familyId: string,
): Promise<{ name: string; points: number }[]> {
  const supabase = createClient();
  const weekStart = startOfWeekISO();

  const { data, error } = await supabase
    .from("activity_log")
    .select("user_id,payload")
    .eq("family_id", familyId)
    .eq("type", "chore_done")
    .gte("created_at", weekStart);
  if (error) throw error;

  const byUser = new Map<string, number>();
  for (const entry of data ?? []) {
    if (!entry.user_id) continue;
    const payload = (entry.payload ?? {}) as Record<string, unknown>;
    const points = typeof payload.points === "number" ? payload.points : 0;
    byUser.set(entry.user_id, (byUser.get(entry.user_id) ?? 0) + points);
  }

  const userIds = [...byUser.keys()];
  if (userIds.length === 0) return [];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id,display_name")
    .in("id", userIds);
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

  return userIds
    .map((id) => ({ name: nameById.get(id) ?? "Membre", points: byUser.get(id) ?? 0 }))
    .sort((a, b) => b.points - a.points);
}

/** Crée une tâche via l'API serveur (qui notifie les personnes assignées). */
export async function addChore(input: ChoreInput): Promise<void> {
  const response = await fetch("/api/chores/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(data?.error ?? "Impossible de créer la tâche.");
  }
}

/** Modifie une tâche (créateur ou parent ; contrôlé côté base). */
export async function updateChore(id: string, input: ChoreInput): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("update_chore", {
    p_id: id,
    p_title: input.title.trim(),
    p_assignee_ids: input.assigneeIds,
    p_due_date: input.dueDate,
    p_points: input.points,
    p_recurrence: input.recurrence,
  });
  if (error) throw error;
}

function startOfWeekISO(): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return date.toISOString();
}

function nextDueDate(current: string | null, recurrence: ChoreRecurrence): string {
  const base = current ? new Date(`${current}T00:00:00`) : new Date();
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() + (recurrence === "weekly" ? 7 : 1));
  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, "0");
  const day = String(base.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Coche/décoche une tâche.
 * - Tâche récurrente cochée : au lieu de créer un doublon, on fait AVANCER la
 *   même tâche à la prochaine échéance (elle reste unique dans la liste).
 * - Tâche ponctuelle : simple bascule fait / à faire.
 * Chaque « fait » est journalisé (points crédités à la personne qui l'a faite).
 * Retourne la nouvelle échéance si la tâche a été reportée, sinon null.
 */
export async function setChoreDone(id: string, done: boolean): Promise<string | null> {
  const supabase = createClient();
  const { data: chore, error: fetchError } = await supabase
    .from("chores")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchError) throw fetchError;

  if (done && chore.recurrence) {
    const recurrence = chore.recurrence as ChoreRecurrence;
    const next = nextDueDate(chore.due_date, recurrence);
    const { error } = await supabase
      .from("chores")
      .update({ due_date: next, done: false, done_at: null })
      .eq("id", id);
    if (error) throw error;
    void logActivity(chore.family_id, "chore_done", { title: chore.title, points: chore.points });
    return next;
  }

  const { error } = await supabase
    .from("chores")
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
  if (done) {
    void logActivity(chore.family_id, "chore_done", { title: chore.title, points: chore.points });
  }
  return null;
}

export async function deleteChore(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("chores").delete().eq("id", id);
  if (error) throw error;
}

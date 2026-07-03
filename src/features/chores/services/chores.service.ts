import { createClient } from "@/lib/supabase/client";
import type { Chore } from "@/types/db";

export type ChoreWithAssignee = Chore & { assigneeName: string | null };

export type AddChoreInput = {
  title: string;
  assignedTo: string | null;
  dueDate: string | null;
};

/** Tâches de la famille, enrichies du prénom de la personne assignée. */
export async function getChores(familyId: string): Promise<ChoreWithAssignee[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chores")
    .select("*")
    .eq("family_id", familyId)
    .order("done", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;

  const assigneeIds = [...new Set(data.map((c) => c.assigned_to).filter(Boolean))] as string[];
  const byId = new Map<string, string>();
  if (assigneeIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,display_name")
      .in("id", assigneeIds);
    for (const profile of profiles ?? []) byId.set(profile.id, profile.display_name);
  }

  return data.map((chore) => ({
    ...chore,
    assigneeName: chore.assigned_to ? (byId.get(chore.assigned_to) ?? null) : null,
  }));
}

export async function addChore(familyId: string, input: AddChoreInput): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("chores").insert({
    family_id: familyId,
    title: input.title.trim(),
    assigned_to: input.assignedTo,
    due_date: input.dueDate,
    created_by: user?.id ?? null,
  });
  if (error) throw error;
}

export async function setChoreDone(id: string, done: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("chores")
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteChore(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("chores").delete().eq("id", id);
  if (error) throw error;
}

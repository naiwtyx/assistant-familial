import { createClient } from "@/lib/supabase/client";
import type { ActivityLog } from "@/types/db";

export type ActivityWithAuthor = ActivityLog & { authorName: string | null };

/**
 * Enregistre une action dans le journal d'activité. Best-effort : n'interrompt
 * jamais l'action principale si l'écriture échoue.
 */
export async function logActivity(
  familyId: string,
  type: string,
  payload: Record<string, string | number> = {},
): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("activity_log").insert({
      family_id: familyId,
      user_id: user.id,
      type,
      payload,
    });
  } catch {
    // Journalisation silencieuse : sans effet sur l'action de l'utilisateur.
  }
}

/** Dernières activités de la famille (50 max), enrichies du prénom de l'auteur. */
export async function getActivity(familyId: string): Promise<ActivityWithAuthor[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;

  const authorIds = [...new Set(data.map((a) => a.user_id).filter(Boolean))] as string[];
  const byId = new Map<string, string>();
  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,display_name")
      .in("id", authorIds);
    for (const profile of profiles ?? []) byId.set(profile.id, profile.display_name);
  }

  return data.map((entry) => ({
    ...entry,
    authorName: entry.user_id ? (byId.get(entry.user_id) ?? null) : null,
  }));
}

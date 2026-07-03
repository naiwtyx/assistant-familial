import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type Suggestion = Database["public"]["Tables"]["suggestions"]["Row"];
export type SuggestionWithAuthor = Suggestion & { authorName: string | null };

/** Idées de la famille, enrichies du prénom de l'auteur. Non faites d'abord. */
export async function getSuggestions(familyId: string): Promise<SuggestionWithAuthor[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("suggestions")
    .select("*")
    .eq("family_id", familyId)
    .order("done", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;

  const authorIds = [...new Set(data.map((s) => s.created_by).filter(Boolean))] as string[];
  const byId = new Map<string, string>();
  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,display_name")
      .in("id", authorIds);
    for (const profile of profiles ?? []) byId.set(profile.id, profile.display_name);
  }

  return data.map((suggestion) => ({
    ...suggestion,
    authorName: suggestion.created_by ? (byId.get(suggestion.created_by) ?? null) : null,
  }));
}

export async function addSuggestion(familyId: string, content: string): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("suggestions").insert({
    family_id: familyId,
    content: content.trim(),
    created_by: user?.id ?? null,
  });
  if (error) throw error;
}

export async function setSuggestionDone(id: string, done: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("suggestions").update({ done }).eq("id", id);
  if (error) throw error;
}

export async function deleteSuggestion(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("suggestions").delete().eq("id", id);
  if (error) throw error;
}

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type Suggestion = Database["public"]["Tables"]["suggestions"]["Row"];
export type SuggestionWithAuthor = Suggestion & {
  authorName: string | null;
  voteCount: number;
  hasVoted: boolean;
};

/**
 * Idées de la famille, enrichies du prénom de l'auteur et des votes.
 * Tri : à faire d'abord, puis les plus votées, puis les plus récentes.
 */
export async function getSuggestions(familyId: string): Promise<SuggestionWithAuthor[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("suggestions")
    .select("*")
    .eq("family_id", familyId);
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

  const { data: votes } = await supabase
    .from("suggestion_votes")
    .select("suggestion_id,user_id")
    .eq("family_id", familyId);
  const countBySuggestion = new Map<string, number>();
  const votedByMe = new Set<string>();
  for (const vote of votes ?? []) {
    countBySuggestion.set(vote.suggestion_id, (countBySuggestion.get(vote.suggestion_id) ?? 0) + 1);
    if (vote.user_id === user?.id) votedByMe.add(vote.suggestion_id);
  }

  return data
    .map((suggestion) => ({
      ...suggestion,
      authorName: suggestion.created_by ? (byId.get(suggestion.created_by) ?? null) : null,
      voteCount: countBySuggestion.get(suggestion.id) ?? 0,
      hasVoted: votedByMe.has(suggestion.id),
    }))
    .sort(
      (a, b) =>
        Number(a.done) - Number(b.done) ||
        b.voteCount - a.voteCount ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
}

/** Ajoute ou retire le vote de l'utilisateur courant sur une idée. */
export async function toggleSuggestionVote(
  suggestionId: string,
  familyId: string,
  hasVoted: boolean,
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentification requise.");

  if (hasVoted) {
    const { error } = await supabase
      .from("suggestion_votes")
      .delete()
      .eq("suggestion_id", suggestionId)
      .eq("user_id", user.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("suggestion_votes")
      .insert({ suggestion_id: suggestionId, user_id: user.id, family_id: familyId });
    if (error) throw error;
  }
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

export async function updateSuggestion(id: string, content: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("suggestions")
    .update({ content: content.trim() })
    .eq("id", id);
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

import { createClient } from "@/lib/supabase/client";
import type { Family, FamilyInvite, FamilyMember, Profile } from "@/types/db";

import { generateInviteCode, normalizeInviteCode } from "../lib/invite-code";
import type { CreateFamilyInput, JoinFamilyInput } from "../schemas/family.schema";

export type FamilyMemberWithProfile = FamilyMember & { profile: Profile | null };

/**
 * Couche métier "famille". Fonctions pures réutilisables (UI + futur assistant IA).
 * Les mutations sensibles passent par les RPC SECURITY DEFINER de la base.
 */

export async function createFamily({ name }: CreateFamilyInput): Promise<Family> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_family", { p_name: name });
  if (error) throw error;
  return data;
}

export async function joinFamily({ code }: JoinFamilyInput): Promise<Family> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("join_family_with_code", {
    p_code: normalizeInviteCode(code),
  });
  if (error) throw error;
  return data;
}

/** Familles de l'utilisateur courant (filtrées par RLS). */
export async function getMyFamilies(): Promise<Family[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("families")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

/** Membres d'une famille, enrichis de leur profil (nom, avatar). */
export async function getFamilyMembers(familyId: string): Promise<FamilyMemberWithProfile[]> {
  const supabase = createClient();

  const { data: members, error } = await supabase
    .from("family_members")
    .select("*")
    .eq("family_id", familyId)
    .order("joined_at", { ascending: true });
  if (error) throw error;

  const userIds = members.map((member) => member.user_id);
  if (userIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .in("id", userIds);
  if (profilesError) throw profilesError;

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  return members.map((member) => ({
    ...member,
    profile: profileById.get(member.user_id) ?? null,
  }));
}

/** Change le rôle d'un membre (réservé aux parents ; contrôlé côté base). */
export async function setMemberRole(
  familyId: string,
  userId: string,
  role: "parent" | "member",
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("set_member_role", {
    p_family_id: familyId,
    p_user_id: userId,
    p_role: role,
  });
  if (error) throw error;
}

/** Crée un code d'invitation valable un certain nombre de jours. */
export async function createInvite(familyId: string, expiresInDays = 7): Promise<FamilyInvite> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentification requise");

  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("family_invites")
    .insert({
      family_id: familyId,
      code: generateInviteCode(),
      created_by: user.id,
      expires_at: expiresAt,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

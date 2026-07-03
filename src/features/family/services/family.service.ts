import { createClient } from "@/lib/supabase/client";
import type { Family, FamilyInvite, FamilyMember, Profile } from "@/types/db";

import { normalizeInviteCode } from "../lib/invite-code";
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

/** Active/désactive un droit d'un membre (ex. accès à l'IA). Réservé aux parents (contrôlé côté base). */
export async function setMemberPermission(
  familyId: string,
  userId: string,
  canUseAi: boolean,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("set_member_permission", {
    p_family_id: familyId,
    p_user_id: userId,
    p_can_use_ai: canUseAi,
  });
  if (error) throw error;
}

export type PendingInvite = FamilyInvite & { authorName: string | null };

/** Invitations en attente d'approbation (créées par des membres). */
export async function getPendingInvites(familyId: string): Promise<PendingInvite[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("family_invites")
    .select("*")
    .eq("family_id", familyId)
    .eq("approved", false)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const authorIds = [...new Set(data.map((i) => i.created_by).filter(Boolean))] as string[];
  const byId = new Map<string, string>();
  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,display_name")
      .in("id", authorIds);
    for (const profile of profiles ?? []) byId.set(profile.id, profile.display_name);
  }

  return data.map((invite) => ({
    ...invite,
    authorName: invite.created_by ? (byId.get(invite.created_by) ?? null) : null,
  }));
}

/** Approuve une invitation en attente (réservé aux parents ; contrôlé côté base). */
export async function approveInvite(inviteId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("approve_invite", { p_invite_id: inviteId });
  if (error) throw error;
}

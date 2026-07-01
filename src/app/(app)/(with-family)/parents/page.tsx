import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ParentsView } from "@/features/family/components/parents-view";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Espace parents" };

/** Accès réservé aux parents : la garde est appliquée côté serveur. */
export default async function ParentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: families } = await supabase
    .from("families")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1);
  const family = families?.[0];
  if (!family) redirect("/onboarding");

  const { data: membership } = await supabase
    .from("family_members")
    .select("role")
    .eq("family_id", family.id)
    .eq("user_id", user.id)
    .single();

  if (!membership || (membership.role !== "owner" && membership.role !== "parent")) {
    redirect("/dashboard");
  }

  return <ParentsView />;
}

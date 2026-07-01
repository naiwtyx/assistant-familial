import { redirect } from "next/navigation";

import { BottomNav } from "@/components/shared/bottom-nav";
import { FamilyProvider } from "@/features/family/components/family-provider";
import { createClient } from "@/lib/supabase/server";

/**
 * Layout des pages nécessitant une famille (dashboard, courses, inventaire…).
 * Charge la famille active côté serveur et la fournit via le contexte.
 * Sans famille -> redirection vers l'onboarding.
 */
export default async function WithFamilyLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: families } = await supabase
    .from("families")
    .select("*")
    .order("created_at", { ascending: true });

  const activeFamily = families?.[0];
  if (!activeFamily) {
    redirect("/onboarding");
  }

  const { data: membership } = await supabase
    .from("family_members")
    .select("role")
    .eq("family_id", activeFamily.id)
    .eq("user_id", user.id)
    .single();

  return (
    <FamilyProvider
      value={{ family: activeFamily, role: membership?.role ?? "member", userId: user.id }}
    >
      {/* Zone sûre en haut (encoche) + espace en bas pour la barre fixe. */}
      <div className="pt-[env(safe-area-inset-top)] pb-24">{children}</div>
      <BottomNav />
    </FamilyProvider>
  );
}

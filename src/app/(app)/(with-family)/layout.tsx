import { redirect } from "next/navigation";

import { BottomNav } from "@/components/shared/bottom-nav";
import { FamilyProvider } from "@/features/family/components/family-provider";
import { canMemberUseAi } from "@/features/family/lib/ai-access";
import { createClient } from "@/lib/supabase/server";

/**
 * Layout des pages nécessitant une famille (dashboard, courses, inventaire…).
 * Charge la famille active côté serveur et la fournit via le contexte.
 * Sans famille -> redirection vers l'onboarding.
 */
export default async function WithFamilyLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  // Requêtes lancées en parallèle pour réduire la latence (surtout en production).
  const [userResult, familiesResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("families").select("*").order("created_at", { ascending: true }),
  ]);

  const user = userResult.data.user;
  if (!user) {
    redirect("/login");
  }

  const activeFamily = familiesResult.data?.[0];
  if (!activeFamily) {
    redirect("/onboarding");
  }

  const { data: membership } = await supabase
    .from("family_members")
    .select("role,can_use_ai,birth_date")
    .eq("family_id", activeFamily.id)
    .eq("user_id", user.id)
    .single();

  const role = membership?.role ?? "member";
  const canUseAi = canMemberUseAi({
    role,
    canUseAi: membership?.can_use_ai ?? true,
    birthDate: membership?.birth_date ?? null,
    minAge: activeFamily.ai_min_age,
  });

  return (
    <FamilyProvider
      value={{
        family: activeFamily,
        role,
        userId: user.id,
        email: user.email ?? null,
        canUseAi,
      }}
    >
      {/* Zone sûre en haut (encoche) + espace en bas pour la barre fixe. */}
      <div className="pt-[env(safe-area-inset-top)] pb-24">{children}</div>
      <BottomNav />
    </FamilyProvider>
  );
}

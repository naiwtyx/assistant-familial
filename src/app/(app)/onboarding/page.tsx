import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OnboardingView } from "@/features/family/components/onboarding-view";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Bienvenue" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: families } = await supabase.from("families").select("id").limit(1);

  // Déjà dans une famille : on file au tableau de bord.
  if (families && families.length > 0) {
    redirect("/dashboard");
  }

  return <OnboardingView />;
}

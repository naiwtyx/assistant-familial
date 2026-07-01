import type { Metadata } from "next";

import { DashboardView } from "@/features/family/components/dashboard-view";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <DashboardView userEmail={user?.email} />;
}

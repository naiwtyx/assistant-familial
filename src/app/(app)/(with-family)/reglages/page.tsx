import type { Metadata } from "next";

import { SettingsView } from "@/features/settings/components/settings-view";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Réglages" };

export default async function ReglagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <SettingsView userEmail={user?.email} />;
}

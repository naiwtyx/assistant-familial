"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { SubPageHeader } from "@/components/shared/settings-nav";

import { useMyMembership } from "./family-provider";
import { isAuthorized } from "../lib/roles";

/**
 * Cadre commun des sous-pages de l'Espace parents : garde d'accès (redirige les
 * non-parents) + en-tête « ← Espace parents » + titre. Les données restent
 * protégées côté base (RLS) ; cette garde est un confort UX.
 */
export function ParentsSubPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { role } = useMyMembership();
  const router = useRouter();
  const allowed = isAuthorized(role);

  useEffect(() => {
    if (!allowed) router.replace("/dashboard");
  }, [allowed, router]);

  if (!allowed) return null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 p-5 pb-8">
      <SubPageHeader backHref="/parents" backLabel="Espace parents" title={title} subtitle={subtitle} />
      {children}
    </main>
  );
}

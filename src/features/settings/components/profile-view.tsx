"use client";

import { SubPageHeader } from "@/components/shared/settings-nav";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { useMyMembership } from "@/features/family/components/family-provider";
import { ROLE_LABELS } from "@/features/family/lib/roles";

/** Page Profil : identité de l'utilisateur dans le foyer + déconnexion. */
export function ProfileView() {
  const { family, role, email, displayName } = useMyMembership();
  const name = displayName ?? email ?? "Compte";

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 p-5 pb-8">
      <SubPageHeader backHref="/reglages" backLabel="Réglages" title="Profil" />

      <div className="motion-in bg-card shadow-soft flex flex-col items-center gap-3 rounded-2xl p-6 text-center">
        <div className="bg-primary/10 text-primary flex size-16 items-center justify-center rounded-full text-xl font-semibold">
          {name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="font-heading text-lg font-semibold">{name}</p>
          <p className="text-muted-foreground text-sm">{ROLE_LABELS[role]}</p>
        </div>
      </div>

      <div className="motion-in-delay-1 bg-card shadow-soft divide-border/60 divide-y rounded-2xl">
        <Field label="Famille" value={family.name} />
        {email ? <Field label="Email" value={email} /> : null}
        <Field label="Rôle" value={ROLE_LABELS[role]} />
      </div>

      <div className="motion-in-delay-2">
        <SignOutButton />
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="min-w-0 truncate text-[15px] font-medium">{value}</span>
    </div>
  );
}

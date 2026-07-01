import { ShoppingBasket } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignOutButton } from "@/features/auth/components/sign-out-button";

import { CreateFamilyForm } from "./create-family-form";
import { JoinFamilyForm } from "./join-family-form";

/**
 * Écran d'accueil pour un utilisateur connecté qui n'appartient encore à aucune
 * famille : il peut en créer une, ou en rejoindre une via un code d'invitation.
 */
export function OnboardingView() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="bg-primary text-primary-foreground flex size-14 items-center justify-center rounded-2xl">
          <ShoppingBasket className="size-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bienvenue 👋</h1>
          <p className="text-muted-foreground text-sm">
            Crée ta famille ou rejoins-en une pour commencer.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Créer une famille</CardTitle>
          <CardDescription>Tu en seras le propriétaire.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateFamilyForm />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <span className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-xs">ou</span>
        <span className="bg-border h-px flex-1" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rejoindre une famille</CardTitle>
          <CardDescription>Avec le code reçu d&apos;un membre.</CardDescription>
        </CardHeader>
        <CardContent>
          <JoinFamilyForm />
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <SignOutButton />
      </div>
    </main>
  );
}

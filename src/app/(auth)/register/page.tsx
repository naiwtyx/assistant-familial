import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = { title: "Créer un compte" };

export default function RegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Créer un compte</CardTitle>
        <CardDescription>Quelques secondes suffisent.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <RegisterForm />
        <p className="text-muted-foreground text-center text-sm">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-foreground font-medium underline-offset-4 hover:underline">
            Se connecter
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

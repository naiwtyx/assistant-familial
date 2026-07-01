import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Connexion</CardTitle>
        <CardDescription>Content de te revoir 👋</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <LoginForm />
        <p className="text-muted-foreground text-center text-sm">
          Pas encore de compte ?{" "}
          <Link href="/register" className="text-foreground font-medium underline-offset-4 hover:underline">
            Créer un compte
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

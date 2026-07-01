"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { useSignOut } from "../hooks/use-auth-actions";
import { getAuthErrorMessage } from "../lib/auth-errors";

export function SignOutButton() {
  const router = useRouter();
  const signOut = useSignOut();

  function handleSignOut() {
    signOut.mutate(undefined, {
      onSuccess: () => {
        router.replace("/login");
        router.refresh();
      },
      onError: (error) => toast.error(getAuthErrorMessage(error)),
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSignOut} disabled={signOut.isPending}>
      <LogOut className="size-4" />
      Se déconnecter
    </Button>
  );
}

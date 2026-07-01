"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { useSignUp } from "../hooks/use-auth-actions";
import { getAuthErrorMessage } from "../lib/auth-errors";
import { registerSchema, type RegisterInput } from "../schemas/auth.schema";

export function RegisterForm() {
  const router = useRouter();
  const signUp = useSignUp();

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: "", email: "", password: "" },
  });

  function onSubmit(values: RegisterInput) {
    signUp.mutate(values, {
      onSuccess: (data) => {
        // Si la confirmation par email est activée, aucune session n'est créée.
        if (!data.session) {
          toast.success("Compte créé ! Confirme ton email pour te connecter.");
          router.replace("/login");
          return;
        }
        router.replace("/dashboard");
        router.refresh();
      },
      onError: (error) => toast.error(getAuthErrorMessage(error)),
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prénom</FormLabel>
              <FormControl>
                <Input autoComplete="given-name" placeholder="Ton prénom" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="prenom@email.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mot de passe</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" placeholder="••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={signUp.isPending}>
          {signUp.isPending ? "Création…" : "Créer mon compte"}
        </Button>
      </form>
    </Form>
  );
}

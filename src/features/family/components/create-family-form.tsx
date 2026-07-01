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
import { getErrorMessage } from "@/lib/get-error-message";

import { useCreateFamily } from "../hooks/use-family";
import { createFamilySchema, type CreateFamilyInput } from "../schemas/family.schema";

export function CreateFamilyForm() {
  const router = useRouter();
  const createFamily = useCreateFamily();

  const form = useForm<CreateFamilyInput>({
    resolver: zodResolver(createFamilySchema),
    defaultValues: { name: "" },
  });

  function onSubmit(values: CreateFamilyInput) {
    createFamily.mutate(values, {
      onSuccess: () => {
        toast.success("Famille créée 🎉");
        router.replace("/dashboard");
        router.refresh();
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom de la famille</FormLabel>
              <FormControl>
                <Input placeholder="Ex. Maison Dupont" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={createFamily.isPending}>
          {createFamily.isPending ? "Création…" : "Créer la famille"}
        </Button>
      </form>
    </Form>
  );
}

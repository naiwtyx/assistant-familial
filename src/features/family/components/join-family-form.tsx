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

import { useJoinFamily } from "../hooks/use-family";
import { joinFamilySchema, type JoinFamilyInput } from "../schemas/family.schema";

export function JoinFamilyForm() {
  const router = useRouter();
  const joinFamily = useJoinFamily();

  const form = useForm<JoinFamilyInput>({
    resolver: zodResolver(joinFamilySchema),
    defaultValues: { code: "" },
  });

  function onSubmit(values: JoinFamilyInput) {
    joinFamily.mutate(values, {
      onSuccess: (family) => {
        toast.success(`Tu as rejoint « ${family.name} » 🎉`);
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
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code d&apos;invitation</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex. K7M2QX9P"
                  autoCapitalize="characters"
                  className="font-mono tracking-widest uppercase"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          variant="outline"
          className="w-full"
          disabled={joinFamily.isPending}
        >
          {joinFamily.isPending ? "Connexion…" : "Rejoindre la famille"}
        </Button>
      </form>
    </Form>
  );
}

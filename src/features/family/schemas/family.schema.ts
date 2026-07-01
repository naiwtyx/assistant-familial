import { z } from "zod";

export const createFamilySchema = z.object({
  name: z.string().min(1, "Donne un nom à ta famille").max(80, "80 caractères maximum"),
});

export const joinFamilySchema = z.object({
  code: z.string().min(1, "Saisis le code d'invitation"),
});

export type CreateFamilyInput = z.infer<typeof createFamilySchema>;
export type JoinFamilyInput = z.infer<typeof joinFamilySchema>;

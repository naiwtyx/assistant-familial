import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(6, "6 caractères minimum"),
});

export const registerSchema = z.object({
  displayName: z
    .string()
    .min(1, "Indique ton prénom")
    .max(50, "50 caractères maximum"),
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(6, "6 caractères minimum"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

"use client";

import { useMutation } from "@tanstack/react-query";

import { signIn, signOut, signUp } from "../services/auth.service";

/**
 * Mutations d'authentification. La navigation et les toasts sont gérés
 * par les composants appelants (séparation UI / logique).
 */
export function useSignIn() {
  return useMutation({ mutationFn: signIn });
}

export function useSignUp() {
  return useMutation({ mutationFn: signUp });
}

export function useSignOut() {
  return useMutation({ mutationFn: signOut });
}

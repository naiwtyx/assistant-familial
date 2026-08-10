"use client";

import { useMutation } from "@tanstack/react-query";

import { submitFeedback, type SubmitFeedbackInput } from "../services/feedback.service";

/** Envoi d'un retour utilisateur (bug / idée / autre). */
export function useSubmitFeedback() {
  return useMutation({
    mutationFn: (input: SubmitFeedbackInput) => submitFeedback(input),
  });
}

import "server-only";

import type Groq from "groq-sdk";
import { z } from "zod";

/**
 * Extraction des produits d'un ticket de caisse via un modèle vision (Groq).
 * Implémente le contrat prévu dans `types.ts` — sans dépendance à un fournisseur
 * dans le reste de l'app (l'UI ne voit que le résultat structuré).
 */

export const receiptSchema = z.object({
  store: z.string().nullable().optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        quantity: z.number().positive().max(999).catch(1),
      }),
    )
    .default([]),
});

export type ParsedReceipt = z.infer<typeof receiptSchema>;

const PROMPT = `Tu analyses la photo d'un ticket de caisse.
Extrais uniquement la liste des PRODUITS achetés.
Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte ni balise autour, au format :
{"store": "<nom du magasin ou null>", "items": [{"name": "<nom lisible du produit en français>", "quantity": <nombre entier>}]}
Ignore les lignes de total, sous-total, TVA, remises, points de fidélité et moyens de paiement.
Regroupe les quantités identiques. Si aucun produit n'est lisible, renvoie "items": [].`;

/** Isole l'objet JSON même si le modèle l'entoure de texte ou de balises Markdown. */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  return start !== -1 && end !== -1 ? candidate.slice(start, end + 1) : candidate;
}

export async function parseReceiptImage(
  groq: Groq,
  model: string,
  dataUrl: string,
): Promise<ParsedReceipt> {
  const completion = await groq.chat.completions.create({
    model,
    temperature: 0.1,
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: PROMPT },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "";
  const parsed: unknown = JSON.parse(extractJson(content));
  return receiptSchema.parse(parsed);
}

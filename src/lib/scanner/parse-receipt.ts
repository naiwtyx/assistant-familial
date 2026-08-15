import "server-only";

import type Groq from "groq-sdk";
import { z } from "zod";

import { PRODUCT_CATEGORIES } from "@/config/constants";

/**
 * Extraction des produits d'un ticket de caisse via un modèle vision (Groq) :
 * nom, quantité, prix et catégorie — pour alimenter l'inventaire ET le budget.
 */

export const receiptSchema = z.object({
  store: z.string().nullable().optional().catch(null),
  date: z.string().nullable().optional().catch(null),
  total: z.number().nonnegative().max(999999).nullable().optional().catch(null),
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        quantity: z.number().positive().max(999).catch(1),
        price: z.number().nonnegative().max(99999).catch(0),
        category: z.string().max(40).optional().catch(undefined),
      }),
    )
    .default([]),
});

export type ParsedReceipt = z.infer<typeof receiptSchema>;

const CATEGORY_LIST = PRODUCT_CATEGORIES.map((c) => `${c.value} = ${c.label}`).join("\n");

const PROMPT = `Tu analyses la ou les photo(s) d'un ticket de caisse.
Si plusieurs images sont fournies, ce sont les parties SUCCESSIVES d'un même ticket : combine-les en une seule liste (sans doublons).
Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte ni balise autour, au format :
{"store": "<magasin ou null>", "date": "<AAAA-MM-JJ ou null>", "total": <nombre ou null>, "items": [{"name": "<nom complet en français>", "quantity": <entier>, "price": <prix TOTAL de la ligne en euros>, "category": "<valeur de catégorie>"}]}

RÈGLES :
- name : développe les abréviations en noms COMPLETS, génériques, en français.
  Ex. "LT 1/2 ECR" → "Lait demi-écrémé" ; "PN COMPLET" → "Pain complet" ;
  "BAN" → "Bananes" ; "CAFE MOUL 250G" → "Café moulu". Pas de marque, code ni poids.
- price : le prix payé pour cette ligne, en euros (nombre, ex. 2.30).
- category : choisis la VALEUR (colonne de gauche) la plus adaptée parmi :
${CATEGORY_LIST}
- total : le montant total payé du ticket.
- date : la date d'achat au format AAAA-MM-JJ si visible, sinon null.

Ignore les lignes total/sous-total/TVA/remise/fidélité/paiement (elles ne sont PAS des items).
Regroupe les quantités identiques. Si aucun produit n'est lisible, renvoie "items": [].`;

/** Isole l'objet JSON même si le modèle l'entoure de texte ou de balises Markdown. */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  return start !== -1 && end !== -1 ? candidate.slice(start, end + 1) : candidate;
}

export async function parseReceiptImages(
  groq: Groq,
  model: string,
  dataUrls: string[],
): Promise<ParsedReceipt> {
  const completion = await groq.chat.completions.create({
    model,
    temperature: 0.1,
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: PROMPT },
          ...dataUrls.map((url) => ({ type: "image_url" as const, image_url: { url } })),
        ],
      },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "";
  const parsed: unknown = JSON.parse(extractJson(content));
  return receiptSchema.parse(parsed);
}

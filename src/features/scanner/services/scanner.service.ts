export type ScannedItem = {
  name: string;
  quantity: number;
  price?: number;
  category?: string;
};

export type ReceiptAnalysis = {
  store: string | null;
  date: string | null;
  total: number | null;
  items: ScannedItem[];
};

/** Envoie les photos du ticket à l'IA et retourne les produits/montants détectés. */
export async function analyzeReceipt(images: string[]): Promise<ReceiptAnalysis> {
  const response = await fetch("/api/scan-receipt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ images }),
  });
  const data = (await response.json()) as {
    store?: string | null;
    date?: string | null;
    total?: number | null;
    items?: ScannedItem[];
    error?: string;
  };
  if (!response.ok || data.error) {
    throw new Error(data.error ?? "Échec de l'analyse.");
  }

  return {
    store: data.store ?? null,
    date: data.date ?? null,
    total: data.total ?? null,
    items: data.items ?? [],
  };
}

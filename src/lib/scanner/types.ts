/**
 * Architecture PRÉPARÉE pour le scanner de tickets de caisse (non implémenté).
 *
 * Objectif : pouvoir brancher plus tard n'importe quel fournisseur d'OCR
 * (API cloud, modèle local, IA multimodale) sans toucher au reste de l'app.
 * On définit ici uniquement le CONTRAT. Une implémentation concrète viendra
 * dans un fichier séparé (ex. `providers/openai-vision.ts`) et alimentera les
 * mêmes services que l'UADD (services/shopping, services/inventory).
 */

export interface ParsedReceiptItem {
  /** Libellé brut détecté sur le ticket. */
  rawLabel: string;
  /** Nom normalisé proposé (rapprochable de l'inventaire). */
  normalizedName: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
}

export interface ParsedReceipt {
  storeName?: string;
  purchasedAt?: string; // ISO 8601
  items: ParsedReceiptItem[];
  total?: number;
}

/**
 * Contrat que tout fournisseur d'OCR devra respecter.
 * L'app ne dépendra que de cette interface, jamais d'un fournisseur précis.
 */
export interface ReceiptParser {
  parse(image: Blob | ArrayBuffer): Promise<ParsedReceipt>;
}

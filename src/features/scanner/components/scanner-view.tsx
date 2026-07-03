"use client";

import { Camera, Loader2, Plus, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { PRODUCT_CATEGORIES } from "@/config/constants";
import { useSaveReceipt } from "@/features/budget/hooks/use-budget";
import { useActiveFamily } from "@/features/family/components/family-provider";
import { useAddScannedItems } from "@/features/inventory/hooks/use-inventory";
import { getErrorMessage } from "@/lib/get-error-message";

type ScanItem = {
  name: string;
  quantity: number;
  price: number;
  category: string;
  selected: boolean;
};

type ReceiptMeta = { store: string | null; date: string | null; total: number | null };

const MAX_PHOTOS = 5;
const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

/** Redimensionne l'image côté client. Assez net pour lire le ticket, assez léger pour l'envoi. */
function fileToDownscaledDataUrl(file: File, maxSize = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Image invalide."));
      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const width = Math.round(image.width * scale);
        const height = Math.round(image.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Canvas non supporté."));
          return;
        }
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      image.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ScannerView() {
  const family = useActiveFamily();
  const router = useRouter();
  const addScanned = useAddScannedItems(family.id);
  const saveReceipt = useSaveReceipt(family.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<string[]>([]);
  const [items, setItems] = useState<ScanItem[] | null>(null);
  const [meta, setMeta] = useState<ReceiptMeta | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const isSaving = saveReceipt.isPending || addScanned.isPending;

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ""; // permet de reprendre la même photo
    if (files.length === 0) return;
    try {
      const urls = await Promise.all(files.map((file) => fileToDownscaledDataUrl(file)));
      setImages((prev) => [...prev, ...urls].slice(0, MAX_PHOTOS));
      setItems(null);
      setMeta(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setItems(null);
    setMeta(null);
  }

  async function analyze() {
    if (images.length === 0) return;
    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/scan-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images }),
      });
      const data = (await response.json()) as {
        store?: string | null;
        date?: string | null;
        total?: number | null;
        items?: { name: string; quantity: number; price?: number; category?: string }[];
        error?: string;
      };
      if (!response.ok || data.error) {
        throw new Error(data.error ?? "Échec de l'analyse.");
      }
      const detected: ScanItem[] = (data.items ?? []).map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price ?? 0,
        category: item.category ?? "other",
        selected: true,
      }));
      if (detected.length === 0) {
        toast.info("Aucun produit détecté sur le ticket.");
      }
      setItems(detected);
      setMeta({ store: data.store ?? null, date: data.date ?? null, total: data.total ?? null });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsAnalyzing(false);
    }
  }

  function updateItem(index: number, patch: Partial<ScanItem>) {
    setItems((prev) => (prev ? prev.map((item, i) => (i === index ? { ...item, ...patch } : item)) : prev));
  }

  async function save() {
    const all = (items ?? []).filter((item) => item.name.trim());
    if (all.length === 0) {
      toast.error("Aucun produit à enregistrer.");
      return;
    }
    const total = meta?.total ?? all.reduce((sum, item) => sum + (item.price || 0), 0);
    const selected = all.filter((item) => item.selected);

    try {
      await saveReceipt.mutateAsync({
        store: meta?.store ?? null,
        date: meta?.date ?? null,
        total,
        items: all.map((item) => ({
          name: item.name.trim(),
          quantity: item.quantity,
          category: item.category || null,
          price: item.price || 0,
        })),
      });

      if (selected.length > 0) {
        await addScanned.mutateAsync(
          selected.map((item) => ({ name: item.name.trim(), quantity: item.quantity })),
        );
      }

      toast.success(
        `Dépense enregistrée${selected.length > 0 ? ` · ${selected.length} produit(s) ajouté(s) à l'inventaire` : ""}`,
      );
      router.push("/inventaire");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-6">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <Camera className="text-primary size-5" />
          Scanner un ticket
        </h1>
        <p className="text-muted-foreground text-sm">
          Prends une ou plusieurs photos (pour les longs tickets). L&apos;IA lit les produits et
          les prix.
        </p>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFile}
        className="hidden"
      />

      {images.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {images.map((src, index) => (
            <div key={index} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Ticket ${index + 1}`}
                className="size-20 rounded-lg border object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="bg-background text-muted-foreground hover:text-destructive absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full border"
                aria-label="Retirer la photo"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
          {images.length < MAX_PHOTOS ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-muted-foreground hover:text-foreground flex size-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs"
            >
              <Plus className="size-4" />
              Photo
            </button>
          ) : null}
        </div>
      ) : null}

      {images.length === 0 ? (
        <Button onClick={() => fileInputRef.current?.click()}>
          <Camera className="size-4" />
          Photographier le ticket
        </Button>
      ) : (
        <Button onClick={analyze} disabled={isAnalyzing}>
          {isAnalyzing ? <Loader2 className="size-4 animate-spin" /> : null}
          {isAnalyzing ? "Analyse…" : `Analyser (${images.length} photo${images.length > 1 ? "s" : ""})`}
        </Button>
      )}

      {items && items.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-xs font-medium uppercase">
              {meta?.store ?? "Produits détectés"}
            </p>
            {meta?.total != null ? (
              <p className="text-sm font-medium tabular-nums">{euro.format(meta.total)}</p>
            ) : null}
          </div>

          <ul className="flex flex-col gap-2">
            {items.map((item, index) => (
              <li key={index} className="rounded-lg border p-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={item.selected}
                    onCheckedChange={(checked) => updateItem(index, { selected: checked === true })}
                    aria-label="Ajouter à l'inventaire"
                  />
                  <Input
                    value={item.name}
                    onChange={(event) => updateItem(index, { name: event.target.value })}
                    className="h-8 flex-1"
                    aria-label="Nom du produit"
                  />
                </div>
                <div className="mt-2 flex items-center gap-2 pl-6">
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(event) =>
                      updateItem(index, { quantity: Math.max(1, Number(event.target.value) || 1) })
                    }
                    className="h-8 w-14 text-center"
                    aria-label="Quantité"
                  />
                  <div className="relative w-20">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.price}
                      onChange={(event) =>
                        updateItem(index, { price: Math.max(0, Number(event.target.value) || 0) })
                      }
                      className="h-8 pr-5 text-right"
                      aria-label="Prix"
                    />
                    <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs">
                      €
                    </span>
                  </div>
                  <NativeSelect
                    value={item.category}
                    onChange={(event) => updateItem(index, { category: event.target.value })}
                    className="h-8 flex-1"
                    aria-label="Catégorie"
                  >
                    {PRODUCT_CATEGORIES.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              </li>
            ))}
          </ul>

          <p className="text-muted-foreground text-xs">
            Coché = ajouté à l&apos;inventaire. La dépense enregistre tout le ticket.
          </p>

          <Button onClick={save} disabled={isSaving}>
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Enregistrer
          </Button>
        </div>
      ) : null}
    </main>
  );
}

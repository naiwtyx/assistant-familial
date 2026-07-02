"use client";

import { Camera, Loader2, Save } from "lucide-react";
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

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

/** Redimensionne l'image côté client (moins de données envoyées, analyse plus rapide). */
function fileToDownscaledDataUrl(file: File, maxSize = 1200): Promise<string> {
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
        resolve(canvas.toDataURL("image/jpeg", 0.7));
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

  const [image, setImage] = useState<string | null>(null);
  const [items, setItems] = useState<ScanItem[] | null>(null);
  const [meta, setMeta] = useState<ReceiptMeta | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const isSaving = saveReceipt.isPending || addScanned.isPending;

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDownscaledDataUrl(file);
      setImage(dataUrl);
      setItems(null);
      setMeta(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function analyze() {
    if (!image) return;
    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/scan-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: image }),
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
      // Le budget enregistre TOUT le ticket ; l'inventaire ne reçoit que les cochés.
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
          L&apos;IA lit les produits et les prix pour l&apos;inventaire et le budget.
        </p>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />

      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="Aperçu du ticket" className="max-h-56 w-full rounded-xl border object-contain" />
      ) : null}

      <div className="flex gap-2">
        <Button
          variant={image ? "outline" : "default"}
          className="flex-1"
          onClick={() => fileInputRef.current?.click()}
        >
          <Camera className="size-4" />
          {image ? "Reprendre" : "Photographier le ticket"}
        </Button>
        {image ? (
          <Button className="flex-1" onClick={analyze} disabled={isAnalyzing}>
            {isAnalyzing ? <Loader2 className="size-4 animate-spin" /> : null}
            {isAnalyzing ? "Analyse…" : "Analyser"}
          </Button>
        ) : null}
      </div>

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

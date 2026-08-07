"use client";

import { Camera, Loader2, Plus, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { PageSuggestion } from "@/components/shared/page-suggestion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { PRODUCT_CATEGORIES } from "@/config/constants";
import { useSaveReceipt } from "@/features/budget/hooks/use-budget";
import { useActiveFamily } from "@/features/family/components/family-provider";
import { useAddScannedItems } from "@/features/inventory/hooks/use-inventory";
import { analyzeReceipt } from "@/features/scanner/services/scanner.service";
import { getErrorMessage } from "@/lib/get-error-message";
import { haptic } from "@/lib/haptics";

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
      haptic("light");
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
      const analysis = await analyzeReceipt(images);
      const detected: ScanItem[] = analysis.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price ?? 0,
        category: item.category ?? "other",
        selected: true,
      }));
      if (detected.length === 0) {
        toast.info("Aucun produit détecté sur le ticket.");
      } else {
        haptic("success");
      }
      setItems(detected);
      setMeta({ store: analysis.store, date: analysis.date, total: analysis.total });
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

  const scanTip =
    images.length === 0 && !items
      ? "Aligne le ticket bien à plat et dans un endroit éclairé pour que l'IA lise chaque ligne."
      : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 p-5 pb-8">
      <PageHeader
        title="Scanner un ticket"
        subtitle="L'IA lit les produits et les prix"
      />

      <PageSuggestion text={scanTip} />

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
        <div className="motion-in-delay-1 bg-card shadow-soft flex flex-wrap gap-2.5 rounded-2xl p-3">
          {images.map((src, index) => (
            <div key={index} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Ticket ${index + 1}`}
                className="size-20 rounded-xl border object-cover shadow-soft"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="bg-background text-muted-foreground hover:text-destructive shadow-soft absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full border transition-transform active:scale-90"
                aria-label="Retirer la photo"
              >
                <X className="size-3.5" strokeWidth={2} />
              </button>
            </div>
          ))}
          {images.length < MAX_PHOTOS ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-muted-foreground hover:text-primary hover:border-primary/40 flex size-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-xs transition-all active:scale-95"
            >
              <Plus className="size-4" strokeWidth={1.75} />
              Photo
            </button>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="motion-in-delay-1 group bg-ai-gradient hover:shadow-elevated flex flex-col items-center justify-center gap-3 rounded-3xl p-10 shadow-ai transition-all active:scale-[0.98]"
        >
          <div className="bg-primary/15 text-primary flex size-14 items-center justify-center rounded-2xl transition-transform group-hover:scale-105">
            <Camera className="size-7" strokeWidth={1.75} />
          </div>
          <div className="text-center">
            <p className="text-[15px] font-medium">Photographier le ticket</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Tu peux prendre plusieurs photos pour les longs tickets
            </p>
          </div>
        </button>
      )}

      {images.length > 0 ? (
        <Button
          onClick={analyze}
          disabled={isAnalyzing}
          className="h-11 rounded-xl transition-transform active:scale-[0.98]"
        >
          {isAnalyzing ? <Loader2 className="size-4 animate-spin" /> : null}
          {isAnalyzing ? "Analyse…" : `Analyser (${images.length} photo${images.length > 1 ? "s" : ""})`}
        </Button>
      ) : null}

      {items && items.length > 0 ? (
        <div className="motion-in-delay-2 flex flex-col gap-3">
          <div className="flex items-baseline justify-between px-1">
            <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase">
              {meta?.store ?? "Produits détectés"}
            </p>
            {meta?.total != null ? (
              <p className="font-heading text-lg font-semibold tabular-nums">
                {euro.format(meta.total)}
              </p>
            ) : null}
          </div>

          <ul className="bg-card shadow-soft flex flex-col gap-1 rounded-2xl p-2">
            {items.map((item, index) => (
              <li key={index} className="hover:bg-accent/40 rounded-xl p-2 transition-colors">
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

          <p className="text-muted-foreground px-1 text-xs">
            Coché = ajouté à l&apos;inventaire. La dépense enregistre tout le ticket.
          </p>

          <Button
            onClick={save}
            disabled={isSaving}
            className="h-11 rounded-xl transition-transform active:scale-[0.98]"
          >
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" strokeWidth={1.75} />
            )}
            Enregistrer
          </Button>
        </div>
      ) : null}
    </main>
  );
}

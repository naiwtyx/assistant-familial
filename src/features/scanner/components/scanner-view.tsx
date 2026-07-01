"use client";

import { Camera, Loader2, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useActiveFamily } from "@/features/family/components/family-provider";
import { useAddScannedItems } from "@/features/inventory/hooks/use-inventory";
import { getErrorMessage } from "@/lib/get-error-message";

type ScanItem = { name: string; quantity: number; selected: boolean };

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [image, setImage] = useState<string | null>(null);
  const [items, setItems] = useState<ScanItem[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDownscaledDataUrl(file);
      setImage(dataUrl);
      setItems(null);
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
        items?: { name: string; quantity: number }[];
        error?: string;
      };
      if (!response.ok || data.error) {
        throw new Error(data.error ?? "Échec de l'analyse.");
      }
      const detected: ScanItem[] = (data.items ?? []).map((item) => ({
        name: item.name,
        quantity: item.quantity,
        selected: true,
      }));
      if (detected.length === 0) {
        toast.info("Aucun produit détecté sur le ticket.");
      }
      setItems(detected);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsAnalyzing(false);
    }
  }

  function updateItem(index: number, patch: Partial<ScanItem>) {
    setItems((prev) => (prev ? prev.map((item, i) => (i === index ? { ...item, ...patch } : item)) : prev));
  }

  function addToInventory() {
    const selected = (items ?? []).filter((item) => item.selected && item.name.trim());
    if (selected.length === 0) {
      toast.error("Sélectionne au moins un produit.");
      return;
    }
    addScanned.mutate(
      selected.map((item) => ({ name: item.name.trim(), quantity: item.quantity })),
      {
        onSuccess: () => {
          toast.success(`${selected.length} produit(s) ajouté(s) à l'inventaire`);
          router.push("/inventaire");
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  const selectedCount = items?.filter((item) => item.selected).length ?? 0;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-6">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <Camera className="text-primary size-5" />
          Scanner un ticket
        </h1>
        <p className="text-muted-foreground text-sm">
          Prends ton ticket de caisse en photo, l&apos;IA en extrait les produits.
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
        <img src={image} alt="Aperçu du ticket" className="max-h-64 w-full rounded-xl border object-contain" />
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
          <p className="text-muted-foreground text-xs font-medium uppercase">Produits détectés</p>
          <ul className="divide-border divide-y">
            {items.map((item, index) => (
              <li key={index} className="flex items-center gap-2 py-2">
                <Checkbox
                  checked={item.selected}
                  onCheckedChange={(checked) => updateItem(index, { selected: checked === true })}
                  aria-label={`Sélectionner ${item.name}`}
                />
                <Input
                  value={item.name}
                  onChange={(event) => updateItem(index, { name: event.target.value })}
                  className="h-8 flex-1"
                  aria-label="Nom du produit"
                />
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(event) =>
                    updateItem(index, { quantity: Math.max(1, Number(event.target.value) || 1) })
                  }
                  className="h-8 w-16 text-center"
                  aria-label="Quantité"
                />
              </li>
            ))}
          </ul>
          <Button onClick={addToInventory} disabled={addScanned.isPending || selectedCount === 0}>
            <Package className="size-4" />
            Ajouter à l&apos;inventaire ({selectedCount})
          </Button>
        </div>
      ) : null}
    </main>
  );
}

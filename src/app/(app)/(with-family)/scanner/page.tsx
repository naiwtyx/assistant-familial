import type { Metadata } from "next";

import { ScannerView } from "@/features/scanner/components/scanner-view";

export const metadata: Metadata = { title: "Scanner un ticket" };

export default function ScannerPage() {
  return <ScannerView />;
}

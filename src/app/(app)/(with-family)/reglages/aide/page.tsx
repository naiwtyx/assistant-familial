import type { Metadata } from "next";

import { FeedbackView } from "@/features/settings/components/feedback-view";

export const metadata: Metadata = { title: "Aide & retours" };

export default function AidePage() {
  return <FeedbackView />;
}

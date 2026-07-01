import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Toutes les routes SAUF :
     * - les fichiers statiques Next (_next/static, _next/image)
     * - les fichiers PWA et assets à la racine (manifest, service worker, icônes, favicon)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

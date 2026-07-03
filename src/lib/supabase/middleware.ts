import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";
import type { Database } from "@/types/database.types";

/** Routes accessibles sans être connecté. */
const PUBLIC_ROUTES = ["/login", "/register"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/**
 * Rafraîchit la session Supabase à chaque requête, propage les cookies, et
 * applique la protection des routes :
 *   - non connecté + route privée  -> /login
 *   - connecté + route publique ou /  -> /dashboard
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT : ne rien exécuter entre la création du client et getUser()
  // (recommandation officielle Supabase, sinon déconnexions aléatoires).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && pathname.startsWith("/api/") && !pathname.startsWith("/api/cron/")) {
    // Les routes API renvoient du JSON, pas une redirection HTML.
    // (Les crons n'ont pas de session : ils sont protégés par CRON_SECRET.)
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  if (!user && !isPublicRoute(pathname)) {
    return redirectTo("/login", request, supabaseResponse);
  }

  if (user && (isPublicRoute(pathname) || pathname === "/")) {
    return redirectTo("/dashboard", request, supabaseResponse);
  }

  return supabaseResponse;
}

/** Construit une réponse de redirection en conservant les cookies de session. */
function redirectTo(pathname: string, request: NextRequest, response: NextResponse): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  const redirect = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

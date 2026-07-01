import { redirect } from "next/navigation";

// La racine renvoie vers le tableau de bord ; le middleware redirige
// les visiteurs non connectés vers /login.
export default function Home() {
  redirect("/dashboard");
}

import type { MetadataRoute } from "next";

/**
 * Manifeste de la PWA (servi sur /manifest.webmanifest).
 * Permet l'installation sur l'écran d'accueil des smartphones.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Assistant Familial",
    short_name: "Famille",
    description: "Gérez vos courses, votre inventaire et vos recettes, partagés en famille.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#6366f1",
    lang: "fr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

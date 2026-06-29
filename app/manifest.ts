import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ReservarCarro — Controle de Frota",
    short_name: "ReservarCarro",
    description: "Sistema de reserva e vistoria de veículos",
    start_url: "/home",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1d4ed8",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}

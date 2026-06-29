import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "ReservarCarro",
  description: "Sistema de reserva e controle de frota",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ReservarCarro",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1d4ed8",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${geist.variable} h-full`}>
      <body className="h-full bg-gray-50 font-sans antialiased">{children}</body>
    </html>
  );
}

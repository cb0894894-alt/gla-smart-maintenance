import type React from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GLA Smart Maintenance",
  description: "Dashboard PWA para mantenimiento inteligente de activos.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = { themeColor: "#07111f" };

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="dark">
      <body>{children}</body>
    </html>
  );
}

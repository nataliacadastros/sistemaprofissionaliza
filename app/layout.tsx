import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";

export const metadata: Metadata = {
  title: "Sistema Profissionaliza",
  description: "Sistema EAD",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br">
      <body>{children}</body>
    </html>
  );
}

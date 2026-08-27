import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import AppShell from "./app-shell";

const sora = Sora({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dashboard SY Acquisition",
  description: "Painel interno da SY Acquisition.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${sora.className} min-h-screen bg-black text-zinc-100 antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

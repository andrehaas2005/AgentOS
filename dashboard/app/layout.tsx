import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "AgentOS — Mission Control",
  description: "Painel de controle do time de agentes de publicação nas redes sociais",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen bg-[#0b0d14] text-[#e6e8ef] antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

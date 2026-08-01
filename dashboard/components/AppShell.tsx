"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, Menu, X } from "lucide-react";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const pathname = usePathname();

  // Fecha o drawer automaticamente quando a rota muda (ex: usuário usou o
  // botão voltar do navegador em vez de clicar num link do menu).
  useEffect(() => {
    setMenuAberto(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <header className="flex items-center justify-between border-b border-border bg-panel px-4 py-3 md:hidden">
        <div className="flex items-center gap-2 text-white">
          <Bot size={20} className="text-blue-400" />
          <span className="text-sm font-semibold">AgentOS</span>
        </div>
        <button
          type="button"
          onClick={() => setMenuAberto(true)}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-surface hover:text-white"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
      </header>

      <Sidebar />

      {menuAberto && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMenuAberto(false)} />
          <div className="relative z-10 flex h-full w-64 flex-col gap-1 border-r border-border bg-panel p-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-sm font-semibold text-white">Menu</span>
              <button
                type="button"
                onClick={() => setMenuAberto(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-surface hover:text-white"
                aria-label="Fechar menu"
              >
                <X size={18} />
              </button>
            </div>
            <Sidebar mobile onNavigate={() => setMenuAberto(false)} />
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}

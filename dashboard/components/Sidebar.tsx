"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bot, Building2, CalendarDays, FileText, LayoutDashboard, LogOut, Send } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Visão Geral", icon: LayoutDashboard },
  { href: "/empresas", label: "Empresas", icon: Building2 },
  { href: "/calendario", label: "Calendário", icon: CalendarDays },
  { href: "/conteudos", label: "Conteúdos", icon: FileText },
  { href: "/publicacoes", label: "Publicações", icon: Send },
  { href: "/agentes", label: "Agentes", icon: Bot },
];

const CLASSE_DESKTOP = "hidden w-56 shrink-0 flex-col gap-1 border-r border-border bg-panel p-3 md:flex";
const CLASSE_MOBILE = "flex w-full flex-col gap-1";

export function Sidebar({ mobile, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  async function sair() {
    await fetch("/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className={mobile ? CLASSE_MOBILE : `${CLASSE_DESKTOP} justify-between`}>
      <div className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active ? "bg-surface text-white" : "text-gray-400 hover:bg-surface/60 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          sair();
        }}
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-surface/60 hover:text-white"
      >
        <LogOut size={18} />
        Sair
      </button>
    </aside>
  );
}

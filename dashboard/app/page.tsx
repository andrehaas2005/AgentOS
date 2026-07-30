import { Bot } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { StatTile } from "@/components/StatTile";
import { EventFeed } from "@/components/EventFeed";
import { EmpresaCard } from "@/components/EmpresaCard";
import { EscritorioAgentes } from "@/components/escritorio/EscritorioAgentes";
import { SelectFiltro } from "@/components/SelectFiltro";
import { getStats, getEventos, getEmpresas } from "@/lib/api";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ empresaId?: string }>;
}) {
  const { empresaId } = await searchParams;
  const [stats, eventos, empresas] = await Promise.all([
    getStats(empresaId),
    getEventos(empresaId),
    getEmpresas(),
  ]);
  const empresasFiltradas = empresaId ? empresas.filter((e) => e.id === empresaId) : empresas;

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 p-6">
        <header className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-blue-500/20 p-2 text-blue-400">
              <Bot size={22} />
            </span>
            <h1 className="text-xl font-semibold text-white">AgentOS — Mission Control</h1>
          </div>
          <SelectFiltro
            paramName="empresaId"
            label="Empresa"
            placeholder="Todas as empresas"
            opcoes={empresas.map((e) => ({ value: e.id, label: e.nome }))}
          />
        </header>

        <section className="mb-6 flex flex-wrap gap-4">
          <StatTile label="Empresas" value={stats.empresas} />
          <StatTile label="Agentes Configurados" value={stats.agentesConfigurados} />
          <StatTile label="Postagens Agendadas" value={stats.postagensAgendadas} />
          <StatTile label="Publicadas no Mês" value={stats.publicadasNoMes} />
          <StatTile label="Alertas" value={stats.alertas} tone={stats.alertas > 0 ? "alert" : "default"} />
        </section>

        <section className="flex gap-4">
          <div className="flex-1 rounded-xl border border-border bg-panel p-4">
            <h2 className="mb-3 text-sm font-semibold text-white">Agentes em Atividade</h2>
            <EscritorioAgentes />
          </div>

          <EventFeed eventos={eventos} />
        </section>

        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-white">Empresas Ativas</h2>
          {empresasFiltradas.length === 0 ? (
            <p className="text-sm text-gray-500">
              Nenhuma empresa cadastrada ainda. Cadastre a primeira em &quot;Empresas&quot;.
            </p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {empresasFiltradas.map((empresa) => (
                <EmpresaCard key={empresa.id} empresa={empresa} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

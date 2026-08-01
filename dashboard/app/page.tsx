import { Bot, ExternalLink } from "lucide-react";
import { StatTile } from "@/components/StatTile";
import { EventFeed } from "@/components/EventFeed";
import { EmpresaCard } from "@/components/EmpresaCard";
import { EmpresaAvatar } from "@/components/EmpresaAvatar";
import { EscritorioAgentesCard } from "@/components/escritorio/EscritorioAgentesCard";
import { SelectFiltroEmpresa } from "@/components/SelectFiltroEmpresa";
import { AprovacoesPendentes } from "@/components/AprovacoesPendentes";
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
    <>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-blue-500/20 p-2 text-blue-400">
            <Bot size={22} />
          </span>
          <h1 className="text-xl font-semibold text-white">AgentOS — Mission Control</h1>
        </div>
        <SelectFiltroEmpresa empresas={empresas} />
      </header>

      <section className="mb-6 flex flex-wrap gap-4">
        <StatTile label="Empresas" value={stats.empresas} />
        <StatTile label="Agentes Configurados" value={stats.agentesConfigurados} />
        <StatTile label="Postagens Agendadas" value={stats.postagensAgendadas} />
        <StatTile label="Publicadas no Mês" value={stats.publicadasNoMes} />
        <StatTile
          label="Aguardando Aprovação"
          value={stats.aguardandoAprovacao}
          tone={stats.aguardandoAprovacao > 0 ? "alert" : "default"}
        />
        <StatTile
          label="Alertas"
          value={stats.alertas}
          tone={stats.alertas > 0 ? "alert" : "default"}
          href="/calendario?status=erro"
        />
      </section>

      {stats.ultimaPublicacao && (
        <section className="mb-6 rounded-xl border border-border bg-panel p-4">
          <h2 className="mb-3 text-sm font-semibold text-white">Última publicação</h2>
          <div className="flex items-center gap-3">
            <EmpresaAvatar
              nome={stats.ultimaPublicacao.conteudo.calendario.empresa.nome}
              logoUrl={stats.ultimaPublicacao.conteudo.calendario.empresa.logoUrl}
              size={28}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-white">
                {stats.ultimaPublicacao.conteudo.calendario.empresa.nome} · {stats.ultimaPublicacao.rede}
              </p>
              <p className="text-[11px] text-gray-500">
                {new Date(stats.ultimaPublicacao.createdAt).toLocaleString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                })}
              </p>
            </div>
            {stats.ultimaPublicacao.link && (
              <a
                href={stats.ultimaPublicacao.link}
                target="_blank"
                rel="noreferrer"
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-gray-300 hover:text-white"
              >
                Ver post <ExternalLink size={12} />
              </a>
            )}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-4 lg:flex-row">
        <EscritorioAgentesCard />

        <div className="flex flex-col gap-4">
          <AprovacoesPendentes empresaId={empresaId} />
          <EventFeed eventos={eventos} />
        </div>
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
    </>
  );
}

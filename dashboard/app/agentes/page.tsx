import { Sidebar } from "@/components/Sidebar";
import { getAgentesStats } from "@/lib/api";
import { AGENTES } from "@/lib/agentes";

function tempoRelativo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min atrás`;
  const h = Math.round(min / 60);
  return `${h} h atrás`;
}

export default async function AgentesPage() {
  const stats = await getAgentesStats();
  const statsPorNome = new Map(stats.map((stat) => [stat.agente, stat]));

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6">
        <h1 className="mb-6 text-xl font-semibold text-white">Agentes</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {AGENTES.map((agente) => {
            const stat = statsPorNome.get(agente.nome);
            return (
              <div key={agente.nome} className="rounded-xl border border-border bg-panel p-4">
                <p className="text-sm font-medium text-white">{agente.nome}</p>
                <p className="mt-1 text-xs text-gray-400">{agente.funcao}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                  <span>{stat?.totalExecucoes ?? 0} execuções</span>
                  <span>{stat?.ultimaExecucao ? tempoRelativo(stat.ultimaExecucao.createdAt) : "nunca rodou"}</span>
                </div>
                {stat && stat.custoTokensTotal > 0 && (
                  <p className="mt-1 text-xs text-gray-500">{stat.custoTokensTotal} tokens no total</p>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

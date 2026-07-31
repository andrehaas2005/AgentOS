import { Sidebar } from "@/components/Sidebar";
import { SelectFiltro } from "@/components/SelectFiltro";
import { SelectFiltroEmpresa } from "@/components/SelectFiltroEmpresa";
import { NovaPostagemButton } from "@/components/NovaPostagemButton";
import { CalendarioTable } from "@/components/CalendarioTable";
import { getCalendario, getEmpresas } from "@/lib/api";

const STATUS_LABEL: Record<string, string> = {
  planejado: "Planejado",
  em_producao: "Em produção",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovado: "Aprovado",
  publicando: "Publicando",
  publicado: "Publicado",
  erro: "Erro",
};

const STATUS_OPCOES = Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }));

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ empresaId?: string; status?: string; highlight?: string }>;
}) {
  const { empresaId, status, highlight } = await searchParams;
  const [itens, empresas] = await Promise.all([getCalendario(empresaId, status), getEmpresas()]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Calendário de Postagens</h1>
          <div className="flex items-center gap-3">
            <SelectFiltroEmpresa empresas={empresas} />
            <SelectFiltro paramName="status" label="Status" placeholder="Todos" opcoes={STATUS_OPCOES} />
            <NovaPostagemButton empresas={empresas} />
          </div>
        </div>
        {itens.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma postagem agendada ainda.</p>
        ) : (
          <CalendarioTable itens={itens} highlightId={highlight} />
        )}
      </main>
    </div>
  );
}

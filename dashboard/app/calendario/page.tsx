import { Sidebar } from "@/components/Sidebar";
import { SelectFiltro } from "@/components/SelectFiltro";
import { EmpresaAvatar } from "@/components/EmpresaAvatar";
import { NovaPostagemButton } from "@/components/NovaPostagemButton";
import { getCalendario, getEmpresas } from "@/lib/api";

const STATUS_LABEL: Record<string, string> = {
  planejado: "Planejado",
  em_producao: "Em produção",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovado: "Aprovado",
  publicado: "Publicado",
  erro: "Erro",
};

const STATUS_OPCOES = Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }));

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ empresaId?: string; status?: string }>;
}) {
  const { empresaId, status } = await searchParams;
  const [itens, empresas] = await Promise.all([getCalendario(empresaId, status), getEmpresas()]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Calendário de Postagens</h1>
          <div className="flex items-center gap-3">
            <SelectFiltro
              paramName="empresaId"
              label="Empresa"
              placeholder="Todas"
              opcoes={empresas.map((e) => ({ value: e.id, label: e.nome }))}
            />
            <SelectFiltro paramName="status" label="Status" placeholder="Todos" opcoes={STATUS_OPCOES} />
            <NovaPostagemButton empresas={empresas} />
          </div>
        </div>
        {itens.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma postagem agendada ainda.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-panel text-gray-400">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => (
                  <tr key={item.id} className="border-t border-border bg-surface">
                    <td className="px-4 py-3">{new Date(item.dataHora).toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <EmpresaAvatar nome={item.empresa.nome} logoUrl={item.empresa.logoUrl} size={20} />
                        {item.empresa.nome}
                      </div>
                    </td>
                    <td className="px-4 py-3">{item.tipoPost}</td>
                    <td className="px-4 py-3">{STATUS_LABEL[item.status] ?? item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

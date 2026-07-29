import { Sidebar } from "@/components/Sidebar";
import { getCalendario } from "@/lib/api";

const STATUS_LABEL: Record<string, string> = {
  planejado: "Planejado",
  em_producao: "Em produção",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovado: "Aprovado",
  publicado: "Publicado",
  erro: "Erro",
};

export default async function CalendarioPage() {
  const itens = await getCalendario();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6">
        <h1 className="mb-6 text-xl font-semibold text-white">Calendário de Postagens</h1>
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
                    <td className="px-4 py-3">{item.empresa.nome}</td>
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

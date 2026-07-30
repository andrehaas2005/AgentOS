import { Sidebar } from "@/components/Sidebar";
import { getPublicacoes } from "@/lib/api";

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  publicado: "Publicado",
  erro: "Erro",
};

export default async function PublicacoesPage() {
  const publicacoes = await getPublicacoes();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6">
        <h1 className="mb-6 text-xl font-semibold text-white">Publicações</h1>
        {publicacoes.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nenhuma publicação registrada ainda — a publicação real nas redes sociais chega na Fase 2 do
            roadmap.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-panel text-gray-400">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Rede</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">ID externo</th>
                </tr>
              </thead>
              <tbody>
                {publicacoes.map((publicacao) => (
                  <tr key={publicacao.id} className="border-t border-border bg-surface">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(publicacao.createdAt).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">{publicacao.conteudo.calendario.empresa.nome}</td>
                    <td className="px-4 py-3">{publicacao.rede}</td>
                    <td className="px-4 py-3">{STATUS_LABEL[publicacao.status] ?? publicacao.status}</td>
                    <td className="px-4 py-3 text-gray-500">{publicacao.externalPostId ?? "—"}</td>
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

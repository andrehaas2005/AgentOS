import { Sidebar } from "@/components/Sidebar";
import { getConteudos } from "@/lib/api";

const STATUS_LABEL: Record<string, string> = {
  planejado: "Planejado",
  em_producao: "Em produção",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovado: "Aprovado",
  publicado: "Publicado",
  erro: "Erro",
};

function preview(texto: string | null) {
  if (!texto) return "—";
  return texto.length > 100 ? `${texto.slice(0, 100)}…` : texto;
}

export default async function ConteudosPage() {
  const conteudos = await getConteudos();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6">
        <h1 className="mb-6 text-xl font-semibold text-white">Conteúdos Gerados</h1>
        {conteudos.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nenhum conteúdo gerado ainda. Ele aparece aqui depois que o Agente CEO processar um item do
            calendário.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-panel text-gray-400">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Prévia</th>
                  <th className="px-4 py-3">Versão</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {conteudos.map((conteudo) => (
                  <tr key={conteudo.id} className="border-t border-border bg-surface align-top">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(conteudo.createdAt).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">{conteudo.calendario.empresa.nome}</td>
                    <td className="px-4 py-3">{conteudo.calendario.tipoPost}</td>
                    <td className="px-4 py-3 text-gray-300">{preview(conteudo.texto)}</td>
                    <td className="px-4 py-3">v{conteudo.versao}</td>
                    <td className="px-4 py-3">
                      {STATUS_LABEL[conteudo.calendario.status] ?? conteudo.calendario.status}
                    </td>
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

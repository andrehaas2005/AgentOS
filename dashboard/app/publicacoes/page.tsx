import { Sidebar } from "@/components/Sidebar";
import { SelectFiltro } from "@/components/SelectFiltro";
import { EmpresaAvatar } from "@/components/EmpresaAvatar";
import { getPublicacoes, getEmpresas } from "@/lib/api";

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  publicado: "Publicado",
  erro: "Erro",
};

const REDE_OPCOES = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "youtube", label: "YouTube" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "tiktok", label: "TikTok" },
  { value: "blog", label: "Blog" },
  { value: "outro", label: "Outro" },
];

export default async function PublicacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ empresaId?: string; rede?: string }>;
}) {
  const { empresaId, rede } = await searchParams;
  const [publicacoes, empresas] = await Promise.all([
    getPublicacoes(empresaId, rede),
    getEmpresas(),
  ]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Publicações</h1>
          <div className="flex items-center gap-3">
            <SelectFiltro
              paramName="empresaId"
              label="Empresa"
              placeholder="Todas"
              opcoes={empresas.map((e) => ({ value: e.id, label: e.nome }))}
            />
            <SelectFiltro paramName="rede" label="Rede" placeholder="Todas" opcoes={REDE_OPCOES} />
          </div>
        </div>
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
                  <th className="px-4 py-3">Log</th>
                </tr>
              </thead>
              <tbody>
                {publicacoes.map((publicacao) => (
                  <tr key={publicacao.id} className="border-t border-border bg-surface">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(publicacao.createdAt).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <EmpresaAvatar
                          nome={publicacao.conteudo.calendario.empresa.nome}
                          logoUrl={publicacao.conteudo.calendario.empresa.logoUrl}
                          size={20}
                        />
                        {publicacao.conteudo.calendario.empresa.nome}
                      </div>
                    </td>
                    <td className="px-4 py-3">{publicacao.rede}</td>
                    <td className="px-4 py-3">{STATUS_LABEL[publicacao.status] ?? publicacao.status}</td>
                    <td className="px-4 py-3 text-gray-500">{publicacao.externalPostId ?? "—"}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-gray-500" title={publicacao.log ?? undefined}>
                      {publicacao.log ?? "—"}
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

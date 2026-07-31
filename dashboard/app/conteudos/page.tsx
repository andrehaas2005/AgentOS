import { Sidebar } from "@/components/Sidebar";
import { SelectFiltro } from "@/components/SelectFiltro";
import { SelectFiltroEmpresa } from "@/components/SelectFiltroEmpresa";
import { ConteudosView } from "@/components/ConteudosView";
import { getConteudos, getEmpresas } from "@/lib/api";

const TIPO_OPCOES = [
  { value: "imagem_frase", label: "Imagem + frase" },
  { value: "carrossel", label: "Carrossel" },
  { value: "animacao", label: "Animação" },
  { value: "video_curto", label: "Vídeo curto" },
  { value: "stories", label: "Stories" },
  { value: "reels", label: "Reels" },
  { value: "post", label: "Post" },
];

export default async function ConteudosPage({
  searchParams,
}: {
  searchParams: Promise<{ empresaId?: string; tipoPost?: string }>;
}) {
  const { empresaId, tipoPost } = await searchParams;
  const [conteudos, empresas] = await Promise.all([
    getConteudos(empresaId, tipoPost),
    getEmpresas(),
  ]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Conteúdos Gerados</h1>
          <div className="flex items-center gap-3">
            <SelectFiltroEmpresa empresas={empresas} />
            <SelectFiltro paramName="tipoPost" label="Tipo" placeholder="Todos" opcoes={TIPO_OPCOES} />
          </div>
        </div>
        {conteudos.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nenhum conteúdo gerado ainda. Ele aparece aqui depois que o Agente CEO processar um item do
            calendário.
          </p>
        ) : (
          <ConteudosView conteudos={conteudos} />
        )}
      </main>
    </div>
  );
}

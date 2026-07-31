import { Sidebar } from "@/components/Sidebar";
import { EmpresaCard } from "@/components/EmpresaCard";
import { NovaEmpresaButton } from "@/components/NovaEmpresaButton";
import { getEmpresas } from "@/lib/api";

const ERRO_LABEL: Record<string, string> = {
  conta_invalida: "Conta social inválida ou não é do Instagram.",
  app_nao_configurado: "Preencha o App ID e o App Secret da Meta antes de conectar.",
  cancelado_pelo_usuario: "Conexão cancelada no Facebook.",
  requisicao_invalida: "Requisição de conexão inválida.",
  estado_invalido: "A conexão expirou ou é inválida — tente novamente.",
  sem_paginas_instagram: "Nenhuma Página do Facebook com Instagram profissional vinculado foi encontrada.",
  falha_meta: "O Facebook recusou a conexão. Tente novamente.",
};

export default async function EmpresasPage({
  searchParams,
}: {
  searchParams: Promise<{ instagram?: string; erro?: string }>;
}) {
  const [empresas, { instagram, erro }] = await Promise.all([getEmpresas(), searchParams]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6">
        {instagram === "conectado" && (
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
            Conta do Instagram conectada com sucesso.
          </div>
        )}
        {erro && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
            {ERRO_LABEL[erro] ?? "Não foi possível conectar com o Instagram."}
          </div>
        )}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Empresas</h1>
          <NovaEmpresaButton />
        </div>
        {empresas.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma empresa cadastrada ainda.</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {empresas.map((empresa) => (
              <EmpresaCard key={empresa.id} empresa={empresa} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

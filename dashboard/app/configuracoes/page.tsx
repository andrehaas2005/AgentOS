import { ConfiguracaoVideoManager } from "@/components/ConfiguracaoVideoManager";

export default function ConfiguracoesPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Configurações</h1>
        <p className="mt-1 text-sm text-gray-400">Ajustes gerais do sistema — provedores e modelos usados na geração de conteúdo.</p>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <ConfiguracaoVideoManager />
      </div>
    </>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, X, Eye, EyeOff } from "lucide-react";
import {
  atualizarContaSocial,
  criarContaSocial,
  excluirContaSocial,
  urlOauthInstagram,
  urlOauthLinkedin,
  type ContaSocial,
} from "@/lib/api";

const REDES = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "youtube", label: "YouTube" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "tiktok", label: "TikTok" },
  { value: "blog", label: "Blog" },
  { value: "outro", label: "Outro" },
];

const REDE_LABEL: Record<string, string> = Object.fromEntries(REDES.map((r) => [r.value, r.label]));

type Par = { chave: string; valor: string; mascarado?: string };

function rotuloConta(conta: ContaSocial) {
  if (conta.rede === "outro" && conta.rotuloCustom) return conta.rotuloCustom;
  return REDE_LABEL[conta.rede] ?? conta.rede;
}

function StatusInstagram({ conta }: { conta: ContaSocial }) {
  const credenciais = conta.credenciais ?? {};

  if (credenciais.ig_user_id) {
    return (
      <p className="truncate text-[11px] text-emerald-400">
        ● Conectado{credenciais.ig_username ? ` como @${credenciais.ig_username}` : ""}
      </p>
    );
  }

  if (credenciais.meta_app_id) {
    return (
      <a
        href={urlOauthInstagram(conta.id)}
        className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline"
      >
        Conectar com Facebook →
      </a>
    );
  }

  return <p className="truncate text-[11px] text-gray-500">Preencha o App ID/Secret da Meta pra conectar</p>;
}

function StatusLinkedin({ conta }: { conta: ContaSocial }) {
  const credenciais = conta.credenciais ?? {};

  if (credenciais.linkedin_sub) {
    return (
      <p className="truncate text-[11px] text-emerald-400">
        ● Conectado{credenciais.linkedin_nome ? ` como ${credenciais.linkedin_nome}` : ""}
      </p>
    );
  }

  if (credenciais.linkedin_client_id) {
    return (
      <a
        href={urlOauthLinkedin(conta.id)}
        className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline"
      >
        Conectar com LinkedIn →
      </a>
    );
  }

  return <p className="truncate text-[11px] text-gray-500">Preencha o Client ID/Secret do LinkedIn pra conectar</p>;
}

function MiniForm({
  empresaId,
  contaExistente,
  onCancelar,
  onSalvo,
}: {
  empresaId: string;
  contaExistente?: ContaSocial;
  onCancelar: () => void;
  onSalvo: (conta: ContaSocial) => void;
}) {
  const [rede, setRede] = useState(contaExistente?.rede ?? "instagram");
  const [rotuloCustom, setRotuloCustom] = useState(contaExistente?.rotuloCustom ?? "");
  const [pares, setPares] = useState<Par[]>(
    contaExistente
      ? Object.entries(contaExistente.credenciais ?? {}).map(([chave, valor]) => ({
          chave,
          valor: "",
          mascarado: valor,
        }))
      : [{ chave: "", valor: "" }],
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [visiveis, setVisiveis] = useState<Set<number>>(new Set());

  function atualizarPar(i: number, campo: "chave" | "valor", valor: string) {
    setPares((prev) => prev.map((p, idx) => (idx === i ? { ...p, [campo]: valor } : p)));
  }

  function alternarVisivel(i: number) {
    setVisiveis((prev) => {
      const proximo = new Set(prev);
      if (proximo.has(i)) proximo.delete(i);
      else proximo.add(i);
      return proximo;
    });
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);

    const credenciais = Object.fromEntries(
      pares.filter((p) => p.chave.trim() && p.valor.trim()).map((p) => [p.chave.trim(), p.valor.trim()]),
    );
    const status = Object.keys(credenciais).length > 0 ? "conectado" : "desconectado";

    const resultado = contaExistente
      ? await atualizarContaSocial(contaExistente.id, {
          rede,
          rotuloCustom: rede === "outro" ? rotuloCustom : undefined,
          credenciais: Object.keys(credenciais).length > 0 ? credenciais : undefined,
        })
      : await criarContaSocial({
          empresaId,
          rede,
          rotuloCustom: rede === "outro" ? rotuloCustom : undefined,
          credenciais,
          status,
        });

    setSalvando(false);
    if (!resultado.ok || !resultado.conta) {
      setErro(resultado.erro ?? "Erro ao salvar.");
      return;
    }
    onSalvo(resultado.conta);
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="mb-2 flex gap-2">
        <select
          value={rede}
          onChange={(e) => setRede(e.target.value)}
          className="rounded-lg border border-border bg-panel px-2 py-1.5 text-sm text-white outline-none"
        >
          {REDES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        {rede === "outro" && (
          <input
            value={rotuloCustom}
            onChange={(e) => setRotuloCustom(e.target.value)}
            placeholder="ex: Blog no Wordpress"
            className="flex-1 rounded-lg border border-border bg-panel px-2 py-1.5 text-sm text-white outline-none"
          />
        )}
      </div>

      <p className="mb-1 text-[11px] text-gray-500">
        Credenciais/tokens
        {contaExistente &&
          " — o valor real não é reenviado por segurança; o texto cinza mostra os últimos dígitos do que já está salvo. Deixe em branco pra manter."}
      </p>
      <div className="flex flex-col gap-1.5">
        {pares.map((par, i) => (
          <div key={i} className="flex gap-1.5">
            <input
              value={par.chave}
              onChange={(e) => atualizarPar(i, "chave", e.target.value)}
              placeholder="ex: access_token"
              className="w-1/3 rounded-lg border border-border bg-panel px-2 py-1 text-xs text-white outline-none"
            />
            <input
              value={par.valor}
              onChange={(e) => atualizarPar(i, "valor", e.target.value)}
              placeholder={par.mascarado ? `${par.mascarado} (salvo — digite p/ substituir)` : "valor"}
              type={visiveis.has(i) ? "text" : "password"}
              className="flex-1 rounded-lg border border-border bg-panel px-2 py-1 text-xs text-white outline-none placeholder:text-gray-500"
            />
            <button
              type="button"
              onClick={() => alternarVisivel(i)}
              className="rounded-lg p-1 text-gray-500 hover:text-white"
              title={visiveis.has(i) ? "Ocultar valor" : "Mostrar valor"}
            >
              {visiveis.has(i) ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <button
              type="button"
              onClick={() => setPares((prev) => prev.filter((_, idx) => idx !== i))}
              className="rounded-lg p-1 text-gray-500 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setPares((prev) => [...prev, { chave: "", valor: "" }])}
          className="flex w-fit items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300"
        >
          <Plus size={12} /> adicionar campo
        </button>
      </div>

      {erro && <p className="mt-2 text-xs text-red-400">{erro}</p>}

      <div className="mt-2 flex justify-end gap-2">
        <button type="button" onClick={onCancelar} className="text-xs text-gray-400 hover:text-white">
          Cancelar
        </button>
        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}

export function ContaSocialManager({
  empresaId,
  contasSociais,
}: {
  empresaId: string;
  contasSociais: ContaSocial[];
}) {
  const router = useRouter();
  const [contas, setContas] = useState(contasSociais ?? []);
  const [adicionando, setAdicionando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  useEffect(() => {
    setContas(contasSociais ?? []);
  }, [contasSociais]);

  function aoAdicionar(conta: ContaSocial) {
    setContas((prev) => [...prev, conta]);
    setAdicionando(false);
    router.refresh();
  }

  function aoEditar(conta: ContaSocial) {
    setContas((prev) => prev.map((c) => (c.id === conta.id ? conta : c)));
    setEditandoId(null);
    router.refresh();
  }

  async function excluir(id: string) {
    setContas((prev) => prev.filter((c) => c.id !== id));
    await excluirContaSocial(id);
    router.refresh();
  }

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-gray-300">Redes sociais</p>
      <div className="flex flex-col gap-2">
        {contas.map((conta) =>
          editandoId === conta.id ? (
            <MiniForm
              key={conta.id}
              empresaId={empresaId}
              contaExistente={conta}
              onCancelar={() => setEditandoId(null)}
              onSalvo={aoEditar}
            />
          ) : (
            <div
              key={conta.id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-white">{rotuloConta(conta)}</p>
                {conta.rede === "instagram" ? (
                  <StatusInstagram conta={conta} />
                ) : conta.rede === "linkedin" ? (
                  <StatusLinkedin conta={conta} />
                ) : (
                  <p className="truncate text-[11px] text-gray-500">
                    {conta.credenciais && Object.keys(conta.credenciais).length > 0
                      ? Object.entries(conta.credenciais)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" · ")
                      : "sem credenciais"}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditandoId(conta.id)}
                  className="rounded-lg p-1 text-gray-500 hover:bg-panel hover:text-white"
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => excluir(conta.id)}
                  className="rounded-lg p-1 text-gray-500 hover:bg-panel hover:text-red-400"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ),
        )}

        {adicionando ? (
          <MiniForm empresaId={empresaId} onCancelar={() => setAdicionando(false)} onSalvo={aoAdicionar} />
        ) : (
          <button
            type="button"
            onClick={() => setAdicionando(true)}
            className="flex w-fit items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
          >
            <Plus size={13} /> Adicionar rede social
          </button>
        )}
      </div>
    </div>
  );
}

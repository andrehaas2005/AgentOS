"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2, X } from "lucide-react";
import { agentesCompletos, spriteDoAgente } from "@/lib/agentes";
import {
  getAgentesCustomizados,
  getLayoutEscritorio,
  salvarLayoutEscritorio,
  type AgenteCustomizado,
} from "@/lib/api";
import {
  LAYOUT_ESCRITORIO_PADRAO,
  type LayoutEscritorioDados,
  type MesaLayout,
  type ObjetoLayout,
} from "@/lib/layoutEscritorioPadrao";
import { CATEGORIAS_PALETA, PALETA_OBJETOS, PISOS_DISPONIVEIS, type CategoriaObjeto, type ItemPaleta } from "@/lib/paletaEscritorio";

type Arraste =
  | { tipo: "objeto"; id: string; moveu: boolean }
  | { tipo: "mesa"; agenteId: string; moveu: boolean };

function clamp(valor: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, valor));
}

function backgroundSizeParaTextura(textura: string): string {
  return textura === "floor-checker.png" ? "28px 28px" : "40px 40px";
}

// Sala que contém o ponto (px, py), ambos % do canvas inteiro — em caso de
// sobreposição, a última da lista (desenhada por cima) vence.
function salaNoPonto(salas: LayoutEscritorioDados["salas"], px: number, py: number) {
  for (let i = salas.length - 1; i >= 0; i -= 1) {
    const s = salas[i];
    if (px >= s.x && px <= s.x + s.w && py >= s.y && py <= s.y + s.h) return s;
  }
  return salas[0];
}

export function EscritorioEditor({ onClose, onPublicado }: { onClose: () => void; onPublicado: () => void }) {
  const [layout, setLayout] = useState<LayoutEscritorioDados>(LAYOUT_ESCRITORIO_PADRAO);
  const [customizados, setCustomizados] = useState<AgenteCustomizado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [categoria, setCategoria] = useState<CategoriaObjeto>("moveis");
  const [ferramenta, setFerramenta] = useState<ItemPaleta | null>(null);
  const [objetoSelecionado, setObjetoSelecionado] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const arrasteRef = useRef<Arraste | null>(null);

  useEffect(() => {
    let cancelado = false;
    async function buscar() {
      const [dadosLayout, dadosCustomizados] = await Promise.all([
        getLayoutEscritorio(),
        getAgentesCustomizados(),
      ]);
      if (!cancelado) {
        setLayout(dadosLayout);
        setCustomizados(dadosCustomizados);
        setCarregando(false);
      }
    }
    buscar();
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (ferramenta) setFerramenta(null);
        else if (objetoSelecionado) setObjetoSelecionado(null);
        else fecharComConfirmacao();
      }
      if ((e.key === "Delete" || e.key === "Backspace") && objetoSelecionado) {
        removerObjeto(objetoSelecionado);
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ferramenta, objetoSelecionado]);

  const agentes = agentesCompletos(customizados);
  const salaPorId = new Map(layout.salas.map((sala) => [sala.id, sala]));

  function pontoDoEvento(e: { clientX: number; clientY: number }): { x: number; y: number } | null {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: clamp(((e.clientX - rect.left) / rect.width) * 100),
      y: clamp(((e.clientY - rect.top) / rect.height) * 100),
    };
  }

  function removerObjeto(id: string) {
    setLayout((prev) => ({ ...prev, objetos: prev.objetos.filter((o) => o.id !== id) }));
    setObjetoSelecionado(null);
    setDirty(true);
  }

  function adicionarMesa(agenteId: string) {
    setLayout((prev) => ({
      ...prev,
      mesas: [...prev.mesas, { agenteId, x: 50, y: 50, copaX: 77, copaY: 48 }],
    }));
    setDirty(true);
  }

  function trocarPiso(salaId: string, textura: string) {
    setLayout((prev) => ({
      ...prev,
      salas: prev.salas.map((s) => (s.id === salaId ? { ...s, texturaPiso: textura } : s)),
    }));
    setDirty(true);
  }

  function aoClicarCanvas(e: React.MouseEvent<HTMLDivElement>) {
    if (arrasteRef.current?.moveu) return; // clique disparado no fim de um arraste — ignora
    const ponto = pontoDoEvento(e);
    if (!ponto) return;

    if (ferramenta) {
      const sala = salaNoPonto(layout.salas, ponto.x, ponto.y);
      const relX = clamp(((ponto.x - sala.x) / sala.w) * 100);
      const relY = clamp(((ponto.y - sala.y) / sala.h) * 100);
      const novo: ObjetoLayout = {
        id: `${ferramenta.id}-${Date.now()}-${Math.round(Math.random() * 1000)}`,
        salaId: sala.id,
        sprite: ferramenta.sprite,
        x: relX,
        y: relY,
        w: ferramenta.larguraPadrao,
        camada: ferramenta.camada,
      };
      setLayout((prev) => ({ ...prev, objetos: [...prev.objetos, novo] }));
      setDirty(true);
      return;
    }

    setObjetoSelecionado(null);
  }

  function aoMoverPonteiro(e: React.PointerEvent<HTMLDivElement>) {
    const arraste = arrasteRef.current;
    if (!arraste) return;
    const ponto = pontoDoEvento(e);
    if (!ponto) return;
    arraste.moveu = true;

    if (arraste.tipo === "mesa") {
      setLayout((prev) => ({
        ...prev,
        mesas: prev.mesas.map((m) => (m.agenteId === arraste.agenteId ? { ...m, x: ponto.x, y: ponto.y } : m)),
      }));
    } else {
      const sala = salaNoPonto(layout.salas, ponto.x, ponto.y);
      const relX = clamp(((ponto.x - sala.x) / sala.w) * 100);
      const relY = clamp(((ponto.y - sala.y) / sala.h) * 100);
      setLayout((prev) => ({
        ...prev,
        objetos: prev.objetos.map((o) =>
          o.id === arraste.id ? { ...o, salaId: sala.id, x: relX, y: relY } : o,
        ),
      }));
    }
    setDirty(true);
  }

  function aoSoltarPonteiro() {
    const arraste = arrasteRef.current;
    if (arraste && !arraste.moveu && arraste.tipo === "objeto") {
      setObjetoSelecionado(arraste.id);
    }
    // zera num próximo tick, pra aoClicarCanvas (disparado logo após o pointerup) ainda ver `moveu`
    setTimeout(() => {
      arrasteRef.current = null;
    }, 0);
  }

  async function publicar() {
    setSalvando(true);
    const resultado = await salvarLayoutEscritorio(layout);
    setSalvando(false);
    if (!resultado.ok) {
      window.alert(resultado.erro ?? "Não foi possível salvar o layout.");
      return;
    }
    onPublicado();
  }

  function fecharComConfirmacao() {
    if (dirty && !window.confirm("Descartar as alterações feitas no escritório?")) return;
    onClose();
  }

  const itensCategoria = PALETA_OBJETOS.filter((item) => item.categoria === categoria);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0b0d14] p-3 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Editor do Escritório</h2>
          <p className="text-xs text-gray-500">
            Clique num item da paleta e depois no mapa pra colocar. Arraste objetos e mesas pra reposicionar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fecharComConfirmacao}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-gray-300 hover:bg-panel hover:text-white"
          >
            Descartar
          </button>
          <button
            type="button"
            onClick={publicar}
            disabled={salvando || carregando}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {salvando ? "Publicando..." : "Publicar"}
          </button>
          <button
            type="button"
            onClick={fecharComConfirmacao}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-surface hover:text-white"
            aria-label="Fechar editor"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        {/* paleta */}
        <div className="flex w-56 shrink-0 flex-col gap-3 overflow-y-auto rounded-lg border border-border bg-panel p-3">
          <div>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Piso das salas
            </h3>
            <div className="flex flex-col gap-2">
              {layout.salas
                .filter((sala) => sala.nome)
                .map((sala) => (
                  <div key={sala.id}>
                    <p className="mb-1 text-xs text-gray-300">{sala.nome}</p>
                    <div className="flex gap-1">
                      {PISOS_DISPONIVEIS.map((piso) => (
                        <button
                          key={piso.sprite}
                          type="button"
                          title={piso.label}
                          onClick={() => trocarPiso(sala.id, piso.sprite)}
                          className={`h-6 w-6 rounded border ${
                            sala.texturaPiso === piso.sprite ? "border-blue-500" : "border-border"
                          }`}
                          style={{
                            backgroundImage: `url(/sprites/${piso.sprite})`,
                            backgroundSize: "12px 12px",
                            imageRendering: "pixelated",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="min-h-0 flex-1">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Objetos</h3>
            <div className="mb-2 flex gap-1 rounded-lg border border-border bg-surface p-1">
              {CATEGORIAS_PALETA.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoria(cat.id)}
                  className={`flex-1 rounded-md px-2 py-1 text-[11px] font-medium ${
                    categoria === cat.id ? "bg-panel text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {itensCategoria.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  onClick={() => {
                    setObjetoSelecionado(null);
                    setFerramenta((atual) => (atual?.id === item.id ? null : item));
                  }}
                  className={`flex flex-col items-center gap-1 rounded-lg border p-1.5 ${
                    ferramenta?.id === item.id
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-border bg-surface hover:border-gray-600"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/sprites/${item.sprite}`}
                    alt={item.label}
                    className="h-8 w-8 object-contain"
                    style={{ imageRendering: "pixelated" }}
                  />
                  <span className="text-center text-[9px] leading-tight text-gray-400">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* canvas */}
        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-surface">
          <div
            ref={canvasRef}
            onClick={aoClicarCanvas}
            onPointerMove={aoMoverPonteiro}
            onPointerUp={aoSoltarPonteiro}
            className="relative h-full w-full"
            style={{ cursor: ferramenta ? "copy" : "default" }}
          >
            <div
              className="absolute inset-x-0 top-0 z-0 h-6"
              style={{
                backgroundImage: "url(/sprites/wall-tan.png)",
                backgroundSize: "32px 32px",
                imageRendering: "pixelated",
              }}
            />

            {layout.salas.map((sala) => (
              <div
                key={sala.id}
                className="absolute z-0"
                style={{
                  left: `${sala.x}%`,
                  top: `${sala.y}%`,
                  width: `${sala.w}%`,
                  height: `${sala.h}%`,
                  backgroundImage: `url(/sprites/${sala.texturaPiso})`,
                  backgroundSize: backgroundSizeParaTextura(sala.texturaPiso),
                  imageRendering: "pixelated",
                }}
              >
                {sala.nome && (
                  <span className="absolute left-2 top-1 z-10 rounded bg-black/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-300">
                    {sala.nome}
                  </span>
                )}
              </div>
            ))}

            {layout.objetos.map((objeto) => {
              const sala = salaPorId.get(objeto.salaId);
              if (!sala) return null;
              const left = sala.x + (objeto.x / 100) * sala.w;
              const top = objeto.camada === "parede" ? sala.y : sala.y + (objeto.y / 100) * sala.h;
              const largura = (objeto.w / 100) * sala.w;
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={objeto.id}
                  src={`/sprites/${objeto.sprite}`}
                  alt=""
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    arrasteRef.current = { tipo: "objeto", id: objeto.id, moveu: false };
                  }}
                  className={`absolute z-10 cursor-grab active:cursor-grabbing ${
                    objetoSelecionado === objeto.id ? "outline outline-2 outline-blue-500" : ""
                  }`}
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    width: `${largura}%`,
                    transform: `translateX(-50%) rotate(${objeto.rotacao ?? 0}deg)`,
                    imageRendering: "pixelated",
                  }}
                />
              );
            })}

            {layout.mesas.map((mesa: MesaLayout) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={mesa.agenteId}
                src={spriteDoAgente(mesa.agenteId)}
                alt={mesa.agenteId}
                title={mesa.agenteId}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  arrasteRef.current = { tipo: "mesa", agenteId: mesa.agenteId, moveu: false };
                }}
                className="absolute z-20 w-9 -translate-x-1/2 cursor-grab active:cursor-grabbing"
                style={{ left: `${mesa.x}%`, top: `${mesa.y}%`, imageRendering: "pixelated" }}
              />
            ))}
          </div>
        </div>

        {/* mesas dos agentes */}
        <div className="w-52 shrink-0 overflow-y-auto rounded-lg border border-border bg-panel p-3">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Mesas dos agentes
          </h3>
          {objetoSelecionado && (
            <button
              type="button"
              onClick={() => removerObjeto(objetoSelecionado)}
              className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-900 bg-red-500/10 px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/20"
            >
              <Trash2 size={12} /> Remover objeto selecionado
            </button>
          )}
          <ul className="flex flex-col gap-1.5">
            {agentes.map((agente) => {
              const mesa = layout.mesas.find((m) => m.agenteId === agente.nome);
              return (
                <li
                  key={agente.nome}
                  className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1.5"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={spriteDoAgente(agente.nome)}
                    alt=""
                    className="h-5 w-5"
                    style={{ imageRendering: "pixelated" }}
                  />
                  <span className="flex-1 truncate text-xs text-gray-300">{agente.nome}</span>
                  {!mesa && (
                    <button
                      type="button"
                      onClick={() => adicionarMesa(agente.nome)}
                      className="rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] text-blue-300 hover:bg-blue-500/25"
                    >
                      + mesa
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

"use client";

type Props = {
  nome: string;
  sprite: string;
  x: number;
  y: number;
  ativo: boolean;
  fala?: string;
  onClick: () => void;
};

export function PersonagemCena({ nome, sprite, x, y, ativo, fala, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute z-20 w-9 -translate-x-1/2 cursor-pointer border-0 bg-transparent p-0"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div
        className={
          ativo
            ? "animate-[agente-trabalhando_0.7s_ease-in-out_infinite]"
            : "animate-[agente-ocioso_2.6s_ease-in-out_infinite]"
        }
      >
        {fala && (
          <div className="absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-[110px] -translate-x-1/2">
            <div className="relative rounded-md bg-white px-1.5 py-1 text-left text-[9px] leading-tight text-black shadow-md">
              {fala}
              <div className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-white" />
            </div>
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={sprite}
          alt={nome}
          className="w-full drop-shadow-md"
          style={{ imageRendering: "pixelated" }}
        />
        <span
          className={`absolute -right-0.5 -top-0.5 block h-2.5 w-2.5 rounded-full ring-2 ring-surface ${
            ativo ? "bg-emerald-400" : "bg-amber-400"
          }`}
        />
      </div>
      <span className="absolute left-1/2 top-full mt-0.5 -translate-x-1/2 whitespace-nowrap rounded bg-black/60 px-1 text-[8px] text-white">
        {nome}
      </span>
    </button>
  );
}

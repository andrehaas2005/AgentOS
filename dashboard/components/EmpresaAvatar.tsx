import { urlPublica } from "@/lib/api";

const CORES = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-pink-500", "bg-violet-500", "bg-cyan-500"];

function corPorNome(nome: string) {
  const indice = nome.charCodeAt(0) % CORES.length;
  return CORES[indice];
}

type Props = {
  nome: string;
  logoUrl?: string | null;
  size?: number;
};

export function EmpresaAvatar({ nome, logoUrl, size = 24 }: Props) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={urlPublica(logoUrl)}
        alt={nome}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full text-white ${corPorNome(nome)}`}
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {nome.charAt(0).toUpperCase()}
    </span>
  );
}

// Catálogo dos modelos de vídeo do Replicate que o AgentOS sabe usar. Fonte única de
// verdade tanto pro backend (validar o que a tela de Configurações grava) quanto pro
// frontend (a tela renderiza os campos de cada modelo a partir daqui, via GET
// /api/configuracao/video — nunca duplica essa lista em código do dashboard).
//
// Trocar de modelo é só usuário escolher outro item aqui na tela — nenhum redeploy.
// Pra adicionar um modelo novo no catálogo (esse sim exige código + deploy), basta somar
// uma entrada nova em MODELOS_VIDEO com os campos que o modelo aceita.

export type CampoModeloVideo =
  | { chave: string; label: string; tipo: "select"; opcoes: string[]; padrao: string }
  | { chave: string; label: string; tipo: "numero"; min: number; max: number; padrao: number }
  | { chave: string; label: string; tipo: "booleano"; padrao: boolean };

export type ModeloVideo = {
  slug: string; // owner/model do Replicate
  nome: string; // nome de exibição na tela
  descricao: string;
  urlDocumentacao: string;
  campos: CampoModeloVideo[];
};

export const MODELOS_VIDEO: ModeloVideo[] = [
  {
    slug: "prunaai/p-video",
    nome: "Pruna — P-Video",
    descricao:
      "Endpoint all-in-one (texto/imagem/áudio-pra-vídeo) com diálogo e som nativos, até 1080p/48fps, vários formatos de tela.",
    urlDocumentacao: "https://replicate.com/prunaai/p-video",
    campos: [
      { chave: "duration", label: "Duração (s)", tipo: "numero", min: 1, max: 10, padrao: 10 },
      {
        chave: "aspect_ratio",
        label: "Formato de tela",
        tipo: "select",
        opcoes: ["16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "1:1"],
        padrao: "9:16",
      },
      { chave: "resolution", label: "Resolução", tipo: "select", opcoes: ["720p", "1080p"], padrao: "720p" },
      { chave: "fps", label: "FPS", tipo: "select", opcoes: ["24", "48"], padrao: "24" },
      { chave: "draft", label: "Modo rascunho (mais barato, qualidade menor)", tipo: "booleano", padrao: false },
      { chave: "prompt_upsampling", label: "Melhorar prompt automaticamente", tipo: "booleano", padrao: true },
    ],
  },
  {
    slug: "pixverse/pixverse-v5.6",
    nome: "Pixverse v5.6",
    descricao: "Texto-pra-vídeo com áudio nativo (trilha, efeitos e falas), sem precisar de um provedor de TTS separado.",
    urlDocumentacao: "https://replicate.com/pixverse/pixverse-v5.6",
    campos: [
      { chave: "duration", label: "Duração (s)", tipo: "numero", min: 1, max: 10, padrao: 10 },
      {
        chave: "aspect_ratio",
        label: "Formato de tela",
        tipo: "select",
        opcoes: ["16:9", "9:16", "1:1", "4:3", "3:4"],
        padrao: "9:16",
      },
      { chave: "quality", label: "Qualidade", tipo: "select", opcoes: ["360p", "540p", "720p", "1080p"], padrao: "540p" },
      { chave: "generate_audio_switch", label: "Gerar áudio nativo", tipo: "booleano", padrao: true },
    ],
  },
];

export function encontrarModeloVideo(slug: string): ModeloVideo | undefined {
  return MODELOS_VIDEO.find((m) => m.slug === slug);
}

// Monta o objeto de parâmetros default (chave -> valor padrão) de um modelo do catálogo —
// usado tanto pra popular a tela quando o usuário troca de modelo quanto como fallback do
// singleton no banco na primeira leitura.
export function parametrosPadraoDoModelo(modelo: ModeloVideo): Record<string, unknown> {
  const parametros: Record<string, unknown> = {};
  for (const campo of modelo.campos) {
    parametros[campo.chave] = campo.tipo === "numero" ? campo.padrao : campo.padrao;
  }
  return parametros;
}

// Modelo/parâmetros usados quando ainda não existe configuração salva no banco.
export const CONFIGURACAO_VIDEO_PADRAO = {
  modelo: "prunaai/p-video",
  parametros: parametrosPadraoDoModelo(MODELOS_VIDEO[0]),
};

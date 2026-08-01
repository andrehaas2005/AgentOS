export const TIPOS_POST = [
  "imagem_frase",
  "carrossel",
  "animacao",
  "video_curto",
  "stories",
  "reels",
  "post",
] as const;

export type TipoPostValor = (typeof TIPOS_POST)[number];

import { gerarVideoReplicate } from "./replicateClient";

// Ao contrário de imagem (que tem fallback Gemini), hoje só existe um provedor de vídeo —
// se o Pixverse/Replicate falhar, o post segue sem mídia automática (mesmo comportamento
// defensivo de gerarUmaImagemBuffer: null em vez de derrubar o pipeline inteiro).
export async function gerarUmVideoBuffer(promptVideo: string): Promise<Buffer | null> {
  try {
    return await gerarVideoReplicate(promptVideo);
  } catch (erro) {
    console.warn(`Geração de vídeo via Replicate/Pixverse falhou (post seguirá sem mídia automática): ${erro}`);
    return null;
  }
}

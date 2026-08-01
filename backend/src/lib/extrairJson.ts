// Modelos às vezes respondem com um objeto JSON puro, às vezes envolto em blocos de
// código markdown, e às vezes com uma explicação em prosa antes do JSON (mesmo quando
// instruídos a não fazer isso) — extrai só o primeiro objeto JSON top-level do texto.
export function extrairJson(texto: string): string {
  const semMarkdown = texto.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  const inicio = semMarkdown.indexOf("{");
  const fim = semMarkdown.lastIndexOf("}");
  if (inicio === -1 || fim === -1 || fim < inicio) return semMarkdown;
  return semMarkdown.slice(inicio, fim + 1);
}

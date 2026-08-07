import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { tokenSessaoValido, NOME_COOKIE_SESSAO } from "@/lib/sessao";

// Protege todo o dashboard atrás de login — antes disso só a rota de publicar tinha Basic
// Auth no nginx e o resto ficava aberto. Roda em runtime Node.js (não Edge) porque a
// verificação usa o módulo `crypto` nativo, compartilhado com o backend.
export const runtime = "nodejs";

export function middleware(req: NextRequest) {
  const token = req.cookies.get(NOME_COOKIE_SESSAO)?.value;
  if (tokenSessaoValido(token)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|auth|_next/static|_next/image|favicon.ico).*)"],
};

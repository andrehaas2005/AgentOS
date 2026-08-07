"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setEntrando(true);
    setErro(null);
    try {
      const res = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, senha }),
      });
      if (!res.ok) {
        const corpo = await res.json().catch(() => null);
        setErro(corpo?.error ?? "Usuário ou senha incorretos.");
        setEntrando(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setErro("Falha de conexão com o servidor.");
      setEntrando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={entrar} className="w-full max-w-sm rounded-xl border border-border bg-panel p-6">
        <h1 className="text-lg font-semibold text-white">AgentOS</h1>
        <p className="mt-1 text-sm text-gray-400">Entre para acessar o painel.</p>

        <div className="mt-5 flex flex-col gap-3">
          <input
            type="text"
            placeholder="Usuário"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoFocus
            autoComplete="username"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
          />
          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="current-password"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
          />
        </div>

        {erro && <p className="mt-3 text-xs text-red-400">{erro}</p>}

        <button
          type="submit"
          disabled={entrando || !usuario || !senha}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          <LogIn size={15} /> {entrando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

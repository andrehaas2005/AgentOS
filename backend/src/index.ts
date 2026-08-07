import "dotenv/config";
import path from "path";
import cors from "cors";
import express from "express";
import { empresasRouter } from "./routes/empresas";
import { calendarioRouter } from "./routes/calendario";
import { dashboardRouter } from "./routes/dashboard";
import { conteudosRouter } from "./routes/conteudos";
import { publicacoesRouter } from "./routes/publicacoes";
import { agentesRouter } from "./routes/agentes";
import { contasSociaisRouter } from "./routes/contasSociais";
import { oauthInstagramRouter } from "./routes/oauthInstagram";
import { oauthLinkedinRouter } from "./routes/oauthLinkedin";
import { frasesRouter } from "./routes/frases";
import { agentesCustomizadosRouter } from "./routes/agentesCustomizados";
import { escritorioRouter } from "./routes/escritorio";
import { iniciarRenovacaoAutomaticaDeTokens } from "./lib/renovarTokens";
import { iniciarAgendadorExecucao } from "./lib/agendadorExecucao";
import { tokenSessaoValido, lerCookie, NOME_COOKIE_SESSAO } from "./lib/sessao";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Login/logout acontecem no dashboard (Next.js), não aqui — este middleware só valida o
// cookie de sessão que o dashboard emite. Substitui o Basic Auth que existia só na rota de
// publicar; agora toda a API exige sessão válida.
app.use("/api", (req, res, next) => {
  const token = lerCookie(req.headers.cookie, NOME_COOKIE_SESSAO);
  if (!tokenSessaoValido(token)) {
    return res.status(401).json({ error: "Não autenticado." });
  }
  next();
});

app.use("/api/empresas", empresasRouter);
app.use("/api/calendario", calendarioRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/conteudos", conteudosRouter);
app.use("/api/publicacoes", publicacoesRouter);
app.use("/api/agentes", agentesRouter);
app.use("/api/contas-sociais", contasSociaisRouter);
app.use("/api/oauth/instagram", oauthInstagramRouter);
app.use("/api/oauth/linkedin", oauthLinkedinRouter);
app.use("/api/frases", frasesRouter);
app.use("/api/agentes-customizados", agentesCustomizadosRouter);
app.use("/api/escritorio", escritorioRouter);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(PORT, () => {
  console.log(`AgentOS backend rodando na porta ${PORT}`);
  iniciarRenovacaoAutomaticaDeTokens();
  iniciarAgendadorExecucao();
});

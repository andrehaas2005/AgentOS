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

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/empresas", empresasRouter);
app.use("/api/calendario", calendarioRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/conteudos", conteudosRouter);
app.use("/api/publicacoes", publicacoesRouter);
app.use("/api/agentes", agentesRouter);
app.use("/api/contas-sociais", contasSociaisRouter);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(PORT, () => {
  console.log(`AgentOS backend rodando na porta ${PORT}`);
});

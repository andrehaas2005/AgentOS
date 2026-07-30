import "dotenv/config";
import cors from "cors";
import express from "express";
import { empresasRouter } from "./routes/empresas";
import { calendarioRouter } from "./routes/calendario";
import { dashboardRouter } from "./routes/dashboard";
import { conteudosRouter } from "./routes/conteudos";
import { publicacoesRouter } from "./routes/publicacoes";
import { agentesRouter } from "./routes/agentes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/empresas", empresasRouter);
app.use("/api/calendario", calendarioRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/conteudos", conteudosRouter);
app.use("/api/publicacoes", publicacoesRouter);
app.use("/api/agentes", agentesRouter);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(PORT, () => {
  console.log(`AgentOS backend rodando na porta ${PORT}`);
});

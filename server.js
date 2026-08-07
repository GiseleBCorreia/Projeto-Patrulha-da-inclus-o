require("dotenv").config();

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const multer = require("multer");
const { rateLimit } = require("express-rate-limit");
const { validarCodigo } = require("./lib/totp");

const app = express();

app.set("trust proxy", 1);

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_FILE = path.join(ROOT, "data", "voluntarios.json");
const UPLOAD_DIR = path.join(ROOT, "uploads");

if (!process.env.TOTP_SECRET || !process.env.SESSION_SECRET) {
  console.error("\nConfiguração ausente. Execute primeiro: npm run setup-auth\n");
  process.exit(1);
}

fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]\n", "utf8");

app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  crossOriginResourcePolicy: { policy: "same-origin" }
}));
app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: false, limit: "50kb" }));
app.use(session({
  name: "patrulha_admin",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 15 * 60 * 1000
  }
}));

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { erro: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }
});

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, UPLOAD_DIR),
  filename: (_req, file, callback) => {
    const extensoes = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
    callback(null, `${Date.now()}-${crypto.randomUUID()}${extensoes[file.mimetype] || ""}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const permitido = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
    callback(permitido ? null : new Error("Use uma imagem JPG, PNG ou WebP."), permitido);
  }
});

function lerVoluntarios() {
  try {
    const conteudo = fs.readFileSync(DATA_FILE, "utf8");
    const dados = JSON.parse(conteudo);
    return Array.isArray(dados) ? dados : [];
  } catch (erro) {
    console.error("Erro ao ler voluntários:", erro);
    return [];
  }
}

function salvarVoluntarios(voluntarios) {
  const temporario = `${DATA_FILE}.tmp`;
  fs.writeFileSync(temporario, `${JSON.stringify(voluntarios, null, 2)}\n`, "utf8");
  fs.renameSync(temporario, DATA_FILE);
}

function limparTexto(valor, maximo) {
  return String(valor || "").trim().replace(/[\u0000-\u001F\u007F]/g, "").slice(0, maximo);
}

function removerUpload(caminhoPublico) {
  if (!caminhoPublico || !caminhoPublico.startsWith("/uploads/")) return;
  const nome = path.basename(caminhoPublico);
  const caminho = path.join(UPLOAD_DIR, nome);
  if (fs.existsSync(caminho)) fs.unlink(caminho, () => {});
}

function exigirAdmin(req, res, next) {
  if (!req.session.admin) return res.status(401).json({ erro: "Autorização da coordenadora necessária." });
  next();
}

function exigirCsrf(req, res, next) {
  const token = req.get("x-csrf-token");
  const salvo = req.session.csrfToken;
  if (!token || !salvo || token.length !== salvo.length) {
    return res.status(403).json({ erro: "Sessão inválida. Autorize novamente." });
  }
  const valido = crypto.timingSafeEqual(Buffer.from(token), Buffer.from(salvo));
  if (!valido) return res.status(403).json({ erro: "Sessão inválida. Autorize novamente." });
  next();
}

app.get("/api/voluntarios", (_req, res) => {
  res.json(lerVoluntarios());
});

app.get("/api/admin/status", (req, res) => {
  res.json({ autenticado: Boolean(req.session.admin), csrfToken: req.session.admin ? req.session.csrfToken : null });
});

app.post("/api/admin/verificar", loginLimiter, (req, res) => {
  const codigo = String(req.body.codigo || "");

  if (!validarCodigo(process.env.TOTP_SECRET, codigo)) {
    return res.status(401).json({
      erro: "Código inválido ou expirado."
    });
  }

  req.session.regenerate((erro) => {
    if (erro) {
      console.error("Erro ao regenerar sessão:", erro);

      return res.status(500).json({
        erro: "Não foi possível iniciar a sessão."
      });
    }

    req.session.admin = true;
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");

    const csrfToken = req.session.csrfToken;

    req.session.save((erroSalvar) => {
      if (erroSalvar) {
        console.error("Erro ao salvar sessão:", erroSalvar);

        return res.status(500).json({
          erro: "Não foi possível salvar a sessão."
        });
      }

      return res.json({
        autenticado: true,
        csrfToken,
        expiraEmMinutos: 15
      });
    });
  });
});

app.post("/api/admin/sair", exigirAdmin, exigirCsrf, (req, res) => {
  req.session.destroy(() => res.status(204).end());
});

app.post("/api/voluntarios", exigirAdmin, exigirCsrf, upload.single("foto"), (req, res) => {
  const nome = limparTexto(req.body.nome, 100);
  const funcao = limparTexto(req.body.funcao, 80);
  const descricao = limparTexto(req.body.descricao, 260);
  const posicaoX = Number(req.body.posicaoX ?? 50);
  const posicaoY = Number(req.body.posicaoY ?? 50);

  if (!nome || !funcao || !descricao) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ erro: "Preencha nome, função e descrição." });
  }

  const voluntarios = lerVoluntarios();
  const novo = {
      id: crypto.randomUUID(),
      nome,
      funcao,
      descricao,
      foto: req.file ? `/uploads/${req.file.filename}` : "",
      posicaoX,
      posicaoY
  };
  voluntarios.push(novo);
  salvarVoluntarios(voluntarios);
  res.status(201).json(novo);
});

app.put("/api/voluntarios/:id", exigirAdmin, exigirCsrf, upload.single("foto"), (req, res) => {
  const voluntarios = lerVoluntarios();
  const indice = voluntarios.findIndex((item) => item.id === req.params.id);
  if (indice < 0) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(404).json({ erro: "Voluntário não encontrado." });
  }

  const nome = limparTexto(req.body.nome, 100);
  const funcao = limparTexto(req.body.funcao, 80);
  const descricao = limparTexto(req.body.descricao, 260);
  const posicaoX = Math.min(
  100,
  Math.max(0, Number(req.body.posicaoX ?? 50))
  );
  const posicaoY = Math.min(
    100,
    Math.max(0, Number(req.body.posicaoY ?? 50))
  );

  if (!nome || !funcao || !descricao) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ erro: "Preencha nome, função e descrição." });
  }

  const anterior = voluntarios[indice];
  const atualizado = {
    ...anterior,
    nome,
    funcao,
    descricao,
    foto: req.file ? `/uploads/${req.file.filename}` : anterior.foto,
    posicaoX,
    posicaoY
  };

  if (req.file) removerUpload(anterior.foto);
  voluntarios[indice] = atualizado;
  salvarVoluntarios(voluntarios);
  res.json(atualizado);
});

app.delete("/api/voluntarios/:id", exigirAdmin, exigirCsrf, (req, res) => {
  const voluntarios = lerVoluntarios();
  const indice = voluntarios.findIndex((item) => item.id === req.params.id);
  if (indice < 0) return res.status(404).json({ erro: "Voluntário não encontrado." });

  const [removido] = voluntarios.splice(indice, 1);
  salvarVoluntarios(voluntarios);
  removerUpload(removido.foto);
  res.status(204).end();
});

app.use("/uploads", express.static(UPLOAD_DIR, { fallthrough: false, maxAge: "1h" }));
app.use(express.static(PUBLIC_DIR, { extensions: ["html"] }));

app.get("/", (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "index.html")));

app.use((erro, _req, res, _next) => {
  console.error(erro);
  if (erro instanceof multer.MulterError && erro.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ erro: "A imagem deve ter no máximo 3 MB." });
  }
  res.status(400).json({ erro: erro.message || "Não foi possível concluir a operação." });
});

app.listen(PORT, () => {
  console.log(`\nSite disponível em http://localhost:${PORT}`);
  console.log("Use Ctrl+C para parar o servidor.\n");
});

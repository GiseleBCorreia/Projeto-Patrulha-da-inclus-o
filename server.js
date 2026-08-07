require("dotenv").config();

const crypto = require("node:crypto");
const path = require("node:path");

const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const multer = require("multer");
const { rateLimit } = require("express-rate-limit");
const { createClient } = require("@supabase/supabase-js");

const { validarCodigo } = require("./lib/totp");


// =========================================================
// CONFIGURAÇÕES PRINCIPAIS
// =========================================================

const app = express();

app.set("trust proxy", 1);

const PORT = Number(process.env.PORT || 3000);

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");


// =========================================================
// VERIFICAÇÃO DAS VARIÁVEIS DE AMBIENTE
// =========================================================

if (
  !process.env.TOTP_SECRET ||
  !process.env.SESSION_SECRET ||
  !process.env.SUPABASE_URL ||
  !process.env.SUPABASE_SECRET_KEY
) {
  console.error("\nConfiguração de ambiente ausente.\n");
  process.exit(1);
}


// =========================================================
// SUPABASE
// =========================================================

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

const BUCKET_VOLUNTARIOS = "voluntarios";


// =========================================================
// SEGURANÇA
// =========================================================

app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        scriptSrc: [
          "'self'"
        ],

        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com"
        ],

        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com"
        ],

        // IMPORTANTE:
        // permite que as fotos armazenadas no Supabase apareçam.
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          process.env.SUPABASE_URL
        ],

        connectSrc: [
          "'self'"
        ],

        objectSrc: [
          "'none'"
        ],

        baseUri: [
          "'self'"
        ],

        formAction: [
          "'self'"
        ]
      }
    },

    crossOriginResourcePolicy: {
      policy: "cross-origin"
    }
  })
);


// =========================================================
// BODY
// =========================================================

app.use(
  express.json({
    limit: "50kb"
  })
);

app.use(
  express.urlencoded({
    extended: false,
    limit: "50kb"
  })
);


// =========================================================
// SESSÃO DA ADMINISTRADORA
// =========================================================

app.use(
  session({
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
  })
);


// =========================================================
// LIMITADOR DE TENTATIVAS DE LOGIN
// =========================================================

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,

  limit: 10,

  standardHeaders: "draft-8",

  legacyHeaders: false,

  message: {
    erro: "Muitas tentativas. Aguarde alguns minutos e tente novamente."
  }
});


// =========================================================
// UPLOAD DE IMAGENS
// =========================================================
//
// Antes a imagem era salva em:
// /uploads
//
// Agora ela permanece somente na memória temporariamente
// e depois é enviada para o Supabase Storage.
// =========================================================

const storage = multer.memoryStorage();

const upload = multer({
  storage,

  limits: {
    fileSize: 3 * 1024 * 1024,
    files: 1
  },

  fileFilter: (_req, file, callback) => {
    const tiposPermitidos = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    const permitido = tiposPermitidos.includes(file.mimetype);

    callback(
      permitido
        ? null
        : new Error("Use uma imagem JPG, PNG ou WebP."),

      permitido
    );
  }
});


// =========================================================
// FUNÇÕES AUXILIARES
// =========================================================

function limparTexto(valor, maximo) {
  return String(valor || "")
    .trim()
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .slice(0, maximo);
}


function limitarPosicao(valor) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return 50;
  }

  return Math.min(
    100,
    Math.max(0, numero)
  );
}


// =========================================================
// CONVERTE O FORMATO DO SUPABASE PARA O FORMATO
// QUE O FRONT-END JÁ UTILIZA
// =========================================================

function formatarVoluntario(item) {
  return {
    id: item.id,

    nome: item.nome,

    funcao: item.funcao,

    descricao: item.descricao,

    foto: item.foto || "",

    posicaoX: Number(item.posicao_x ?? 50),

    posicaoY: Number(item.posicao_y ?? 50)
  };
}


// =========================================================
// ENVIA UMA FOTO PARA O SUPABASE STORAGE
// =========================================================

async function enviarFotoParaSupabase(file) {
  if (!file) {
    return null;
  }

  const extensoes = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
  };

  const extensao = extensoes[file.mimetype];

  if (!extensao) {
    throw new Error("Formato de imagem não permitido.");
  }

  const nomeArquivo =
    `${Date.now()}-${crypto.randomUUID()}.${extensao}`;

  const { error } = await supabase.storage
    .from(BUCKET_VOLUNTARIOS)
    .upload(
      nomeArquivo,
      file.buffer,
      {
        contentType: file.mimetype,
        cacheControl: "3600",
        upsert: false
      }
    );

  if (error) {
    throw error;
  }


  // Como o bucket voluntarios é público,
  // podemos obter uma URL pública permanente.
  const { data } = supabase.storage
    .from(BUCKET_VOLUNTARIOS)
    .getPublicUrl(nomeArquivo);

  return {
    url: data.publicUrl,
    path: nomeArquivo
  };
}


// =========================================================
// REMOVE UMA FOTO DO SUPABASE STORAGE
// =========================================================

async function removerFotoDoSupabase(caminho) {
  if (!caminho) {
    return;
  }

  const { error } = await supabase.storage
    .from(BUCKET_VOLUNTARIOS)
    .remove([caminho]);

  if (error) {
    console.error(
      "Erro ao remover imagem do Supabase:",
      error
    );
  }
}


// =========================================================
// PROTEÇÃO DAS ROTAS ADMINISTRATIVAS
// =========================================================

function exigirAdmin(req, res, next) {
  if (!req.session.admin) {
    return res.status(401).json({
      erro: "Autorização da coordenadora necessária."
    });
  }

  next();
}


function exigirCsrf(req, res, next) {
  const token = req.get("x-csrf-token");

  const salvo = req.session.csrfToken;

  if (
    !token ||
    !salvo ||
    token.length !== salvo.length
  ) {
    return res.status(403).json({
      erro: "Sessão inválida. Autorize novamente."
    });
  }

  const valido = crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(salvo)
  );

  if (!valido) {
    return res.status(403).json({
      erro: "Sessão inválida. Autorize novamente."
    });
  }

  next();
}


// =========================================================
// GET — LISTAR VOLUNTÁRIOS
// =========================================================

app.get(
  "/api/voluntarios",

  async (_req, res) => {
    try {

      const { data, error } = await supabase
        .from("voluntarios")
        .select("*")
        .order(
          "criado_em",
          {
            ascending: true
          }
        );

      if (error) {
        throw error;
      }

      const voluntarios = (data || []).map(
        formatarVoluntario
      );

      return res.json(voluntarios);

    } catch (erro) {

      console.error(
        "Erro ao carregar voluntários:",
        erro
      );

      return res.status(500).json({
        erro: "Não foi possível carregar os voluntários."
      });
    }
  }
);


// =========================================================
// STATUS DO ADMIN
// =========================================================

app.get(
  "/api/admin/status",

  (req, res) => {

    res.json({
      autenticado: Boolean(req.session.admin),

      csrfToken:
        req.session.admin
          ? req.session.csrfToken
          : null
    });

  }
);


// =========================================================
// LOGIN COM GOOGLE AUTHENTICATOR / TOTP
// =========================================================

app.post(
  "/api/admin/verificar",

  loginLimiter,

  (req, res) => {

    const codigo =
      String(req.body.codigo || "");

    if (
      !validarCodigo(
        process.env.TOTP_SECRET,
        codigo
      )
    ) {

      return res.status(401).json({
        erro: "Código inválido ou expirado."
      });

    }


    req.session.regenerate(
      (erro) => {

        if (erro) {

          console.error(
            "Erro ao regenerar sessão:",
            erro
          );

          return res.status(500).json({
            erro: "Não foi possível iniciar a sessão."
          });

        }


        req.session.admin = true;

        req.session.csrfToken =
          crypto
            .randomBytes(32)
            .toString("hex");


        const csrfToken =
          req.session.csrfToken;


        req.session.save(
          (erroSalvar) => {

            if (erroSalvar) {

              console.error(
                "Erro ao salvar sessão:",
                erroSalvar
              );

              return res.status(500).json({
                erro: "Não foi possível salvar a sessão."
              });

            }


            return res.json({
              autenticado: true,

              csrfToken,

              expiraEmMinutos: 15
            });

          }
        );

      }
    );

  }
);


// =========================================================
// LOGOUT
// =========================================================

app.post(
  "/api/admin/sair",

  exigirAdmin,

  exigirCsrf,

  (req, res) => {

    req.session.destroy(
      () => res.status(204).end()
    );

  }
);


// =========================================================
// POST — CADASTRAR VOLUNTÁRIO
// =========================================================

app.post(
  "/api/voluntarios",

  exigirAdmin,

  exigirCsrf,

  upload.single("foto"),

  async (req, res) => {

    let fotoNova = null;

    try {

      const nome =
        limparTexto(
          req.body.nome,
          100
        );

      const funcao =
        limparTexto(
          req.body.funcao,
          80
        );

      const descricao =
        limparTexto(
          req.body.descricao,
          260
        );

      const posicaoX =
        limitarPosicao(
          req.body.posicaoX ?? 50
        );

      const posicaoY =
        limitarPosicao(
          req.body.posicaoY ?? 50
        );


      if (
        !nome ||
        !funcao ||
        !descricao
      ) {

        return res.status(400).json({
          erro: "Preencha nome, função e descrição."
        });

      }


      // Envia a foto para o Supabase Storage.
      if (req.file) {

        fotoNova =
          await enviarFotoParaSupabase(
            req.file
          );

      }


      const id =
        crypto.randomUUID();


      const { data, error } =
        await supabase
          .from("voluntarios")
          .insert({
            id,

            nome,

            funcao,

            descricao,

            foto:
              fotoNova
                ? fotoNova.url
                : "",

            foto_path:
              fotoNova
                ? fotoNova.path
                : "",

            posicao_x: posicaoX,

            posicao_y: posicaoY
          })
          .select()
          .single();


      if (error) {
        throw error;
      }


      return res
        .status(201)
        .json(
          formatarVoluntario(data)
        );

    } catch (erro) {

      console.error(
        "Erro ao cadastrar voluntário:",
        erro
      );


      // Se a foto conseguiu subir,
      // mas o banco falhou,
      // removemos a foto para não deixar
      // arquivo abandonado no Storage.
      if (fotoNova?.path) {

        await removerFotoDoSupabase(
          fotoNova.path
        );

      }


      return res.status(500).json({
        erro: "Não foi possível cadastrar o voluntário."
      });

    }
  }
);


// =========================================================
// PUT — EDITAR VOLUNTÁRIO
// =========================================================

app.put(
  "/api/voluntarios/:id",

  exigirAdmin,

  exigirCsrf,

  upload.single("foto"),

  async (req, res) => {

    let fotoNova = null;

    try {

      // Primeiro buscamos o voluntário atual.
      const {
        data: anterior,
        error: erroBusca
      } = await supabase
        .from("voluntarios")
        .select("*")
        .eq(
          "id",
          req.params.id
        )
        .maybeSingle();


      if (erroBusca) {
        throw erroBusca;
      }


      if (!anterior) {

        return res.status(404).json({
          erro: "Voluntário não encontrado."
        });

      }


      const nome =
        limparTexto(
          req.body.nome,
          100
        );

      const funcao =
        limparTexto(
          req.body.funcao,
          80
        );

      const descricao =
        limparTexto(
          req.body.descricao,
          260
        );

      const posicaoX =
        limitarPosicao(
          req.body.posicaoX ?? 50
        );

      const posicaoY =
        limitarPosicao(
          req.body.posicaoY ?? 50
        );


      if (
        !nome ||
        !funcao ||
        !descricao
      ) {

        return res.status(400).json({
          erro: "Preencha nome, função e descrição."
        });

      }


      // Caso a administradora envie uma foto nova.
      if (req.file) {

        fotoNova =
          await enviarFotoParaSupabase(
            req.file
          );

      }


      const fotoFinal =
        fotoNova
          ? fotoNova.url
          : anterior.foto;


      const fotoPathFinal =
        fotoNova
          ? fotoNova.path
          : anterior.foto_path;


      const {
        data,
        error
      } = await supabase
        .from("voluntarios")
        .update({
          nome,

          funcao,

          descricao,

          foto: fotoFinal,

          foto_path: fotoPathFinal,

          posicao_x: posicaoX,

          posicao_y: posicaoY
        })
        .eq(
          "id",
          req.params.id
        )
        .select()
        .single();


      if (error) {
        throw error;
      }


      // Só removemos a foto antiga
      // DEPOIS que a atualização do banco
      // foi concluída corretamente.
      if (
        fotoNova &&
        anterior.foto_path &&
        anterior.foto_path !== fotoNova.path
      ) {

        await removerFotoDoSupabase(
          anterior.foto_path
        );

      }


      return res.json(
        formatarVoluntario(data)
      );

    } catch (erro) {

      console.error(
        "Erro ao editar voluntário:",
        erro
      );


      // Se a foto nova subiu,
      // mas a atualização do banco falhou,
      // removemos a nova imagem.
      if (fotoNova?.path) {

        await removerFotoDoSupabase(
          fotoNova.path
        );

      }


      return res.status(500).json({
        erro: "Não foi possível editar o voluntário."
      });

    }
  }
);


// =========================================================
// DELETE — EXCLUIR VOLUNTÁRIO
// =========================================================

app.delete(
  "/api/voluntarios/:id",

  exigirAdmin,

  exigirCsrf,

  async (req, res) => {

    try {

      // Primeiro buscamos o registro
      // para saber qual foto remover.
      const {
        data: voluntario,
        error: erroBusca
      } = await supabase
        .from("voluntarios")
        .select("*")
        .eq(
          "id",
          req.params.id
        )
        .maybeSingle();


      if (erroBusca) {
        throw erroBusca;
      }


      if (!voluntario) {

        return res.status(404).json({
          erro: "Voluntário não encontrado."
        });

      }


      // Primeiro remove o registro do banco.
      const { error } =
        await supabase
          .from("voluntarios")
          .delete()
          .eq(
            "id",
            req.params.id
          );


      if (error) {
        throw error;
      }


      // Depois remove a foto.
      if (voluntario.foto_path) {

        await removerFotoDoSupabase(
          voluntario.foto_path
        );

      }


      return res
        .status(204)
        .end();

    } catch (erro) {

      console.error(
        "Erro ao excluir voluntário:",
        erro
      );

      return res.status(500).json({
        erro: "Não foi possível excluir o voluntário."
      });

    }
  }
);


// =========================================================
// ARQUIVOS DO SITE
// =========================================================

app.use(
  express.static(
    PUBLIC_DIR,
    {
      extensions: ["html"]
    }
  )
);


// =========================================================
// HOME
// =========================================================

app.get(
  "/",

  (_req, res) => {

    res.sendFile(
      path.join(
        PUBLIC_DIR,
        "index.html"
      )
    );

  }
);


// =========================================================
// TRATAMENTO DE ERROS
// =========================================================

app.use(
  (
    erro,
    _req,
    res,
    _next
  ) => {

    console.error(erro);


    if (
      erro instanceof multer.MulterError &&
      erro.code === "LIMIT_FILE_SIZE"
    ) {

      return res.status(400).json({
        erro: "A imagem deve ter no máximo 3 MB."
      });

    }


    return res.status(400).json({
      erro:
        erro.message ||
        "Não foi possível concluir a operação."
    });

  }
);


// =========================================================
// INICIA O SERVIDOR
// =========================================================

app.listen(
  PORT,

  () => {

    console.log(
      `\nSite disponível em http://localhost:${PORT}`
    );

    console.log(
      "Use Ctrl+C para parar o servidor.\n"
    );

  }
);
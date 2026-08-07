const lista = document.querySelector("#listaVoluntarios");
const modal = document.querySelector("#modalVoluntario");
const form = document.querySelector("#formVoluntario");
const tituloModal = document.querySelector("#tituloModal");
const campoId = document.querySelector("#voluntarioId");
const campoNome = document.querySelector("#nome");
const campoFuncao = document.querySelector("#funcao");
const campoDescricao = document.querySelector("#descricao");
const campoFoto = document.querySelector("#foto");
const previewFoto = document.querySelector("#previewFoto");
const posicaoXInput = document.querySelector("#posicaoX");
const posicaoYInput = document.querySelector("#posicaoY");
const previewImagem = document.querySelector("#previewImagem");

const modalAuth = document.querySelector("#modalAuthenticator");
const formAuth = document.querySelector("#formAuthenticator");
const campoCodigo = document.querySelector("#codigoAuthenticator");
const mensagemAuth = document.querySelector("#mensagemAuthenticator");

const botaoSairAdmin = document.querySelector("#sairAdmin");
const statusAdmin = document.querySelector("#statusAdmin");

const botaoMenu = document.querySelector(".menu-toggle");
const menu = document.querySelector(".menu");

let voluntarios = [];
let autenticado = false;
let csrfToken = "";
let acaoDepoisDaAutorizacao = null;

function escaparHTML(texto) {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function obterIniciais(nome) {
  return String(nome)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() || "")
    .join("");
}

function atualizarPosicaoFoto() {
  const posicaoX = posicaoXInput.value;
  const posicaoY = posicaoYInput.value;

  previewImagem.style.objectPosition =
    `${posicaoX}% ${posicaoY}%`;
}

posicaoXInput.addEventListener("input", atualizarPosicaoFoto);
posicaoYInput.addEventListener("input", atualizarPosicaoFoto);

async function requisicao(url, opcoes = {}) {
  const resposta = await fetch(url, {
    credentials: "same-origin",
    ...opcoes
  });

  let dados = null;

  if (resposta.status !== 204) {
    try {
      dados = await resposta.json();
    } catch {
      dados = null;
    }
  }

  if (!resposta.ok) {
    const erro = new Error(
      dados?.erro || "Não foi possível concluir a operação."
    );

    erro.status = resposta.status;
    throw erro;
  }

  return dados;
}

function atualizarInterfaceAdmin() {
  document.body.classList.toggle("admin-autenticado", autenticado);

  if (botaoSairAdmin) {
    botaoSairAdmin.hidden = !autenticado;
  }

  if (statusAdmin) {
    statusAdmin.textContent = autenticado
      ? "Modo administrador ativo."
      : "";
  }

  renderizarVoluntarios();
}

async function carregarStatus() {
  const status = await requisicao("/api/admin/status");

  autenticado = Boolean(status.autenticado);
  csrfToken = status.csrfToken || "";

  atualizarInterfaceAdmin();
}

async function carregarVoluntarios() {
  voluntarios = await requisicao("/api/voluntarios");
  renderizarVoluntarios();
}

function renderizarVoluntarios() {
  if (!lista) {
    return;
  }

  if (!voluntarios.length) {
    lista.innerHTML = `
      <div class="estado-vazio">
        <h3>Nenhum voluntário cadastrado</h3>
        <p>A coordenadora pode usar “Novo voluntário” para adicionar a primeira pessoa.</p>
      </div>
    `;
    return;
  }

  lista.innerHTML = voluntarios
    .map((voluntario) => {
      const foto = voluntario.foto
        ? `
        <img
          src="${voluntario.foto}"
          alt="${escaparHTML(voluntario.nome)}"
          style="object-position: ${voluntario.posicaoX ?? 50}% ${voluntario.posicaoY ?? 50}%"
        >
        `
        : `
          <div class="card-voluntario-placeholder" aria-hidden="true">
            ${escaparHTML(obterIniciais(voluntario.nome))}
          </div>
        `;

      const acoes = autenticado
        ? `
          <div class="card-voluntario-acoes">
            <button
              class="btn-card btn-editar"
              type="button"
              data-editar="${escaparHTML(voluntario.id)}"
            >
              Editar
            </button>

            <button
              class="btn-card btn-excluir"
              type="button"
              data-excluir="${escaparHTML(voluntario.id)}"
            >
              Excluir
            </button>
          </div>
        `
        : "";

      return `
        <article class="card-voluntario">
          <div class="card-voluntario-foto">
            ${foto}
          </div>

          <h3>${escaparHTML(voluntario.nome)}</h3>

          <span class="funcao">
            ${escaparHTML(voluntario.funcao)}
          </span>

          <p class="descricao">
            ${escaparHTML(voluntario.descricao)}
          </p>

          ${acoes}
        </article>
      `;
    })
    .join("");
}

function abrirAuth(acao) {
  acaoDepoisDaAutorizacao = acao;

  formAuth.reset();
  mensagemAuth.textContent = "";

  modalAuth.classList.add("aberto");
  document.body.style.overflow = "hidden";

  setTimeout(() => campoCodigo.focus(), 50);
}

function fecharAuth() {
  modalAuth.classList.remove("aberto");
  document.body.style.overflow = "";
  acaoDepoisDaAutorizacao = null;
}

async function exigirAutorizacao(acao) {
  try {
    await carregarStatus();

    if (autenticado && csrfToken) {
      return acao();
    }

    abrirAuth(acao);
  } catch {
    autenticado = false;
    csrfToken = "";
    atualizarInterfaceAdmin();
    abrirAuth(acao);
  }
}

function abrirModal(voluntario = null) {
  form.reset();

  campoId.value = "";
  previewFoto.classList.remove("visivel");
  previewImagem.removeAttribute("src");

  if (voluntario) {
    tituloModal.textContent = "Editar voluntário";
    campoId.value = voluntario.id;
    campoNome.value = voluntario.nome;
    campoFuncao.value = voluntario.funcao;
    campoDescricao.value = voluntario.descricao;

    if (voluntario.foto) {
      previewImagem.src = voluntario.foto;
      previewFoto.classList.add("visivel");
    }
  } else {
    tituloModal.textContent = "Cadastrar voluntário";
  }

  modal.classList.add("aberto");
  document.body.style.overflow = "hidden";

  setTimeout(() => campoNome.focus(), 50);
}

function fecharModal() {
  modal.classList.remove("aberto");
  document.body.style.overflow = "";
}

function encerrarSessaoLocal() {
  autenticado = false;
  csrfToken = "";
  atualizarInterfaceAdmin();
}

document
  .querySelector("#abrirCadastro")
  ?.addEventListener("click", () => {
    exigirAutorizacao(() => abrirModal());
  });

document
  .querySelector("#fecharModal")
  ?.addEventListener("click", fecharModal);

document
  .querySelector("#cancelarCadastro")
  ?.addEventListener("click", fecharModal);

document
  .querySelector("#fecharAuthenticator")
  ?.addEventListener("click", fecharAuth);

document
  .querySelector("#cancelarAuthenticator")
  ?.addEventListener("click", fecharAuth);

modal?.addEventListener("click", (evento) => {
  if (evento.target === modal) {
    fecharModal();
  }
});

modalAuth?.addEventListener("click", (evento) => {
  if (evento.target === modalAuth) {
    fecharAuth();
  }
});

document.addEventListener("keydown", (evento) => {
  if (evento.key !== "Escape") {
    return;
  }

  if (modal?.classList.contains("aberto")) {
    fecharModal();
  }

  if (modalAuth?.classList.contains("aberto")) {
    fecharAuth();
  }
});

campoFoto?.addEventListener("change", () => {
  const arquivo = campoFoto.files[0];

  if (!arquivo) {
    return;
  }

  const tiposPermitidos = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (!tiposPermitidos.includes(arquivo.type)) {
    alert("Selecione uma imagem JPG, PNG ou WebP.");
    campoFoto.value = "";
    return;
  }

  if (arquivo.size > 3 * 1024 * 1024) {
    alert("A imagem deve ter no máximo 3 MB.");
    campoFoto.value = "";
    return;
  }

  const urlTemporaria = URL.createObjectURL(arquivo);

  previewImagem.src = urlTemporaria;
  previewFoto.classList.add("visivel");

  previewImagem.onload = () => {
    URL.revokeObjectURL(urlTemporaria);
  };
});

formAuth?.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  mensagemAuth.textContent = "Verificando...";

  try {
    const resultado = await requisicao("/api/admin/verificar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        codigo: campoCodigo.value.trim()
      })
    });

    autenticado = true;
    csrfToken = resultado.csrfToken || "";

    if (!csrfToken) {
      throw new Error("O servidor não enviou o token da sessão.");
    }

    const acao = acaoDepoisDaAutorizacao;

    fecharAuth();
    atualizarInterfaceAdmin();

    if (acao) {
      acao();
    }
  } catch (erro) {
    autenticado = false;
    csrfToken = "";
    atualizarInterfaceAdmin();

    mensagemAuth.textContent = erro.message;
    campoCodigo.select();
  }
});

form?.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const id = campoId.value.trim();
  const dados = new FormData();

  dados.append("nome", campoNome.value.trim());
  dados.append("funcao", campoFuncao.value.trim());
  dados.append("descricao", campoDescricao.value.trim());
  dados.append("posicaoX", posicaoXInput.value);
  dados.append("posicaoY", posicaoYInput.value);

  if (campoFoto.files[0]) {
    dados.append("foto", campoFoto.files[0]);
  }

  try {
    await carregarStatus();

    if (!autenticado || !csrfToken) {
      fecharModal();
      encerrarSessaoLocal();
      alert("Sua autorização expirou. Digite o código novamente.");
      return;
    }

    await requisicao(
      id
        ? `/api/voluntarios/${encodeURIComponent(id)}`
        : "/api/voluntarios",
      {
        method: id ? "PUT" : "POST",
        headers: {
          "x-csrf-token": csrfToken
        },
        body: dados
      }
    );

    await carregarVoluntarios();
    fecharModal();
  } catch (erro) {
    if (erro.status === 401 || erro.status === 403) {
      fecharModal();
      encerrarSessaoLocal();
      alert("Sua autorização expirou. Digite o código novamente.");
      return;
    }

    alert(erro.message);
  }
});

lista?.addEventListener("click", (evento) => {
  const botaoEditar = evento.target.closest("[data-editar]");
  const botaoExcluir = evento.target.closest("[data-excluir]");

  if (botaoEditar) {
    const voluntario = voluntarios.find(
      (item) => item.id === botaoEditar.dataset.editar
    );

    if (voluntario) {
      exigirAutorizacao(() => abrirModal(voluntario));
    }

    return;
  }

  if (botaoExcluir) {
    const voluntario = voluntarios.find(
      (item) => item.id === botaoExcluir.dataset.excluir
    );

    if (!voluntario) {
      return;
    }

    const confirmou = confirm(
      `Deseja excluir ${voluntario.nome}?`
    );

    if (!confirmou) {
      return;
    }

    exigirAutorizacao(async () => {
      try {
        await carregarStatus();

        if (!autenticado || !csrfToken) {
          encerrarSessaoLocal();
          alert("Sua autorização expirou. Digite o código novamente.");
          return;
        }

        await requisicao(
          `/api/voluntarios/${encodeURIComponent(voluntario.id)}`,
          {
            method: "DELETE",
            headers: {
              "x-csrf-token": csrfToken
            }
          }
        );

        await carregarVoluntarios();
      } catch (erro) {
        if (erro.status === 401 || erro.status === 403) {
          encerrarSessaoLocal();
        }

        alert(erro.message);
      }
    });
  }
});

botaoSairAdmin?.addEventListener("click", async () => {
  const confirmou = confirm("Deseja encerrar o modo administrador?");

  if (!confirmou) {
    return;
  }

  try {
    await carregarStatus();

    if (autenticado && csrfToken) {
      await requisicao("/api/admin/sair", {
        method: "POST",
        headers: {
          "x-csrf-token": csrfToken
        }
      });
    }
  } catch (erro) {
    if (erro.status !== 401 && erro.status !== 403) {
      alert(erro.message);
      return;
    }
  }

  fecharModal();
  fecharAuth();
  encerrarSessaoLocal();
});

async function iniciar() {
  try {
    await carregarStatus();
    await carregarVoluntarios();
  } catch (erro) {
    encerrarSessaoLocal();

    if (lista) {
      lista.innerHTML = `
        <div class="estado-vazio">
          <h3>Não foi possível carregar</h3>
          <p>${escaparHTML(erro.message)}</p>
        </div>
      `;
    }
  }
}

iniciar();

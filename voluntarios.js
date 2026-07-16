const CHAVE_STORAGE = "patrulha_voluntarios";

const voluntariosIniciais = [
  {
    id: crypto.randomUUID(),
    nome: "Camila Santiago",
    funcao: "Coordenadora de projetos",
    descricao: "Responsável pela coordenação geral das ações e projetos da Patrulha da Inclusão.",
    foto: ""
  },
  {
    id: crypto.randomUUID(),
    nome: "Aline Ferreira",
    funcao: "Assistente social",
    descricao: "Acompanha famílias e conecta recursos para fortalecer nossa comunidade.",
    foto: ""
  },
  {
    id: crypto.randomUUID(),
    nome: "Gisele Correia",
    funcao: "Comunicação",
    descricao: "Cuida da comunicação e das redes sociais, compartilhando nossas ações e histórias.",
    foto: ""
  },
  {
    id: crypto.randomUUID(),
    nome: "Voluntário da equipe",
    funcao: "Apoio voluntário",
    descricao: "Apoia as atividades do dia a dia e participa das ações da organização.",
    foto: ""
  }
];

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
const previewImagem = document.querySelector("#previewImagem");

let fotoAtual = "";

function carregarVoluntarios() {
  const salvo = localStorage.getItem(CHAVE_STORAGE);

  if (!salvo) {
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(voluntariosIniciais));
    return voluntariosIniciais;
  }

  try {
    return JSON.parse(salvo);
  } catch {
    return voluntariosIniciais;
  }
}

function salvarVoluntarios(voluntarios) {
  localStorage.setItem(CHAVE_STORAGE, JSON.stringify(voluntarios));
}

function escaparHTML(texto) {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function obterIniciais(nome) {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(parte => parte[0]?.toUpperCase() || "")
    .join("");
}

function renderizarVoluntarios() {
  const voluntarios = carregarVoluntarios();

  if (!voluntarios.length) {
    lista.innerHTML = `
      <div class="estado-vazio">
        <h3>Nenhum voluntário cadastrado</h3>
        <p>Clique em “Novo voluntário” para adicionar a primeira pessoa da equipe.</p>
      </div>
    `;
    return;
  }

  lista.innerHTML = voluntarios.map(voluntario => {
    const foto = voluntario.foto
      ? `<img src="${voluntario.foto}" alt="Foto de ${escaparHTML(voluntario.nome)}">`
      : `<div class="card-voluntario-placeholder" aria-hidden="true">${escaparHTML(obterIniciais(voluntario.nome))}</div>`;

    return `
      <article class="card-voluntario">
        <div class="card-voluntario-foto">${foto}</div>

        <h3>${escaparHTML(voluntario.nome)}</h3>
        <span class="funcao">${escaparHTML(voluntario.funcao)}</span>
        <p class="descricao">${escaparHTML(voluntario.descricao)}</p>

        <div class="card-voluntario-acoes">
          <button class="btn-card btn-editar" type="button" data-editar="${voluntario.id}">
            Editar
          </button>

          <button class="btn-card btn-excluir" type="button" data-excluir="${voluntario.id}">
            Excluir
          </button>
        </div>
      </article>
    `;
  }).join("");
}

function abrirModal(voluntario = null) {
  form.reset();
  campoId.value = "";
  fotoAtual = "";
  previewFoto.classList.remove("visivel");
  previewImagem.removeAttribute("src");

  if (voluntario) {
    tituloModal.textContent = "Editar voluntário";
    campoId.value = voluntario.id;
    campoNome.value = voluntario.nome;
    campoFuncao.value = voluntario.funcao;
    campoDescricao.value = voluntario.descricao;
    fotoAtual = voluntario.foto || "";

    if (fotoAtual) {
      previewImagem.src = fotoAtual;
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

function lerFoto(arquivo) {
  return new Promise((resolve, reject) => {
    if (!arquivo) {
      resolve(fotoAtual);
      return;
    }

    if (!arquivo.type.startsWith("image/")) {
      reject(new Error("Selecione um arquivo de imagem."));
      return;
    }

    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result);
    leitor.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
    leitor.readAsDataURL(arquivo);
  });
}

document.querySelector("#abrirCadastro").addEventListener("click", () => abrirModal());
document.querySelector("#fecharModal").addEventListener("click", fecharModal);
document.querySelector("#cancelarCadastro").addEventListener("click", fecharModal);

modal.addEventListener("click", evento => {
  if (evento.target === modal) fecharModal();
});

document.addEventListener("keydown", evento => {
  if (evento.key === "Escape" && modal.classList.contains("aberto")) {
    fecharModal();
  }
});

campoFoto.addEventListener("change", async () => {
  const arquivo = campoFoto.files[0];
  if (!arquivo) return;

  try {
    fotoAtual = await lerFoto(arquivo);
    previewImagem.src = fotoAtual;
    previewFoto.classList.add("visivel");
  } catch (erro) {
    alert(erro.message);
    campoFoto.value = "";
  }
});

form.addEventListener("submit", async evento => {
  evento.preventDefault();

  try {
    const foto = await lerFoto(campoFoto.files[0]);
    const voluntarios = carregarVoluntarios();
    const id = campoId.value;

    const dados = {
      id: id || crypto.randomUUID(),
      nome: campoNome.value.trim(),
      funcao: campoFuncao.value.trim(),
      descricao: campoDescricao.value.trim(),
      foto
    };

    if (!dados.nome || !dados.funcao || !dados.descricao) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    if (id) {
      const indice = voluntarios.findIndex(item => item.id === id);
      if (indice !== -1) voluntarios[indice] = dados;
    } else {
      voluntarios.push(dados);
    }

    salvarVoluntarios(voluntarios);
    renderizarVoluntarios();
    fecharModal();
  } catch (erro) {
    alert(erro.message);
  }
});

lista.addEventListener("click", evento => {
  const botaoEditar = evento.target.closest("[data-editar]");
  const botaoExcluir = evento.target.closest("[data-excluir]");
  const voluntarios = carregarVoluntarios();

  if (botaoEditar) {
    const voluntario = voluntarios.find(item => item.id === botaoEditar.dataset.editar);
    if (voluntario) abrirModal(voluntario);
  }

  if (botaoExcluir) {
    const id = botaoExcluir.dataset.excluir;
    const voluntario = voluntarios.find(item => item.id === id);

    if (!voluntario) return;

    const confirmou = confirm(`Deseja excluir ${voluntario.nome}?`);
    if (!confirmou) return;

    salvarVoluntarios(voluntarios.filter(item => item.id !== id));
    renderizarVoluntarios();
  }
});

const botaoMenu = document.querySelector(".menu-toggle");
const menu = document.querySelector(".menu");

botaoMenu.addEventListener("click", () => {
  const aberto = menu.classList.toggle("aberto");
  botaoMenu.setAttribute("aria-expanded", String(aberto));
});

renderizarVoluntarios();

"use strict";

/*
  SUBSTITUA OS DADOS ABAIXO PELOS DADOS REAIS DA ONG.
*/
const dadosPix = {
  chave: "patrulhadainclusaooficial@gmail.com",
  favorecido: "Camila Santiago Bento de Mesquita",
  tipoChave: "E-MAIL",
  banco: "NuBank",
  whatsapp: "+5522992427133"
};

const chavePix = document.getElementById("chavePix");
const favorecido = document.getElementById("favorecido");
const tipoChave = document.getElementById("tipoChave");
const banco = document.getElementById("banco");
const btnCopiar = document.getElementById("btnCopiar");
const mensagemCopia = document.getElementById("mensagemCopia");
const btnWhatsapp = document.getElementById("btnWhatsapp");
const imagemQr = document.getElementById("imagemQr");
const qrPlaceholder = document.getElementById("qrPlaceholder");

chavePix.textContent = dadosPix.chave;
favorecido.textContent = dadosPix.favorecido;
tipoChave.textContent = dadosPix.tipoChave;
banco.textContent = dadosPix.banco;

const textoWhatsapp =
  "Olá! Acabei de fazer uma doação para a Patrulha da Inclusão.";

btnWhatsapp.href =
  `https://wa.me/${dadosPix.whatsapp}?text=${encodeURIComponent(textoWhatsapp)}`;

btnCopiar.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(dadosPix.chave);
    mostrarMensagemCopia();
  } catch (erro) {
    copiarComMetodoAlternativo(dadosPix.chave);
  }
});

function copiarComMetodoAlternativo(texto) {
  const campoTemporario = document.createElement("textarea");

  campoTemporario.value = texto;
  campoTemporario.setAttribute("readonly", "");
  campoTemporario.style.position = "fixed";
  campoTemporario.style.opacity = "0";

  document.body.appendChild(campoTemporario);
  campoTemporario.select();
  document.execCommand("copy");
  campoTemporario.remove();

  mostrarMensagemCopia();
}

function mostrarMensagemCopia() {
  mensagemCopia.classList.add("visivel");
  btnCopiar.textContent = "Copiado!";

  setTimeout(() => {
    mensagemCopia.classList.remove("visivel");
    btnCopiar.textContent = "Copiar chave";
  }, 2500);
}

imagemQr.addEventListener("error", () => {
  imagemQr.style.display = "none";
  qrPlaceholder.style.display = "grid";
});

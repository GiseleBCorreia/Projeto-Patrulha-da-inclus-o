"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const formulario = document.getElementById("formulario-contato");
  const botaoEnviar = formulario.querySelector("button[type='submit']");
  const mensagemFormulario =
    document.getElementById("mensagem-formulario");

  formulario.addEventListener("submit", async (event) => {
    event.preventDefault();

    const textoOriginal = botaoEnviar.textContent;

    botaoEnviar.disabled = true;
    botaoEnviar.textContent = "ENVIANDO...";
    mensagemFormulario.textContent = "";
    mensagemFormulario.className = "";

    const dadosFormulario = new FormData(formulario);

    /*
      O endereço AJAX precisa conter /ajax/ antes do e-mail.
      Quando for usar o e-mail da ONG, troque somente o endereço abaixo.
    */
    const enderecoEnvio =
      "https://formsubmit.co/ajax/patrulhadainclusaooficial@gmail.com";

    try {
      const resposta = await fetch(enderecoEnvio, {
        method: "POST",
        headers: {
          Accept: "application/json"
        },
        body: dadosFormulario
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          resultado.message || "Não foi possível enviar a mensagem."
        );
      }

      mensagemFormulario.textContent =
        "Mensagem enviada com sucesso! Entraremos em contato em breve.";

      mensagemFormulario.className = "mensagem-sucesso";

      formulario.reset();
    } catch (erro) {
      console.error("Erro ao enviar o formulário:", erro);

      mensagemFormulario.textContent =
        "Não foi possível enviar a mensagem. Tente novamente.";

      mensagemFormulario.className = "mensagem-erro";
    } finally {
      botaoEnviar.disabled = false;
      botaoEnviar.textContent = textoOriginal;
    }
  });
});
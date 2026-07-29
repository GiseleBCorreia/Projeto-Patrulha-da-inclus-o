/*UTILIZE APENAS SE PRECISAR RECUPERAR UM QR-CODE!!!!*/

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const QRCode = require("qrcode");
const { criarUriOtp } = require("../lib/totp");

const raiz = path.resolve(__dirname, "..");
const envPath = path.join(raiz, ".env");
const qrPath = path.join(raiz, "qrcode-recuperacao.png");

/*
  Verifica se o arquivo .env existe.
  Não cria nem modifica nenhuma configuração.
*/
if (!fs.existsSync(envPath)) {
  console.error("\nErro: o arquivo .env não foi encontrado.");
  console.error("Não é possível recuperar o QR Code sem o TOTP_SECRET.\n");
  process.exit(1);
}

/*
  Lê o conteúdo do arquivo .env.
*/
const envConteudo = fs.readFileSync(envPath, "utf8");

/*
  Procura especificamente pela linha TOTP_SECRET=...
*/
const linhaTotp = envConteudo
  .split(/\r?\n/)
  .find((linha) => linha.trim().startsWith("TOTP_SECRET="));

if (!linhaTotp) {
  console.error("\nErro: TOTP_SECRET não foi encontrado no arquivo .env.\n");
  process.exit(1);
}

/*
  Obtém somente o valor que está depois do primeiro sinal de igual.
*/
const secret = linhaTotp
  .slice(linhaTotp.indexOf("=") + 1)
  .trim()
  .replace(/^["']|["']$/g, "");

if (!secret) {
  console.error("\nErro: o TOTP_SECRET está vazio.\n");
  process.exit(1);
}

/*
  É importante usar exatamente o mesmo nome da conta e o mesmo emissor
  utilizados na configuração inicial.
*/
const uri = criarUriOtp({
  secret,
  conta: "coordenadora",
  emissor: "Patrulha da Inclusão"
});

/*
  Gera uma nova imagem usando o segredo já existente.
  Nenhuma chave é substituída.
*/
QRCode.toFile(qrPath, uri, {
  width: 420,
  margin: 2
})
  .then(() => {
    console.log("\nQR Code de recuperação gerado com sucesso!");
    console.log(`Imagem criada em: ${qrPath}`);
    console.log("\nEsse QR Code utiliza o TOTP_SECRET já existente.");
    console.log("Ele não alterou o .env nem o acesso atual.");
    console.log("\nApós concluir o teste, apague a imagem do QR Code.\n");
  })
  .catch((erro) => {
    console.error("\nNão foi possível gerar o QR Code:", erro.message);
    process.exit(1);
  });
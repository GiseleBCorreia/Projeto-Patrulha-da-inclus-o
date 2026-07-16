const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const QRCode = require("qrcode");
const { gerarSegredo, criarUriOtp } = require("../lib/totp");

const raiz = path.resolve(__dirname, "..");
const envPath = path.join(raiz, ".env");
const qrPath = path.join(raiz, "setup-auth-qrcode.png");

if (fs.existsSync(envPath)) {
  console.error("\nO arquivo .env já existe. Para evitar substituir seu Authenticator, ele não foi alterado.");
  console.error("Apague o .env somente se realmente quiser configurar um novo celular.\n");
  process.exit(1);
}

const secret = gerarSegredo();
const sessionSecret = crypto.randomBytes(48).toString("hex");
const uri = criarUriOtp({
  secret,
  conta: "coordenadora",
  emissor: "Patrulha da Inclusão"
});

const env = [
  "PORT=3000",
  `TOTP_SECRET=${secret}`,
  `SESSION_SECRET=${sessionSecret}`,
  "NODE_ENV=development",
  ""
].join("\n");

fs.writeFileSync(envPath, env, { encoding: "utf8", flag: "wx" });

QRCode.toFile(qrPath, uri, { width: 420, margin: 2 })
  .then(() => {
    console.log("\nConfiguração criada com sucesso!");
    console.log(`1. Abra esta imagem: ${qrPath}`);
    console.log("2. No Google Authenticator, toque em + e escolha Ler código QR.");
    console.log("3. Depois execute: npm start");
    console.log("\nChave manual de emergência (guarde em lugar seguro):");
    console.log(secret);
    console.log("\nNão envie o arquivo .env nem a chave para outras pessoas.\n");
  })
  .catch((erro) => {
    console.error("Não foi possível gerar o QR Code:", erro.message);
    process.exit(1);
  });

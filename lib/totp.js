const crypto = require("node:crypto");

const ALFABETO_BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function codificarBase32(buffer) {
  let bits = "";
  for (const byte of buffer) bits += byte.toString(2).padStart(8, "0");

  let resultado = "";
  for (let i = 0; i < bits.length; i += 5) {
    const bloco = bits.slice(i, i + 5).padEnd(5, "0");
    resultado += ALFABETO_BASE32[Number.parseInt(bloco, 2)];
  }
  return resultado;
}

function decodificarBase32(texto) {
  const limpo = String(texto).toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";

  for (const caractere of limpo) {
    const indice = ALFABETO_BASE32.indexOf(caractere);
    if (indice < 0) throw new Error("Segredo TOTP inválido.");
    bits += indice.toString(2).padStart(5, "0");
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function gerarSegredo(bytes = 20) {
  return codificarBase32(crypto.randomBytes(bytes));
}

function gerarCodigo(secret, instante = Date.now(), periodo = 30, digitos = 6) {
  const chave = decodificarBase32(secret);
  const contador = Math.floor(instante / 1000 / periodo);
  const mensagem = Buffer.alloc(8);
  mensagem.writeBigUInt64BE(BigInt(contador));

  const hash = crypto.createHmac("sha1", chave).update(mensagem).digest();
  const deslocamento = hash[hash.length - 1] & 0x0f;
  const numero =
    ((hash[deslocamento] & 0x7f) << 24) |
    ((hash[deslocamento + 1] & 0xff) << 16) |
    ((hash[deslocamento + 2] & 0xff) << 8) |
    (hash[deslocamento + 3] & 0xff);

  return String(numero % 10 ** digitos).padStart(digitos, "0");
}

function validarCodigo(secret, codigo, janela = 1) {
  const limpo = String(codigo || "").replace(/\D/g, "");
  if (!/^\d{6}$/.test(limpo)) return false;

  for (let passo = -janela; passo <= janela; passo += 1) {
    const esperado = gerarCodigo(secret, Date.now() + passo * 30_000);
    const a = Buffer.from(esperado);
    const b = Buffer.from(limpo);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
  }
  return false;
}

function criarUriOtp({ secret, conta, emissor }) {
  const rotulo = `${emissor}:${conta}`;
  const parametros = new URLSearchParams({
    secret,
    issuer: emissor,
    algorithm: "SHA1",
    digits: "6",
    period: "30"
  });
  return `otpauth://totp/${encodeURIComponent(rotulo)}?${parametros}`;
}

module.exports = { gerarSegredo, gerarCodigo, validarCodigo, criarUriOtp };

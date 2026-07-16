# Patrulha da Inclusão — Google Authenticator

Versão completa do site com a área de voluntários protegida por código TOTP compatível com Google Authenticator.

## Requisitos

- Node.js 20 ou superior. Node 22 e Node 24 também funcionam.
- Google Authenticator instalado no celular da coordenadora.

Este projeto **não usa `better-sqlite3` nem ferramentas de compilação do Visual Studio**. Os dados são gravados no arquivo `data/voluntarios.json`, adequado para este projeto pequeno.

## Primeira instalação

Abra o terminal do VS Code na pasta do projeto e execute, um comando por vez:

```powershell
npm install
npm run setup-auth
```

O segundo comando cria:

- o arquivo secreto `.env`;
- a imagem `setup-auth-qrcode.png`.

Abra a imagem `setup-auth-qrcode.png` e escaneie pelo Google Authenticator:

1. Abra o aplicativo no celular.
2. Toque em `+`.
3. Escolha **Ler código QR**.
4. Escaneie o QR Code exibido no computador.

Depois inicie o site:

```powershell
npm start
```

Abra no navegador:

```text
http://localhost:3000/voluntarios.html
```

**Não use o Live Server na porta 5500 para testar a área protegida.** O site deve ser aberto pela porta 3000.

## Como funciona

- Qualquer pessoa pode visualizar os voluntários.
- Ao clicar em **Novo voluntário**, o site pede o código de 6 dígitos.
- Depois da autorização, a sessão administrativa dura 15 minutos.
- Cadastro, edição, exclusão e upload de fotos são verificados pelo servidor.
- As fotos ficam na pasta `uploads`.
- Os dados ficam em `data/voluntarios.json`.

## Imagens do site

A pasta `public/assets` contém imagens provisórias para o projeto abrir sem arquivos faltando. Substitua esses arquivos pelas imagens originais do seu site, mantendo exatamente os mesmos nomes.

## Reconfigurar o celular

O comando `npm run setup-auth` não substitui uma configuração existente. Para configurar outro celular:

1. Pare o servidor.
2. Guarde uma cópia do `.env` atual, caso precise recuperar.
3. Apague `.env` e `setup-auth-qrcode.png`.
4. Execute novamente:

```powershell
npm run setup-auth
```

## Publicação

Antes de publicar:

- use HTTPS;
- configure `NODE_ENV=production`;
- use um armazenamento persistente de sessão;
- mantenha `.env` fora do GitHub;
- faça backup de `data/voluntarios.json` e da pasta `uploads`.

# Patrulha da Inclusão --- Google Authenticator

Versão completa do site com a área de voluntários protegida por
autenticação TOTP compatível com Google Authenticator.

## Requisitos

-   Node.js 20 ou superior (Node.js 22 e Node.js 24 também são
    compatíveis).
-   Google Authenticator instalado no celular da coordenadora.

Este projeto **não utiliza `better-sqlite3` nem ferramentas de
compilação do Visual Studio**. Os dados são armazenados em
`data/voluntarios.json`, adequado para este projeto.

------------------------------------------------------------------------

## Primeira instalação

No terminal, dentro da pasta do projeto:

``` powershell
npm install
npm run setup-auth
```

Esse comando cria:

-   `.env`
-   `setup-auth-qrcode.png`

Abra o arquivo `setup-auth-qrcode.png` e escaneie-o no Google
Authenticator:

1.  Abra o aplicativo.
2.  Toque em **+**.
3.  Escolha **Ler código QR**.
4.  Escaneie a imagem.

Depois execute:

``` powershell
npm start
```

Abra no navegador:

``` text
http://localhost:3000/voluntarios.html
```

> **Importante:** não utilize o Live Server (porta 5500). O sistema deve
> ser executado pelo servidor Node.js na porta 3000.

------------------------------------------------------------------------

## Funcionamento

-   Qualquer visitante pode visualizar os voluntários.
-   Para cadastrar, editar ou excluir voluntários é necessário informar
    um código válido do Google Authenticator.
-   A sessão administrativa permanece ativa por 15 minutos.
-   O upload de fotos é validado pelo servidor.
-   As fotos ficam armazenadas em `uploads`.
-   Os dados ficam em `data/voluntarios.json`.

------------------------------------------------------------------------

## Imagens do site

A pasta `public/assets` contém imagens provisórias para permitir que o
projeto seja executado sem arquivos ausentes. Substitua essas imagens
pelas versões finais mantendo os mesmos nomes de arquivo.

------------------------------------------------------------------------

## Recuperação do Google Authenticator

Caso a coordenadora troque de celular ou perca o acesso ao Google Authenticator, **não é necessário criar um novo `TOTP_SECRET`**, desde que o arquivo `.env` ainda exista.

Execute:

```powershell
npm run recuperar-auth
```

Esse comando gera um novo QR Code utilizando o `TOTP_SECRET` já existente, sem alterar a configuração do sistema.

Será criado o arquivo:

```text
qrcode-recuperacao.png
```

Abra essa imagem e escaneie-a no novo celular pelo Google Authenticator.

Após confirmar que o login está funcionando normalmente, **apague a imagem `qrcode-recuperacao.png`**.

> **Importante:** esse procedimento **não invalida** os celulares já configurados. Todos os dispositivos que utilizam o mesmo `TOTP_SECRET` continuarão funcionando normalmente.
------------------------------------------------------------------------

## Quando criar um novo TOTP_SECRET

Crie um novo segredo **somente** quando houver suspeita de
comprometimento da chave, por exemplo:

-   alguém teve acesso ao QR Code;
-   o `TOTP_SECRET` foi exposto;
-   houve acesso não autorizado ao sistema.

Nesse caso:

1.  Pare o servidor.
2.  Faça backup do `.env`, se necessário.
3.  Apague o arquivo `.env`.
4.  Execute:

``` powershell
npm run setup-auth
```

Isso criará um novo `TOTP_SECRET` e invalidará todos os celulares
configurados anteriormente.

------------------------------------------------------------------------

## Publicação

Antes de publicar:

-   utilize HTTPS;
-   configure `NODE_ENV=production`;
-   mantenha o arquivo `.env` fora do GitHub;
-   faça backup periódico de `data/voluntarios.json`;
-   faça backup da pasta `uploads`.

------------------------------------------------------------------------

## Segurança

-   Nunca publique o arquivo `.env`.
-   Nunca compartilhe o valor do `TOTP_SECRET`.
-   Apague qualquer imagem do QR Code após a configuração.
-   Verifique se o arquivo `.gitignore` contém:

``` gitignore
.env
node_modules/
setup-auth-qrcode.png
qrcode-recuperacao.png
```
Para informações detalhadas sobre recuperação, consulte o arquivo `RECUPERACAO_AUTH.md`.
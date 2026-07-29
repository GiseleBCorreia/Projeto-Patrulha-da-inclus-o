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

# Recuperação do Google Authenticator

## Projeto: Patrulha da Inclusão

Este documento explica como recuperar o acesso ao painel administrativo caso a coordenadora perca o celular, troque de aparelho ou remova a conta do Google Authenticator.

---

## Informação mais importante

O acesso depende da chave:

```env
TOTP_SECRET=...
```

Essa chave fica armazenada no arquivo `.env` do servidor.

O QR Code é apenas uma representação visual dessa chave. Portanto, enquanto o mesmo `TOTP_SECRET` existir, é possível gerar novamente um QR Code compatível com o sistema.

> Nunca compartilhe o arquivo `.env`, o valor do `TOTP_SECRET` ou a imagem do QR Code.

---

## Como gerar um QR Code de recuperação

No terminal, dentro da pasta do projeto, execute:

```bash
node scripts/gerar-qrcode-recuperacao.js
```

O sistema criará o arquivo:

```text
qrcode-recuperacao.png
```

Esse QR Code utiliza o `TOTP_SECRET` já existente e não altera o acesso atual.

---

## Como configurar o novo celular

1. Abra o Google Authenticator no novo celular.
2. Toque no botão `+`.
3. Escolha a opção **Ler código QR**.
4. Escaneie o arquivo `qrcode-recuperacao.png`.
5. Inicie o sistema com:

```bash
npm start
```

6. Acesse a tela administrativa.
7. Digite o código de 6 dígitos exibido no Google Authenticator.
8. Confirme que o login funciona normalmente.

---

## Depois da recuperação

Após confirmar que o novo celular consegue entrar no sistema:

1. Apague o arquivo `qrcode-recuperacao.png`.
2. Apague também a imagem da lixeira do computador ou celular.
3. Não envie o QR Code por e-mail, WhatsApp ou redes sociais.
4. Mantenha o arquivo `.env` somente no servidor.

---

## Observações importantes

- Gerar outro QR Code com o mesmo `TOTP_SECRET` não invalida os celulares já configurados.
- Todos os celulares que escanearem um QR Code criado com o mesmo segredo gerarão os mesmos códigos.
- Apagar a imagem do QR Code não remove o acesso de um celular que já o escaneou.
- O QR Code antigo só deixa de funcionar quando o `TOTP_SECRET` é substituído por outro.

---

## Quando trocar o TOTP_SECRET

A chave deve ser trocada se:

- uma pessoa não autorizada teve acesso ao QR Code;
- alguém teve acesso ao valor do `TOTP_SECRET`;
- um celular configurado foi perdido ou roubado sem bloqueio seguro;
- houver suspeita de acesso indevido.

Ao trocar o `TOTP_SECRET`, todos os celulares configurados anteriormente deixam de gerar códigos válidos. Será necessário criar um novo QR Code e configurar novamente o celular autorizado.

---

## Arquivos relacionados

```text
.env
scripts/setup-auth.js
scripts/gerar-qrcode-recuperacao.js
setup-auth-qrcode.png
qrcode-recuperacao.png
```

### Função de cada arquivo

- `.env`: guarda o `TOTP_SECRET` e outras configurações privadas.
- `setup-auth.js`: cria a configuração inicial e um novo segredo.
- `gerar-qrcode-recuperacao.js`: recria o QR Code usando o segredo existente.
- `setup-auth-qrcode.png`: QR Code criado na primeira configuração.
- `qrcode-recuperacao.png`: QR Code temporário criado para recuperação.

As imagens dos QR Codes devem ser apagadas depois do uso.

---

## Segurança do repositório

Confirme que o arquivo `.gitignore` contém:

```gitignore
.env
node_modules/
setup-auth-qrcode.png
qrcode-recuperacao.png
```

Assim, esses arquivos não serão enviados ao GitHub por engano.

---

## Resumo rápido

```text
Perdeu o celular
        ↓
Verifique se o .env existe
        ↓
Execute o script de recuperação
        ↓
Escaneie o novo QR Code
        ↓
Teste o login
        ↓
Apague a imagem do QR Code
```

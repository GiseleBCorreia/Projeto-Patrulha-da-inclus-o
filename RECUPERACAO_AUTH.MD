
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

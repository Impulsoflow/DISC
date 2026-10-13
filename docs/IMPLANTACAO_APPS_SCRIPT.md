# Implantação gratuita — DISC 360°

Este repositório utiliza Google Apps Script para o backend e GitHub Pages para a interface.

## Estado

A implantação do Apps Script **não** está autorizada por credenciais automatizadas nesta integração. Não usar a ação de publicar HTML antes de atualizar e testar o backend. A pasta de homologação preserva a versão pública.

## Preparação de acesso (uma vez)

1. Entrar na conta institucional em https://script.google.com/home/projects.
2. Abrir o projeto que corresponde à implantação do DISC 360° e copiar o **ID do script** em Configurações do projeto.
3. Ativar a API do Google Apps Script em https://script.google.com/home/usersettings.
4. Configurar autorização OAuth segura para o clasp, sem armazenar tokens em arquivos públicos. Guardar o conteúdo de .clasprc.json **somente** em GitHub Actions Secrets e nunca enviar credenciais por chat.
5. Definir o secret `CLASP_CREDENTIALS` em Settings → Secrets and variables → Actions → New repository secret e o `SCRIPT_ID` como variável Actions, após confirmação do script de produção.

## Procedimento de publicação

1. Revisar os resultados em ambiente separado, incluindo autenticação, gravação sem duplicidade, e-mail e PDF.
2. Executar o workflow de implantação **manualmente**, validando a implantação `test`.
3. Somente depois de homologado, atualizar a implantação pública mantendo o deployment ID existente; `clasp push` sozinho não publica uma versão nova do Web App.
4. Testar a URL publicada com avaliação de teste autorizada, sem dados de clientes.

**Segurança:** a chave presente no HTML público não é uma credencial segura; requer autenticação server-side e rotação antes da utilização comercial. Guardar tokens OAuth em secrets, restringir permissões da conta e não registrar PINs em logs.

# IMPULSOFLOW — Regra obrigatória de versionamento das pesquisas

Este repositório contém um formulário comercial do IMPULSOFLOW. Desde 17/10/2026, **toda publicação que altera o formulário deve mudar a versão visível no rodapé e os dois registros técnicos** (`meta` do HTML e `version.json`).

## Padrão
- Início do controle: **v1.0.0**, marco inicial de versionamento do formulário; não indica a versão do Google Apps Script.
- Correções pontuais, acessibilidade, mudanças de texto e ajustes de PDF: aumentar **PATCH** (`v1.0.0` → `v1.0.1`).
- Novas funções compatíveis: aumentar **MINOR** (`v1.0.0` → `v1.1.0`).
- Alterações incompatíveis de contrato/estrutura ou grande reformulação do formulário: aumentar **MAJOR** (`v1.0.0` → `v2.0.0`).
- Atualizar **em conjunto** o elemento `#impulso-form-version`, `<meta name="impulso-form-version">`, `version.json` e o histórico em `VERSOES.md`.
- Antes de publicar: validar com `node scripts/check-form-version.cjs` e `node scripts/check-release-bump.cjs`. Workflow GitHub Actions verifica cada push e PR.
- Preservar backend, banco de clientes, planilhas e credenciais; versionamento do HTML não autoriza troca de Apps Script.
- Nas próximas pesquisas, implantar este mesmo rodapé **antes de qualquer melhoria**. Não alterar pesquisas em lote sem seus respectivos testes e registro.

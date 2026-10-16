# IMPULSOFLOW — DISC 360° | Homologação de cálculo, idempotência e recibos (16/10/2026)

**Status:** implementação somente na branch `fix/disc360-reverse-scoring-20261016`, PR #2 em rascunho. **Não implantado** no Apps Script, não integrado em `main` e não aplicado a registros históricos.

## Entregas no código candidato
- Mapa canônico DISC convidado de 24 itens; reversão fixa nos índices humanos 13–16 e 21–24 (`6 - resposta`), nunca a partir de `discScoringMap` do navegador.
- Validação estrita de escala 1–5 para 24 itens DISC e 12 dimensões premium; controle do status e validade do convite; vínculo entre código e SessionId.
- Ledger `Operacoes360` com `requestId`, fingerprint, `PENDING`/`COMPLETE`, `LockService` e não regravação de tentativas idênticas. `PENDING` exige conciliação administrativa; proibir reenvio com novo ID antes da conferência.
- Endpoints `getStatus360`, `getReport360` e envio `relatorio_360` exigem e-mail + PIN corretos e SessionId do titular.
- `relatorio_360` valida o mínimo de avaliações, tamanho/Base64/assinatura do PDF, deduplica o e-mail e persiste estado da tentativa.
- Consulta autenticada `getOperation360Status` retorna `NOT_FOUND`, `PENDING` ou `ACCEPTED`. O frontend consulta o recibo após formulário oculto; **ACCEPTED significa que o processo de envio foi aceito por GmailApp, não entrega garantida à caixa de entrada**.

## Evidência local
Executados a partir de clone novo da branch (ambiente Mac BCD, sem chamadas aos serviços Google):
- `node tests/disc360-reverse-scoring.test.cjs`: **13/13**.
- `node tests/disc360-backend-guards.test.cjs`: **20/20** (17 testes iniciais + 3 cenários PDF).
- `node --test tests/access-flow.test.mjs`: **4/4**.
- `node --check` para backend e JavaScript inline da página: **aprovados**.
**Total: 37 testes aprovados** com mocks; não se trata de teste integrado ou de validade psicométrica.

## Bloqueios restantes antes de publicar
1. Comparar **código e versões da implantação real** Google Apps Script com a fonte GitHub. O GitHub não é garantia da implantação ativa; não substituir a produção cegamente.
2. Criar projeto Apps Script e planilha de staging independentes e credenciais/teste de e-mail dedicados; não reutilizar IDs e segredos de produção.
3. Verificar autorização na Central V4 no **backend receptor**, sobretudo `centralAccessGrant` (atualmente preenchido pelo cliente) e rotas públicas `createSession360`/`ativar_360`. Integrar com a issue Impulso-Pesquisas-Admin#2.
4. Revisar e proteger as demais rotas sensíveis, especialmente `relatorio_disc`, recuperação de PIN/senha, tentativas de força bruta e acesso por JSONP. E-mail+PIN é defesa inicial, não substitui tokens de sessão e rate limiting.
5. Testar em staging o fluxo completo (autoavaliação > convite > envio > 3 convidados > relatório > PDF > Gmail), concorrência real, callbacks e estado PENDING.
6. Resolver comparabilidade das escalas autoavaliação híbrida e convidado 24 itens antes de usar diferenças percentuais como interpretação robusta; formalizar versão de pontuação e cautelas científicas.
7. Auditoria dos históricos **sem** sobrescrever resultados. As linhas históricas podem não guardar as 24 respostas originais e não podem ser recalculadas com segurança sem fontes legítimas.
8. Separar reconhecimento de envio Gmail de entrega efetiva ao destinatário; para reconciliação de entrega, usar logs/integração específica de provedor e procedimentos de suporte.
9. O repositório possui `Index7.html` e `index7.html` que colidem em sistemas de arquivos case-insensitive; verificado warning no macOS, sem inclusão no PR.

## Regra para aprovação
- Revisão de segurança + backup, suíte de staging com dados sintéticos, comparação de versões, revisão de ciência/escala, confirmação do titular.
- Só depois solicitar autorização explícita para merge/deploy, com rollback e janela de implantação.
- **Não tocar no AVIVACEL.**

## Atualização de segurança e publicação — 16/10/2026 (noite)

- Corrigido também `relatorio_disc` (Relatório Geral): e-mail+PIN vinculados à sessão, PDF validado, idempotência por requestId e recibo autenticado. No frontend, ambos os relatórios verificam aceite do servidor sem alegar entrega na caixa de entrada.
- Adicionado `disc360VerifySignedCentralGrant` em `saveDisc`: HMAC-SHA256 do grant emitido por `lib/research-access.ts`, confirmação de validade, finalidade `disc`, hash de e-mail, cliente e nonce; retake somente de `requestId` assinado. A configuração ausente do segredo causa falha fechada, não autorização por default.
- Propriedade **necessária em staging e em produção após homologação:** `IMPULSO_DISC_ACCESS_HMAC_SECRET`. Nunca commitar o valor. Precisa corresponder à assinatura atual da Central — coordenação com operador do Worker. Não trocar o segredo de produção sem estratégia de compatibilidade e expiração dos grants emitidos.
- **IMPORTANTE:** HMAC sozinho NÃO verifica estado `INICIADO` na D1 nem consome o nonce. A autorização/consumo **servidor-servidor** (issue #2) ainda é bloqueio P0 para venda e deploy. Não divulgar o token de grant em logs ou URLs.
- Testes locais após integração: **46/46** (13 cálculo, 22 proteção/idempotência/PDF, 7 HMAC, 4 fluxo). Verificação de sintaxe do servidor e JS inline aprovada. GitHub Actions `Homologacao DISC 360` executado com conclusão success.
- Confirmado diretamente no editor Google Apps Script autenticado como IMPULSOFLOW: projeto `Disc360`, implantação web ativa **versão 39 (27/08/2026)**. O editor identifica fonte v2.2. Essa versão não corresponde à branch e deve ser preservada; não substituir sem backup e comparação de fonte real.
- Planilha `DISC360`: abas reais `Respostas`, `Avaliados360`, `Convidados360`, `Logs360`, `Solicitacoes DISC`; não foi observada `Operacoes360`. Nenhuma alteração nesses dados realizada.
- Segurança ainda pendente: `createSession360` e `ativar_360` criam sessões sem comprovação robusta de direito; `relatorio_disc` novo requer integração do frontend em homologação. Revisar os demais endpoints abertos, incluindo recuperação de PIN/senha, mitigação de brute force e JSONP.
- **Decisão técnica:** merge e deploy bloqueados até habilitar staging isolado, validar versão/escopos do Apps Script ativo, provar autorização e consumo em D1, testar E2E real com Gmail/Sheets de teste e aprovar rollback. Nenhum dado histórico foi recalculado.


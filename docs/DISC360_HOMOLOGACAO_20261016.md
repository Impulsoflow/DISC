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

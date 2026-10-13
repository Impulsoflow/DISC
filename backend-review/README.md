# DISC 360 — candidato de confiabilidade, NÃO implantado

Este conjunto foi preparado a partir do arquivo ScriptDisc.html v2.2 enviado pelo proprietário. Não foi possível obter o código ativo do Google Apps Script. Não substituir a produção com esse arquivo sem comparar a versão ativa.

## Conteúdo

- reliability.gs: validação, controle de reenvios e handler relatorio_360.
- backend-routing.patch: adapta o arquivo original para usar o módulo; também aceita o campo payload do formulário HTML.
- test-reliability.cjs: 17 testes unitários com Sheets/Gmail simulados; execute `node test-reliability.cjs` nesta pasta.

## Pré-requisitos antes de implantar

1. Obter e preservar código, manifesto, propriedades e identificador da implantação ativa. Comparar o patch com esse código. O HTML atualmente publicado contém ações adicionais que não existem no backend enviado, incluindo relatorio_disc; não substituir o servidor ativo por essa base antiga.
2. Adicionar requestId aleatório aos envios saveDisc, submitConvidado e relatorio_360 das páginas. Preservar o mesmo identificador em todas as tentativas de um envio, inclusive após recarregar a página. Sem isso, este candidato rejeita os envios. As páginas públicas AINDA NÃO receberam essa adaptação.
3. Aplicar as renomeações e rota do patch e adicionar reliability.gs no projeto de homologação. Não manter duas funções com o mesmo nome.
4. Verificar escalas, formato de perfilPrimario e pontuações com a versão ativa; o candidato valida o contrato do arquivo original (24 respostas DISC e 12 premium, de 1 a 5).
5. Testar ponta a ponta em planilha separada, destinatário de teste autorizado e implantação de teste; verificar concorrência real, limites do Gmail, PDF completo e confirmação de processamento no navegador.
6. Resolver autenticação das demais rotas e anonimato do relatório antes da liberação comercial. A chave pública do cliente não autentica usuários; este patch não pretende corrigir todas as rotas de acesso.

## Garantias e limites

- Nenhum teste enviou e-mail ou modificou dados de clientes.
- O ledger Operacoes360 usa bloqueio global e marcador PENDING durável para impedir nova gravação após falha parcial. PENDING exige conferência administrativa; não é recuperado automaticamente e não deve ser apagado para forçar reenvio.
- A deduplicação cobre o mesmo requestId. Não impede que alguém envie deliberadamente com identificadores diferentes.
- emailAccepted significa que GmailApp aceitou a operação, não entrega garantida à caixa de entrada.
- O envio do relatório exige PIN e e-mail do titular; o destinatário vem da sessão armazenada. Nenhum endereço arbitrário de destinatário é aceito.
- A validação de PDF checa tamanho, base64 e assinatura, não constitui inspeção completa do conteúdo.
- Este conjunto está na ramificação de homologação. Não foi implantado no Google nem mesclado em main.

## Evidência local

17/17 testes unitários aprovados. Sintaxe do backend original com patch e módulo validada por node --check. Não equivale a homologação integrada.

Referências das APIs utilizadas: https://developers.google.com/apps-script/reference/lock/lock-service e https://developers.google.com/apps-script/reference/content/text-output.

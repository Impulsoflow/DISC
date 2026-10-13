// Candidate patch for the supplied v2.2 backend. Not deployed.
// Requires client-generated requestId, reused for retries of the same submission.
function disc360Assert(condition, message) {
  if (!condition) throw new Error(message);
}

function disc360Validate(action, payload) {
  disc360Assert(payload && typeof payload === 'object', 'Payload inválido');
  disc360Assert(typeof payload.requestId === 'string' &&
    /^[a-zA-Z0-9_-]{20,100}$/.test(payload.requestId), 'requestId obrigatório ou inválido');
  if (action === 'saveDisc') {
    disc360Assert(typeof payload.nome === 'string' && payload.nome.trim().length >= 2, 'Nome obrigatório');
    disc360Assert(typeof payload.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email), 'E-mail inválido');
    const scores = ['scoreD', 'scoreI', 'scoreS', 'scoreC'].map(function(k) { return payload[k]; });
    disc360Assert(scores.every(function(n) { return typeof n === 'number' && Number.isFinite(n) && n >= 0; }) &&
      scores.reduce(function(a, b) { return a + b; }, 0) > 0, 'Pontuações DISC ausentes ou inválidas');
    disc360Assert(['D', 'I', 'S', 'C'].indexOf(payload.perfilPrimario) !== -1, 'Perfil primário inválido');
  } else if (action === 'submitConvidado') {
    ['respostas', 'premium'].forEach(function(key) {
      const size = key === 'respostas' ? 24 : 12;
      disc360Assert(Array.isArray(payload[key]) && payload[key].length === size &&
        payload[key].every(function(n) { return Number.isInteger(n) && n >= 1 && n <= 5; }),
        key + ': todas as respostas de 1 a 5 são obrigatórias');
    });
    disc360Assert(typeof payload.relacao === 'string' && payload.relacao.trim().length > 0, 'Relação obrigatória');
    disc360Assert(typeof payload.tempoConvivencia === 'string' && payload.tempoConvivencia.trim().length > 0, 'Tempo de convivência obrigatório');
    let session = payload.codigo ? findSessionByCodigo(payload.codigo) : null;
    if (!session && payload.sessionId) session = findSession(payload.sessionId);
    if (!session && payload.pin) session = findSessionByPin(payload.pin);
    disc360Assert(session && session.status === 'ativo', 'Sessão inválida ou encerrada');
    if (session.dataLimite) {
      const expiry = new Date(session.dataLimite).getTime();
      disc360Assert(Number.isFinite(expiry) && expiry >= Date.now(), 'Convite expirado ou com validade inválida');
    }
  }
}

function disc360Canonical(value) {
  if (Array.isArray(value)) return value.map(disc360Canonical);
  if (value && typeof value === 'object') {
    const result = {};
    Object.keys(value).sort().forEach(function(key) {
      if (key !== 'apiKey' && key !== 'requestId') result[key] = disc360Canonical(value[key]);
    });
    return result;
  }
  return value;
}

function disc360Once(action, payload, operation) {
  // Validate before creating any sheet or writing any record.
  disc360Validate(action, payload);
  const fingerprint = Utilities.base64EncodeWebSafe(Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, JSON.stringify(disc360Canonical(payload))));
  const lock = LockService.getScriptLock();
  disc360Assert(lock.tryLock(5000), 'Outra operação está em andamento. Reenvie com o mesmo requestId.');
  try {
    const ss = getSpreadsheet();
    let ledger = ss.getSheetByName('Operacoes360');
    if (!ledger) {
      ledger = ss.insertSheet('Operacoes360');
      ledger.appendRow(['RequestId', 'Action', 'Fingerprint', 'Status', 'Response', 'Timestamp']);
    }
    const rows = ledger.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] !== payload.requestId) continue;
      disc360Assert(rows[i][1] === action && rows[i][2] === fingerprint, 'requestId reutilizado com dados diferentes');
      disc360Assert(rows[i][3] === 'COMPLETE', 'Operação pendente de conferência. Não crie outro requestId.');
      return jsonResponse(JSON.parse(rows[i][4]));
    }
    // A durable pending marker prevents replay after a partial failure or timeout.
    ledger.appendRow([payload.requestId, action, fingerprint, 'PENDING', '', new Date()]);
    SpreadsheetApp.flush();
    const row = ledger.getLastRow();
    const response = operation(payload);
    const result = JSON.parse(response.getContent());
    if (result.ok === true) {
      ledger.getRange(row, 4, 1, 2).setValues([['COMPLETE', JSON.stringify(result)]]);
      SpreadsheetApp.flush();
    }
    return response;
  } finally {
    lock.releaseLock();
  }
}

function handleSaveDisc(payload) {
  try { return disc360Once('saveDisc', payload, handleSaveDiscOriginal); }
  catch (error) { return jsonResponse({ok: false, error: error.message}); }
}

function handleSubmitConvidado(payload) {
  try { return disc360Once('submitConvidado', payload, handleSubmitConvidadoOriginal); }
  catch (error) { return jsonResponse({ok: false, error: error.message}); }
}

function handleRelatorio360(payload) {
  try {
    // API_KEY in a public client is not authentication. Verify the owner's PIN.
    const session = findSessionByEmailAndPin(payload.email, payload.pin);
    disc360Assert(session && session.status === 'ativo', 'E-mail ou PIN inválidos');
    disc360Assert(!payload.sessionId || payload.sessionId === session.sessionId, 'Sessão divergente');
    disc360Assert(countConvidados(session.sessionId) >= MIN_AVALIACOES_360, 'Avaliações insuficientes');
    disc360Assert(typeof payload.pdfBase64 === 'string' && payload.pdfBase64.length > 0 &&
      payload.pdfBase64.length <= 14000000 && /^[A-Za-z0-9+/]+={0,2}$/.test(payload.pdfBase64), 'PDF inválido ou muito grande');
    const bytes = Utilities.base64Decode(payload.pdfBase64);
    disc360Assert(bytes.length >= 5 && bytes.slice(0, 5).join(',') === '37,80,68,70,45', 'Arquivo não é PDF');
    return disc360Once('relatorio_360', payload, function() {
      const pdf = Utilities.newBlob(bytes, 'application/pdf', 'Relatorio360.pdf');
      GmailApp.sendEmail(session.email, 'Seu Relatório DISC 360° — Instituto Impulso',
        'Seu relatório está em anexo.', {attachments: [pdf]});
      return jsonResponse({ok: true, emailAccepted: true, requestId: payload.requestId});
    });
  } catch (error) { return jsonResponse({ok: false, error: error.message}); }
}

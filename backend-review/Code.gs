/* ════════════════════════════════════════════════════════════════════════
   INSTITUTO IMPULSO IE™ — DISC + 360° ESPELHO
   Backend Apps Script Personalizado
   Versão: 2.2 — CORRIGIDA (validateInvite por PIN + diagnóstico)
   Autor: Rogério Braga | impulsoflow@gmail.com
   ════════════════════════════════════════════════════════════════════════ */

// ═══════════════════════════════════════════════════════════════════════
// 🎯 CONFIGURAÇÕES
// ═══════════════════════════════════════════════════════════════════════
const API_KEY = "2026Impulso$";
const SPREADSHEET_ID = "14Dl9ALPNJgFKo63CbbrceEJm2Fc0iePB_0ZY-FZf3FY";
const ADMIN_EMAIL = "impulsoflow@gmail.com";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwwl82lCSU8x1-QYIO3W-JcO0UsuOXCdZACvcHaSdVyFMR2udcCNdDFKDyT5kYB2wORgQ/exec";

const MIN_AVALIACOES_360 = 3;
const VALIDADE_DIAS_360 = 90;
const PIN_LENGTH = 6;

const URL_PAINEL_AVALIADO = "https://impulsoflow.github.io/DISC/";
const URL_PAGINA_CONVIDADO = "https://impulsoflow.github.io/ConvidadoDisc/";

const ABA_DISC = "Respostas";
const ABA_AVALIADOS = "Avaliados360";
const ABA_CONVIDADOS = "Convidados360";
const ABA_LOGS = "Logs360";

// ═══════════════════════════════════════════════════════════════════════
// 🚀 ENTRY POINT — POST
// ═══════════════════════════════════════════════════════════════════════
function doPost(e) {
  try {
    const rawPayload = (e && e.parameter && e.parameter.payload) || (e && e.postData && e.postData.contents) || "";
    if (!rawPayload) {
      return jsonResponse({ ok: false, error: "Sem payload" });
    }

    const payload = JSON.parse(rawPayload);

    if (payload.apiKey !== API_KEY) {
      logEvent("AUTH_FAIL", "API Key inválida");
      return jsonResponse({ ok: false, error: "Não autorizado" });
    }

    const action = payload.action || "saveDisc";

    switch (action) {
      case "saveDisc":          return handleSaveDisc(payload);
      case "createSession360":  return handleCreateSession360(payload);
      case "submitConvidado":   return handleSubmitConvidado(payload);
      case "relatorio_360":     return handleRelatorio360(payload);
      case "loginAvaliado":     return handleLoginAvaliado(payload);
      case "getStatus360":      return handleGetStatus360(payload);
      case "getReport360":      return handleGetReport360(payload);
      case "validateInvite":    return handleValidateInvite(payload);
      case "consultar_360":     return handleConsultar360(payload);
      case "recuperar_pin_360": return handleRecuperarPin360(payload);
      case "ativar_360":        return handleAtivar360(payload);
      // 🆕 Senha do avaliado (escolhida no cadastro) — recuperação e redefinição
      case "solicitar_reset_senha": return handleSolicitarResetSenha(payload);
      case "redefinir_senha":       return handleRedefinirSenha(payload);
      case "loginAvaliadoSenha":    return handleLoginAvaliadoSenha(payload);
      default:
        return jsonResponse({ ok: false, error: "Ação desconhecida: " + action });
    }
  } catch (err) {
    logEvent("ERROR", "doPost: " + err.message);
    return jsonResponse({ ok: false, error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 🚀 ENTRY POINT — GET (suporta JSONP)
// ═══════════════════════════════════════════════════════════════════════
function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const callback = params.callback;

    // Sem callback → retorna status JSON
    if (!callback) {
      return ContentService
        .createTextOutput(JSON.stringify({
          service: "Impulso DISC 360°",
          version: "2.2",
          status: "online",
          timestamp: new Date().toISOString()
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Com callback → JSONP com action routing
    const apiKey = params.apiKey || "";
    if (apiKey !== API_KEY) {
      logEvent("AUTH_FAIL", "JSONP API Key inválida");
      return jsonpResponse(callback, { ok: false, error: "Não autorizado" });
    }

    const action = params.action || "";
    let payload = {};

    if (params.payload) {
      try {
        let b64 = String(params.payload).replace(/-/g, "+").replace(/_/g, "/");
        const pad = b64.length % 4;
        if (pad) b64 += "=".repeat(4 - pad);
        const decoded = Utilities.base64Decode(b64);
        const txt = Utilities.newBlob(decoded).getDataAsString("UTF-8");
        payload = JSON.parse(txt);
      } catch (err) {
        return jsonpResponse(callback, { ok: false, error: "Payload inválido: " + err.message });
      }
    }

    let resultText;
    switch (action) {
      case "consultar_360":     resultText = handleConsultar360(payload).getContent(); break;
      case "recuperar_pin_360": resultText = handleRecuperarPin360(payload).getContent(); break;
      case "loginAvaliado":     resultText = handleLoginAvaliado(payload).getContent(); break;
      case "getStatus360":      resultText = handleGetStatus360(payload).getContent(); break;
      case "getReport360":      resultText = handleGetReport360(payload).getContent(); break;
      case "validateInvite":    resultText = handleValidateInvite(payload).getContent(); break;
      case "submitConvidado":   resultText = handleSubmitConvidado(payload).getContent(); break;
      case "solicitar_reset_senha": resultText = handleSolicitarResetSenha(payload).getContent(); break;
      case "redefinir_senha":       resultText = handleRedefinirSenha(payload).getContent(); break;
      case "loginAvaliadoSenha":    resultText = handleLoginAvaliadoSenha(payload).getContent(); break;
      default:
        return jsonpResponse(callback, { ok: false, error: "Ação JSONP desconhecida: " + action });
    }

    return ContentService
      .createTextOutput(callback + "(" + resultText + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);

  } catch (err) {
    logEvent("ERROR", "doGet: " + err.message);
    const cb = (e && e.parameter && e.parameter.callback) || "console.error";
    return jsonpResponse(cb, { ok: false, error: err.message });
  }
}

function jsonpResponse(callback, obj) {
  return ContentService
    .createTextOutput(callback + "(" + JSON.stringify(obj) + ");")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════════════════════════
// 1️⃣ DISC ORIGINAL — SALVAMENTO + EMAIL
// ═══════════════════════════════════════════════════════════════════════
function handleSaveDiscOriginal(payload) {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(ABA_DISC);

    if (!sheet) {
      sheet = ss.insertSheet(ABA_DISC);
      sheet.appendRow([
        "Timestamp", "Nome", "Email", "WhatsApp", "Idade",
        "Profissão", "Escolaridade", "Perfil Primário", "Perfil Secundário",
        "Score D", "Score I", "Score S", "Score C",
        "% D", "% I", "% S", "% C", "Combinação", "SessionId 360°"
      ]);
    }

    const sessionId = generateSessionId();

    sheet.appendRow([
      new Date(),
      payload.nome,
      payload.email,
      payload.whatsapp,
      payload.idade,
      payload.profissao,
      payload.escolaridade,
      payload.perfilPrimario,
      payload.perfilSecundario,
      payload.scoreD, payload.scoreI, payload.scoreS, payload.scoreC,
      payload.pctD, payload.pctI, payload.pctS, payload.pctC,
      payload.combinacao,
      sessionId
    ]);

    const pin = generatePin();

    create360Session({
      sessionId, pin,
      nome: payload.nome,
      email: payload.email,
      whatsapp: payload.whatsapp,
      scoreD: payload.scoreD, scoreI: payload.scoreI,
      scoreS: payload.scoreS, scoreC: payload.scoreC,
      perfilPrimario: payload.perfilPrimario
    });

    if (payload.sendEmail && payload.pdfBase64) {
      sendDiscEmail(payload, sessionId, pin);
    }

    logEvent("DISC_SAVED",
      `${payload.nome} | ${payload.email} | session=${sessionId}`);

    return jsonResponse({
      ok: true,
      sessionId, pin,
      message: "DISC salvo e sessão 360° criada"
    });

  } catch (err) {
    logEvent("ERROR", "saveDisc: " + err.message);
    return jsonResponse({ ok: false, error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 2️⃣ CRIAR SESSÃO 360°
// ═══════════════════════════════════════════════════════════════════════
function handleCreateSession360(payload) {
  try {
    const sessionId = generateSessionId();
    const pin = generatePin();

    create360Session({
      sessionId, pin,
      nome: payload.nome,
      email: payload.email,
      whatsapp: payload.whatsapp || "",
      scoreD: payload.scoreD || 0, scoreI: payload.scoreI || 0,
      scoreS: payload.scoreS || 0, scoreC: payload.scoreC || 0,
      perfilPrimario: payload.perfilPrimario || ""
    });

    return jsonResponse({
      ok: true,
      sessionId, pin,
      linkConvidado: `${URL_PAGINA_CONVIDADO}?id=${sessionId}`,
      linkPainel: URL_PAINEL_AVALIADO
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

function create360Session(data) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(ABA_AVALIADOS);

  if (!sheet) {
    sheet = ss.insertSheet(ABA_AVALIADOS);
    sheet.appendRow([
      "Timestamp", "SessionId", "PIN", "Nome", "Email", "WhatsApp",
      "Score D Auto", "Score I Auto", "Score S Auto", "Score C Auto",
      "Perfil Primário", "Data Limite", "Status", "Total Convidados",
      // 🆕 Novas colunas: código 360°, senha do avaliado, token de reset
      "Codigo360", "SenhaHash", "ResetToken", "ResetTokenExpira"
    ]);
  }

  // 🆕 Migração leve: garante que as 4 novas colunas existam mesmo em planilhas antigas
  ensureAvaliadosExtraColumns(sheet);

  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() + VALIDADE_DIAS_360);

  // 🔒 SenhaHash deixada vazia — a senha é criada pelo avaliado depois, durante login/recuperação
  const senhaHash = "";
  // 🆕 Código 360° único (DISC-XXXXX) — usado no link do convidado
  const codigo360 = data.codigo360 || generateCodigo360();

  sheet.appendRow([
    new Date(),
    data.sessionId, data.pin,
    data.nome, data.email, data.whatsapp,
    data.scoreD, data.scoreI, data.scoreS, data.scoreC,
    data.perfilPrimario,
    dataLimite, "ativo", 0,
    codigo360, senhaHash, "", ""
  ]);

  logEvent("SESSION_360_CREATED",
    `${data.nome} | ${data.sessionId} | PIN=${data.pin} | Codigo=${codigo360}`);

  return { codigo360: codigo360 };
}

// 🆕 Garante que a aba Avaliados360 tem as 4 colunas extras (Codigo360, SenhaHash, ResetToken, ResetTokenExpira)
function ensureAvaliadosExtraColumns(sheet) {
  try {
    const lastCol = sheet.getLastColumn();
    if (lastCol >= 18) return; // já tem todas
    const headersRow = sheet.getRange(1, 1, 1, Math.max(lastCol, 1)).getValues()[0];
    const desired = [
      "Timestamp", "SessionId", "PIN", "Nome", "Email", "WhatsApp",
      "Score D Auto", "Score I Auto", "Score S Auto", "Score C Auto",
      "Perfil Primário", "Data Limite", "Status", "Total Convidados",
      "Codigo360", "SenhaHash", "ResetToken", "ResetTokenExpira"
    ];
    for (let i = lastCol; i < desired.length; i++) {
      sheet.getRange(1, i + 1).setValue(desired[i]);
    }
  } catch (e) { /* silencioso */ }
}

// ═══════════════════════════════════════════════════════════════════════
// 3️⃣ VALIDAR LINK DE CONVITE  🆕 CORRIGIDO — agora aceita PIN também
// ═══════════════════════════════════════════════════════════════════════
function handleValidateInvite(payload) {
  try {
    let session = null;

    // 🆕 Prioridade 1: busca por CÓDIGO 360° (DISC-XXXXX) — novo fluxo
    if (payload.codigo) {
      session = findSessionByCodigo(payload.codigo);
    }

    // Prioridade 2: por sessionId (fluxo padrão saveDisc/createSession360)
    if (!session && payload.sessionId) {
      session = findSession(payload.sessionId);
    }

    // Fallback: busca por PIN (compatibilidade com links antigos)
    if (!session && payload.pin) {
      session = findSessionByPin(payload.pin);
    }

    if (!session) {
      logEvent("VALIDATE_FAIL",
        `sessionId=${payload.sessionId || 'vazio'} | pin=${payload.pin || 'vazio'} | codigo=${payload.codigo || 'vazio'}`);
      return jsonResponse({ ok: false, error: "Convite inválido ou expirado" });
    }
    if (session.status !== "ativo") {
      return jsonResponse({ ok: false, error: "Avaliação encerrada" });
    }
    if (session.dataLimite && new Date() > new Date(session.dataLimite)) {
      return jsonResponse({ ok: false, error: "Convite expirado" });
    }

    return jsonResponse({
      ok: true,
      nomeAvaliado: session.nome,
      sessionId: session.sessionId,
      codigo: session.codigo360 || "",
      perfilPrimario: session.perfilPrimario || ""
    });
  } catch (err) {
    logEvent("ERROR", "validateInvite: " + err.message);
    return jsonResponse({ ok: false, error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 4️⃣ CONVIDADO ENVIA RESPOSTA  🆕 CORRIGIDO — aceita sessionId OU pin
// ═══════════════════════════════════════════════════════════════════════
function handleSubmitConvidadoOriginal(payload) {
  try {
    // 🆕 Prioriza CÓDIGO 360° (DISC-XXXXX); cai para sessionId; cai para PIN
    let session = null;
    if (payload.codigo) session = findSessionByCodigo(payload.codigo);
    if (!session && payload.sessionId) session = findSession(payload.sessionId);
    if (!session && payload.pin) session = findSessionByPin(payload.pin);

    if (!session) {
      return jsonResponse({ ok: false, error: "Sessão inválida" });
    }

    // Garante que sempre temos um sessionId real para gravar
    const sessionIdReal = session.sessionId;

    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(ABA_CONVIDADOS);

    if (!sheet) {
      sheet = ss.insertSheet(ABA_CONVIDADOS);
      const headers = [
        "Timestamp", "SessionId", "Relação", "Tempo Convivência",
        "Score D", "Score I", "Score S", "Score C",
        "% D", "% I", "% S", "% C"
      ];
      for (let i = 1; i <= 12; i++) headers.push("P" + i);
      headers.push("Força Principal", "Ponto Melhoria", "Sugestão SBI");
      sheet.appendRow(headers);
    }

    const scores = calcDiscFromResponses(payload.respostas);
    const pcts = calcPercentages(scores);

    const row = [
      new Date(), sessionIdReal,
      payload.relacao, payload.tempoConvivencia,
      scores.D, scores.I, scores.S, scores.C,
      pcts.D, pcts.I, pcts.S, pcts.C
    ];

    for (let i = 0; i < 12; i++) row.push((payload.premium && payload.premium[i]) || 0);

    row.push(
      payload.forcaPrincipal || "",
      payload.pontoMelhoria || "",
      payload.sugestaoSBI || ""
    );

    sheet.appendRow(row);
    incrementConvidadosCount(sessionIdReal);

    const totalAtual = countConvidados(sessionIdReal);
    if (totalAtual === MIN_AVALIACOES_360) {
      notifyAvaliadoMinimumReached(session);
    }

    logEvent("CONVIDADO_SUBMITTED",
      `Session=${sessionIdReal} | Relação=${payload.relacao} | Total=${totalAtual}`);

    return jsonResponse({
      ok: true,
      message: "Resposta registrada com sucesso!",
      totalAvaliacoes: totalAtual
    });

  } catch (err) {
    logEvent("ERROR", "submitConvidado: " + err.message);
    return jsonResponse({ ok: false, error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 5️⃣ LOGIN DO AVALIADO
// ═══════════════════════════════════════════════════════════════════════
function handleLoginAvaliado(payload) {
  try {
    const session = findSessionByEmailAndPin(payload.email, payload.pin);
    if (!session) {
      logEvent("LOGIN_FAIL", `Email=${payload.email}`);
      return jsonResponse({ ok: false, error: "E-mail ou PIN inválidos" });
    }

    return jsonResponse({
      ok: true,
      sessionId: session.sessionId,
      nome: session.nome,
      perfilPrimario: session.perfilPrimario,
      scoresAuto: {
        D: session.scoreD, I: session.scoreI,
        S: session.scoreS, C: session.scoreC
      }
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 6️⃣ STATUS DA AVALIAÇÃO
// ═══════════════════════════════════════════════════════════════════════
function handleGetStatus360(payload) {
  try {
    const session = findSession(payload.sessionId);
    if (!session) return jsonResponse({ ok: false, error: "Sessão não encontrada" });

    const totalRespostas = countConvidados(payload.sessionId);
    const liberado = totalRespostas >= MIN_AVALIACOES_360;
    const breakdown = breakdownByRelation(payload.sessionId);

    return jsonResponse({
      ok: true,
      sessionId: payload.sessionId,
      nome: session.nome,
      totalRespostas, liberado, breakdown,
      minimoNecessario: MIN_AVALIACOES_360,
      linkConvidado: `${URL_PAGINA_CONVIDADO}?id=${payload.sessionId}`,
      dataLimite: session.dataLimite
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 7️⃣ RELATÓRIO 360° COMPLETO
// ═══════════════════════════════════════════════════════════════════════
function handleGetReport360(payload) {
  try {
    const session = findSession(payload.sessionId);
    if (!session) return jsonResponse({ ok: false, error: "Sessão não encontrada" });

    const respostas = getAllConvidados(payload.sessionId);
    if (respostas.length < MIN_AVALIACOES_360) {
      return jsonResponse({
        ok: false,
        error: `Mínimo de ${MIN_AVALIACOES_360} avaliações ainda não atingido`,
        totalAtual: respostas.length
      });
    }

    const mediasDisc = calcMediasDisc(respostas);
    const mediasPremium = calcMediasPremium(respostas);
    const johari = calcJohariWindow(session, mediasDisc);
    const gapAnalysis = calcGapAnalysis(session, mediasDisc);
    const porRelacao = calcPorRelacao(respostas);
    const qualitativo = aggregateQualitative(respostas);

    return jsonResponse({
      ok: true,
      avaliado: {
        nome: session.nome,
        email: session.email,
        perfilPrimario: session.perfilPrimario,
        scoresAuto: {
          D: session.scoreD, I: session.scoreI,
          S: session.scoreS, C: session.scoreC
        }
      },
      totalAvaliacoes: respostas.length,
      mediasDisc, mediasPremium, johari, gapAnalysis,
      porRelacao, qualitativo
    });
  } catch (err) {
    logEvent("ERROR", "getReport360: " + err.message);
    return jsonResponse({ ok: false, error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 🔍 BUSCAS — HELPERS
// ═══════════════════════════════════════════════════════════════════════
// 🆕 Helper interno: monta objeto da sessão a partir de uma linha da planilha
function rowToSession(row, rowIndex) {
  return {
    timestamp: row[0], sessionId: row[1], pin: row[2],
    nome: row[3], email: row[4], whatsapp: row[5],
    scoreD: row[6], scoreI: row[7], scoreS: row[8], scoreC: row[9],
    perfilPrimario: row[10], dataLimite: row[11],
    status: row[12], totalConvidados: row[13],
    // 🆕 Novas colunas (índices 14..17) — podem ser undefined em planilhas antigas
    codigo360: row[14] || "", senhaHash: row[15] || "",
    resetToken: row[16] || "", resetTokenExpira: row[17] || "",
    rowIndex: rowIndex
  };
}

function findSession(sessionId) {
  const sheet = getSpreadsheet().getSheetByName(ABA_AVALIADOS);
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  const idNorm = String(sessionId || "").trim();
  if (!idNorm) return null;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1] || "").trim() === idNorm) {
      return rowToSession(data[i], i + 1);
    }
  }
  return null;
}

// 🆕 NOVO: busca sessão APENAS pelo PIN (mais recente vence)
function findSessionByPin(pin) {
  const sheet = getSpreadsheet().getSheetByName(ABA_AVALIADOS);
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  const pinNorm = String(pin || "").trim();
  if (!pinNorm) return null;

  let found = null;
  for (let i = 1; i < data.length; i++) {
    const rowPin = String(data[i][2] || "").trim();
    if (rowPin === pinNorm) {
      const session = rowToSession(data[i], i + 1);
      if (!found || new Date(session.timestamp) > new Date(found.timestamp)) {
        found = session;
      }
    }
  }
  return found;
}

// 🆕 NOVO: busca sessão pelo Código 360° (DISC-XXXXX)
function findSessionByCodigo(codigo) {
  const sheet = getSpreadsheet().getSheetByName(ABA_AVALIADOS);
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  const codigoNorm = String(codigo || "").trim().toUpperCase();
  if (!codigoNorm) return null;

  let found = null;
  for (let i = 1; i < data.length; i++) {
    const rowCodigo = String(data[i][14] || "").trim().toUpperCase();
    if (rowCodigo === codigoNorm) {
      const session = rowToSession(data[i], i + 1);
      if (!found || new Date(session.timestamp) > new Date(found.timestamp)) {
        found = session;
      }
    }
  }
  return found;
}

// 🆕 NOVO: busca sessão pelo email (mais recente vence) — usado em recuperação de senha
function findSessionByEmail(email) {
  const sheet = getSpreadsheet().getSheetByName(ABA_AVALIADOS);
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  const emailNorm = String(email || "").trim().toLowerCase();
  if (!emailNorm) return null;

  let found = null;
  for (let i = 1; i < data.length; i++) {
    const rowEmail = String(data[i][4] || "").trim().toLowerCase();
    if (rowEmail === emailNorm) {
      const session = rowToSession(data[i], i + 1);
      if (!found || new Date(session.timestamp) > new Date(found.timestamp)) {
        found = session;
      }
    }
  }
  return found;
}

function findSessionByEmailAndPin(email, pin) {
  const sheet = getSpreadsheet().getSheetByName(ABA_AVALIADOS);
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  const emailNorm = String(email || "").trim().toLowerCase();
  const pinNorm = String(pin || "").trim();
  let found = null;
  for (let i = 1; i < data.length; i++) {
    const rowEmail = String(data[i][4] || "").trim().toLowerCase();
    const rowPin = String(data[i][2] || "").trim();
    if (rowEmail === emailNorm && rowPin === pinNorm) {
      const session = rowToSession(data[i], i + 1);
      if (!found || new Date(session.timestamp) > new Date(found.timestamp)) {
        found = session;
      }
    }
  }
  return found;
}

function getAllConvidados(sessionId) {
  const sheet = getSpreadsheet().getSheetByName(ABA_CONVIDADOS);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const idNorm = String(sessionId || "").trim();
  const result = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1] || "").trim() === idNorm) {
      const premium = [];
      for (let p = 12; p < 24; p++) premium.push(data[i][p]);
      result.push({
        timestamp: data[i][0], relacao: data[i][2], tempoConvivencia: data[i][3],
        scoreD: data[i][4], scoreI: data[i][5], scoreS: data[i][6], scoreC: data[i][7],
        pctD: data[i][8], pctI: data[i][9], pctS: data[i][10], pctC: data[i][11],
        premium,
        forcaPrincipal: data[i][24], pontoMelhoria: data[i][25], sugestaoSBI: data[i][26]
      });
    }
  }
  return result;
}

function countConvidados(sessionId) { return getAllConvidados(sessionId).length; }

function incrementConvidadosCount(sessionId) {
  const sheet = getSpreadsheet().getSheetByName(ABA_AVALIADOS);
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  const idNorm = String(sessionId || "").trim();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1] || "").trim() === idNorm) {
      const novo = (data[i][13] || 0) + 1;
      sheet.getRange(i + 1, 14).setValue(novo);
      return;
    }
  }
}

function breakdownByRelation(sessionId) {
  const respostas = getAllConvidados(sessionId);
  const breakdown = {};
  respostas.forEach(r => { breakdown[r.relacao] = (breakdown[r.relacao] || 0) + 1; });
  return breakdown;
}

// ═══════════════════════════════════════════════════════════════════════
// 🧮 CÁLCULOS DISC
// ═══════════════════════════════════════════════════════════════════════
function calcDiscFromResponses(respostas) {
  // Suporta 24 (convidado) e 48 (avaliado) respostas
  const r = respostas || [];
  const scores = { D: 0, I: 0, S: 0, C: 0 };
  const dims = ["D", "I", "S", "C"];
  for (let i = 0; i < r.length; i++) {
    const dim = dims[i % 4];
    scores[dim] += Number(r[i]) || 0;
  }
  return scores;
}

function calcPercentages(scores) {
  const total = scores.D + scores.I + scores.S + scores.C;
  if (total === 0) return { D: 25, I: 25, S: 25, C: 25 };
  return {
    D: Math.round((scores.D / total) * 100),
    I: Math.round((scores.I / total) * 100),
    S: Math.round((scores.S / total) * 100),
    C: Math.round((scores.C / total) * 100)
  };
}

function calcMediasDisc(respostas) {
  const sum = { D: 0, I: 0, S: 0, C: 0 };
  respostas.forEach(r => {
    sum.D += r.scoreD || 0; sum.I += r.scoreI || 0;
    sum.S += r.scoreS || 0; sum.C += r.scoreC || 0;
  });
  const n = respostas.length || 1;
  return {
    D: Math.round(sum.D / n), I: Math.round(sum.I / n),
    S: Math.round(sum.S / n), C: Math.round(sum.C / n),
    n: respostas.length
  };
}

function calcMediasPremium(respostas) {
  const medias = [];
  for (let i = 0; i < 12; i++) {
    let soma = 0, count = 0;
    respostas.forEach(r => {
      if (r.premium && r.premium[i]) { soma += Number(r.premium[i]); count++; }
    });
    medias.push(count > 0 ? +(soma / count).toFixed(2) : 0);
  }
  return medias;
}

function calcJohariWindow(session, medias) {
  const auto = { D: session.scoreD, I: session.scoreI, S: session.scoreS, C: session.scoreC };
  const result = { aberta: [], cego: [], oculta: [], desconhecido: [] };
  ["D", "I", "S", "C"].forEach(k => {
    const a = auto[k] || 0, m = medias[k] || 0, diff = m - a;
    if (a >= 35 && m >= 35 && Math.abs(diff) <= 8) result.aberta.push(k);
    else if (diff > 8) result.cego.push(k);
    else if (diff < -8) result.oculta.push(k);
    else result.desconhecido.push(k);
  });
  return result;
}

function calcGapAnalysis(session, medias) {
  return {
    D: { auto: session.scoreD, externo: medias.D, gap: medias.D - session.scoreD },
    I: { auto: session.scoreI, externo: medias.I, gap: medias.I - session.scoreI },
    S: { auto: session.scoreS, externo: medias.S, gap: medias.S - session.scoreS },
    C: { auto: session.scoreC, externo: medias.C, gap: medias.C - session.scoreC }
  };
}

function calcPorRelacao(respostas) {
  const grupos = {};
  respostas.forEach(r => {
    if (!grupos[r.relacao]) grupos[r.relacao] = { count: 0, D: 0, I: 0, S: 0, C: 0 };
    grupos[r.relacao].count++;
    grupos[r.relacao].D += r.scoreD; grupos[r.relacao].I += r.scoreI;
    grupos[r.relacao].S += r.scoreS; grupos[r.relacao].C += r.scoreC;
  });
  Object.keys(grupos).forEach(k => {
    const g = grupos[k];
    g.D = Math.round(g.D / g.count); g.I = Math.round(g.I / g.count);
    g.S = Math.round(g.S / g.count); g.C = Math.round(g.C / g.count);
  });
  return grupos;
}

function aggregateQualitative(respostas) {
  return {
    forcas: respostas.map(r => ({ relacao: r.relacao, texto: r.forcaPrincipal })).filter(x => x.texto),
    melhorias: respostas.map(r => ({ relacao: r.relacao, texto: r.pontoMelhoria })).filter(x => x.texto),
    sugestoes: respostas.map(r => ({ relacao: r.relacao, texto: r.sugestaoSBI })).filter(x => x.texto)
  };
}

// ═══════════════════════════════════════════════════════════════════════
// 🔐 GERADORES — IDs E PINs
// ═══════════════════════════════════════════════════════════════════════
function generateSessionId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "DISC-";
  for (let i = 0; i < 6; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
  return id;
}

function generatePin() {
  let pin = "";
  for (let i = 0; i < PIN_LENGTH; i++) pin += Math.floor(Math.random() * 10);
  return pin;
}

// 🆕 Gera código 360° no formato DISC-XXXXX (5 alfanuméricos maiúsculos)
function generateCodigo360() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suf = "";
  for (let i = 0; i < 5; i++) suf += chars.charAt(Math.floor(Math.random() * chars.length));
  return "DISC-" + suf;
}

// 🆕 Hash SHA-256 da senha (com pepper) — armazenamento seguro
function hashSenha(senha) {
  const pepper = "Impulso2026DISC360"; // não é secreto absoluto, mas dificulta rainbow tables
  const raw = String(senha || "") + "|" + pepper;
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  return bytes.map(b => ("0" + (b < 0 ? b + 256 : b).toString(16)).slice(-2)).join("");
}

// 🆕 Gera token de reset de senha (32 caracteres alfanuméricos)
function generateResetToken() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let t = "";
  for (let i = 0; i < 32; i++) t += chars.charAt(Math.floor(Math.random() * chars.length));
  return t;
}

// ═══════════════════════════════════════════════════════════════════════
// 📧 EMAILS
// ═══════════════════════════════════════════════════════════════════════
function sendDiscEmail(payload, sessionId, pin) {
  try {
    const linkConvidado = `${URL_PAGINA_CONVIDADO}?id=${sessionId}`;
    const subject = `🎯 Seu Relatório DISC + Acesso 360° Espelho — ${payload.nome}`;

    const htmlBody = `
<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#f4f9ff;padding:24px;border-radius:14px;">
  <div style="background:linear-gradient(135deg,#0b4aa2,#062b62);padding:24px;border-radius:12px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">Instituto Impulso IE™ de Liderança</h1>
    <p style="color:#cfe6ff;margin:6px 0 0;font-size:13px;letter-spacing:.05em;">A mudança pode acontecer em um instante</p>
  </div>
  <div style="background:#fff;padding:24px;border-radius:12px;margin-top:16px;">
    <h2 style="color:#063b7a;margin:0 0 12px;">Olá, ${payload.nome}! 🎉</h2>
    <p style="color:#334155;line-height:1.6;">Seu <strong>Relatório DISC Premium</strong> está em anexo. Mas isso é só o começo!</p>
    <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border-left:5px solid #d97706;padding:18px;border-radius:10px;margin:20px 0;">
      <h3 style="color:#92400e;margin:0 0 10px;font-size:16px;">✨ NOVO: Acesso ao Impulso DISC 360°</h3>
      <p style="color:#451a03;margin:0;line-height:1.6;font-size:14px;">
        Convide pelo menos <strong>${MIN_AVALIACOES_360} pessoas próximas</strong> (família, amigos, colegas, líderes) para responderem uma versão DISC sobre você. Quando atingir o mínimo, desbloqueará seu <strong>Relatório 360° Espelho</strong> completo!
      </p>
    </div>
    <div style="background:#eff6ff;border:2px solid #0b63ce;border-radius:10px;padding:18px;margin:18px 0;">
      <p style="margin:0 0 8px;color:#063b7a;font-weight:bold;">🔐 Suas credenciais de acesso:</p>
      <p style="margin:4px 0;color:#0f172a;"><strong>E-mail:</strong> ${payload.email}</p>
      <p style="margin:4px 0;color:#0f172a;"><strong>PIN:</strong> <span style="background:#fff;padding:4px 10px;border-radius:6px;font-family:monospace;font-size:18px;letter-spacing:.1em;color:#0b63ce;font-weight:bold;">${pin}</span></p>
      <p style="margin:8px 0 0;font-size:12px;color:#475569;">Guarde esse PIN com segurança. Você precisará dele para acessar seu painel.</p>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <p style="color:#063b7a;font-weight:bold;margin:0 0 12px;">📤 Compartilhe este link com seus convidados:</p>
      <a href="${linkConvidado}" style="display:inline-block;background:linear-gradient(45deg,#0b63ce,#084aa0);color:#fff;padding:14px 24px;border-radius:10px;text-decoration:none;font-weight:bold;">
        🔗 Link para os Convidados
      </a>
      <p style="margin:10px 0 0;font-size:11px;color:#64748b;word-break:break-all;">${linkConvidado}</p>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${URL_PAINEL_AVALIADO}" style="display:inline-block;background:#fff;color:#0b63ce;border:2px solid #0b63ce;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:bold;">
        📊 Acessar Meu Painel 360°
      </a>
    </div>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
    <p style="font-size:13px;color:#64748b;line-height:1.6;">
      <strong>Como funciona:</strong><br>
      1️⃣ Compartilhe o link com pessoas próximas<br>
      2️⃣ Cada uma responde de forma <strong>100% anônima</strong><br>
      3️⃣ Quando atingir ${MIN_AVALIACOES_360}+ respostas, acesse seu painel<br>
      4️⃣ Compare sua autopercepção com os olhares externos<br>
      5️⃣ Gere seu PDF 360° Premium
    </p>
  </div>
  <p style="text-align:center;color:#64748b;font-size:11px;margin-top:16px;">
    Rogério Braga • Especialista em Inteligência Emocional<br>impulsoflow@gmail.com
  </p>
</div>`;

    const attachment = Utilities.newBlob(
      Utilities.base64Decode(payload.pdfBase64),
      "application/pdf",
      payload.pdfFileName || "ImpulsoDisc.pdf"
    );

    GmailApp.sendEmail(payload.email, subject, "", {
      htmlBody, attachments: [attachment],
      name: "Instituto Impulso IE™",
      replyTo: ADMIN_EMAIL
    });

    GmailApp.sendEmail(ADMIN_EMAIL, `[Impulso] Novo DISC: ${payload.nome}`,
      `Nome: ${payload.nome}\nEmail: ${payload.email}\nPerfil: ${payload.perfilPrimario}\nSession: ${sessionId}\nPIN: ${pin}`);

  } catch (err) {
    logEvent("EMAIL_ERROR", err.message);
  }
}

function notifyAvaliadoMinimumReached(session) {
  try {
    const subject = `🎉 ${session.nome}, seu Relatório 360° Espelho está liberado!`;
    const htmlBody = `
<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#f4f9ff;padding:24px;border-radius:14px;">
  <div style="background:linear-gradient(135deg,#10b981,#059669);padding:24px;border-radius:12px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">🎊 Parabéns, ${session.nome}!</h1>
  </div>
  <div style="background:#fff;padding:24px;border-radius:12px;margin-top:16px;">
    <h2 style="color:#063b7a;">Seu Relatório 360° Espelho foi liberado! 🪞</h2>
    <p style="color:#334155;line-height:1.6;">
      Você atingiu <strong>${MIN_AVALIACOES_360} avaliações</strong>! Acesse o painel completo:
    </p>
    <ul style="color:#334155;line-height:1.8;">
      <li>📊 Comparativo DISC: autopercepção × visão externa</li>
      <li>🪟 Pontos Cegos &amp; Evolução (forças, pontos cegos, áreas ocultas)</li>
      <li>📈 Mapa de evolução por dimensão</li>
      <li>💎 Top forças confirmadas pelos seus convidados</li>
      <li>🌱 Oportunidades de crescimento</li>
      <li>💬 Feedback qualitativo agregado</li>
      <li>📄 PDF 360° Premium para download</li>
    </ul>
    <div style="text-align:center;margin:24px 0;">
      <a href="${URL_PAINEL_AVALIADO}" style="display:inline-block;background:linear-gradient(45deg,#0b63ce,#084aa0);color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px;">
        🔓 Acessar Meu Relatório Agora
      </a>
    </div>
    <p style="font-size:12px;color:#64748b;text-align:center;">Use seu e-mail e PIN para entrar.</p>
  </div>
</div>`;

    GmailApp.sendEmail(session.email, subject, "", {
      htmlBody, name: "Instituto Impulso IE™"
    });

    logEvent("MIN_REACHED_NOTIFY", `Session=${session.sessionId}`);
  } catch (err) {
    logEvent("EMAIL_ERROR", "notifyMinReached: " + err.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 🛠️ INFRA — PLANILHAS E LOGS
// ═══════════════════════════════════════════════════════════════════════
function getSpreadsheet() {
  if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID);
  return SpreadsheetApp.getActiveSpreadsheet();
}

function logEvent(type, message) {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(ABA_LOGS);
    if (!sheet) {
      sheet = ss.insertSheet(ABA_LOGS);
      sheet.appendRow(["Timestamp", "Tipo", "Mensagem"]);
    }
    sheet.appendRow([new Date(), type, message]);
  } catch (e) { /* silencioso */ }
}

// ═══════════════════════════════════════════════════════════════════════
// 7.5️⃣ ATIVAR 360° (compartilhamento por LINK ABERTO + WhatsApp)
// ═══════════════════════════════════════════════════════════════════════
function handleAtivar360(payload) {
  try {
    const nome = String(payload.nomeAvaliado || "").trim();
    const email = String(payload.emailAvaliado || "").trim().toLowerCase();
    const pin = String(payload.pin || "").trim();

    if (!nome || !email || !pin) {
      return jsonResponse({ ok: false, error: "Dados obrigatórios ausentes (nome/email/pin)" });
    }

    const sessionId = generateSessionId();
    // 🆕 Gera o código 360° único (DISC-XXXXX); aceita o que o frontend enviou se válido
    const codigoEnviado = String(payload.codigo || "").trim().toUpperCase();
    const codigo360 = /^DISC-[A-Z0-9]{5}$/.test(codigoEnviado) ? codigoEnviado : generateCodigo360();

    create360Session({
      sessionId: sessionId,
      pin: pin,
      codigo360: codigo360,
      nome: nome,
      email: email,
      whatsapp: payload.whatsappAvaliado || "",
      scoreD: Number(payload.scoreD) || 0,
      scoreI: Number(payload.scoreI) || 0,
      scoreS: Number(payload.scoreS) || 0,
      scoreC: Number(payload.scoreC) || 0,
      perfilPrimario: payload.perfilPrimario || ""
    });

    const modo = String(payload.modo || "").trim();
    try {
      sendAtivacao360Email(email, nome, pin, sessionId, codigo360);
    } catch (e) {
      logEvent("EMAIL_ERROR", "ativar_360 confirm: " + e.message);
    }

    try {
      GmailApp.sendEmail(ADMIN_EMAIL,
        `[Impulso] 360° ativado: ${nome}`,
        `Avaliado: ${nome}\nEmail: ${email}\nPIN: ${pin}\nCódigo: ${codigo360}\nSession: ${sessionId}\nModo: ${modo || "padrão"}`);
    } catch (e) { /* silencioso */ }

    logEvent("ATIVAR_360_OK",
      `${nome} | ${email} | ${sessionId} | codigo=${codigo360} | modo=${modo || "padrão"}`);

    return jsonResponse({
      ok: true,
      sessionId: sessionId,
      pin: pin,
      codigo: codigo360,
      // 🆕 Link agora usa o código DISC-XXXXX como identificador público
      linkConvidado: `${URL_PAGINA_CONVIDADO}?codigo=${codigo360}`,
      modo: modo || "padrão"
    });
  } catch (err) {
    logEvent("ERROR", "ativar_360: " + err.message);
    return jsonResponse({ ok: false, error: err.message });
  }
}

function sendAtivacao360Email(email, nome, pin, sessionId, codigo360) {
  // 🆕 Link agora usa o código DISC-XXXXX (mais limpo e fácil de compartilhar)
  const codigo = String(codigo360 || "").trim();
  const linkConvidado = codigo
    ? `${URL_PAGINA_CONVIDADO}?codigo=${codigo}`
    : `${URL_PAGINA_CONVIDADO}?id=${sessionId}&pin=${pin}`;
  const subject = `🚀 Seu Bônus 360° Espelho está ativo — ${nome}`;

  const htmlBody = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f9ff;padding:24px;border-radius:14px;">
  <div style="background:linear-gradient(135deg,#0b4aa2,#062b62);padding:24px;border-radius:12px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">Instituto Impulso IE™ de Liderança</h1>
    <p style="color:#cfe6ff;margin:6px 0 0;font-size:13px;letter-spacing:.05em;">Bônus 360° Espelho ativado</p>
  </div>

  <div style="background:#fff;padding:24px;border-radius:12px;margin-top:14px;">
    <h2 style="color:#063b7a;margin:0 0 12px;">Olá, ${nome}! 🎉</h2>
    <p style="color:#334155;line-height:1.6;font-size:14px;">
      Seu Bônus 360° Espelho foi ativado. Agora é só compartilhar o link abaixo pelo WhatsApp com pelo menos <strong>3 pessoas</strong> que te conhecem (chefes, colegas, família, amigos).
    </p>

    <div style="background:#eff6ff;border:2px solid #0b63ce;border-radius:12px;padding:18px;margin:18px 0;">
      ${codigo ? `<p style="margin:0 0 6px;color:#063b7a;font-weight:bold;font-size:13px;">🆔 Seu Código 360°:</p>
      <p style="margin:0 0 12px;font-family:monospace;font-size:22px;letter-spacing:.12em;color:#0b63ce;font-weight:bold;text-align:center;background:#fff;padding:10px;border-radius:8px;border:1px solid #bfdbfe;">${codigo}</p>` : ""}
      <p style="margin:0 0 8px;color:#063b7a;font-weight:bold;font-size:13px;">🔗 Link para compartilhar:</p>
      <p style="margin:0 0 12px;font-family:monospace;font-size:12px;word-break:break-all;background:#fff;padding:10px;border-radius:8px;border:1px dashed #93c5fd;">${linkConvidado}</p>
      <p style="margin:0;color:#063b7a;font-weight:bold;font-size:13px;">🔐 Seu PIN de acesso ao Dashboard:</p>
      <p style="margin:6px 0 0;font-family:monospace;font-size:24px;letter-spacing:.18em;color:#0b63ce;font-weight:bold;text-align:center;">${pin}</p>
    </div>

    <div style="text-align:center;margin:18px 0;">
      <a href="${URL_PAINEL_AVALIADO}" style="display:inline-block;background:linear-gradient(45deg,#0b63ce,#084aa0);color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:14px;">
        📊 Acessar Meu Dashboard 360°
      </a>
    </div>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:18px 0;">

    <p style="font-size:12px;color:#64748b;line-height:1.55;">
      <strong>Como funciona:</strong><br>
      1️⃣ Envie o link no WhatsApp para 3+ pessoas<br>
      2️⃣ Cada uma responde de forma 100% anônima (~5 min)<br>
      3️⃣ Quando atingir 3+ respostas, libere seu Relatório 360° no Dashboard<br>
      4️⃣ Compare sua autopercepção com o olhar externo<br>
    </p>
  </div>

  <p style="text-align:center;color:#64748b;font-size:11px;margin-top:14px;">
    Rogério Braga • Especialista em Inteligência Emocional<br>${ADMIN_EMAIL}
  </p>
</div>`;

  GmailApp.sendEmail(email, subject, "", {
    htmlBody: htmlBody,
    name: "Instituto Impulso IE™",
    replyTo: ADMIN_EMAIL
  });
}

// ═══════════════════════════════════════════════════════════════════════
// 8️⃣ CONSULTAR DASHBOARD 360°
// ═══════════════════════════════════════════════════════════════════════
function handleConsultar360(payload) {
  try {
    const email = String(payload.email || "").trim().toLowerCase();
    const pin = String(payload.pin || "").trim();

    if (!email || !pin) {
      return jsonResponse({ ok: false, message: "E-mail e PIN são obrigatórios" });
    }

    const session = findSessionByEmailAndPin(email, pin);
    if (!session) {
      logEvent("LOGIN_FAIL", `consultar_360 | Email=${email}`);
      return jsonResponse({ ok: false, message: "E-mail ou PIN inválidos" });
    }

    // 🆕 Verificar se é o PRIMEIRO LOGIN (senhaHash vazia)
    let primeiraSenha = false;
    let tokenPrimeiraSenha = null;
    if (!session.senhaHash || String(session.senhaHash).trim() === "") {
      primeiraSenha = true;
      // Gera um token para a primeira senha (válido por 1 hora)
      t
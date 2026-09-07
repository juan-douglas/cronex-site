/**
 * CRONEX — captura de leads do formulário do site.
 *
 * Aba "Leads":    um registro por envio do formulário (histórico completo).
 * Aba "Contatos": uma linha por pessoa, deduplicada por telefone (ou e-mail),
 *                 com ID fixo CRX-0001, primeiro/último contato e quantas
 *                 vezes a pessoa procurou.
 *
 * O site (js/main.js, função salvarLead) faz um POST
 * application/x-www-form-urlencoded para a URL /exec deste Web App.
 *
 * Instalação e deploy: ver README.md, seção "Planilha de leads".
 */

var ABA_LEADS = 'Leads';
var ABA_CONTATOS = 'Contatos';

var COLUNAS_LEADS = [
  'recebido_em', 'data_cliente', 'nome', 'empresa', 'telefone',
  'email', 'segmento', 'pacote', 'mensagem', 'origem'
];

var COLUNAS_CONTATOS = [
  'id', 'nome', 'empresa', 'telefone', 'email', 'segmento',
  'pacote_interesse', 'primeiro_contato', 'ultimo_contato', 'qtd_contatos', 'origem'
];

var PREFIXO_ID = 'CRX-';

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000); // evita corrida entre dois envios simultâneos
  try {
    var p = (e && e.parameter) ? e.parameter : {};
    var quando = new Date();
    registrarLead_(p, quando);
    atualizarContato_(p, quando);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, erro: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Só para testar no navegador se o Web App está no ar.
function doGet() {
  return json_({ ok: true, servico: 'CRONEX leads', hora: new Date().toISOString() });
}

/* ---------- aba Leads: histórico, uma linha por envio ---------- */
function registrarLead_(p, quando) {
  var aba = obterAba_(ABA_LEADS, COLUNAS_LEADS);
  aba.appendRow([
    quando, p.data || '', p.nome || '', p.empresa || '', p.telefone || '',
    p.email || '', p.segmento || '', p.pacote || '', p.mensagem || '', p.origem || ''
  ]);
}

/* ---------- aba Contatos: uma linha por pessoa ---------- */
function atualizarContato_(p, quando) {
  var chave = soDigitos_(p.telefone) || String(p.email || '').trim().toLowerCase();
  if (!chave) return; // sem telefone nem e-mail não há como deduplicar

  var aba = obterAba_(ABA_CONTATOS, COLUNAS_CONTATOS);
  var dados = aba.getDataRange().getValues(); // linha 0 = cabeçalho
  var linhaAlvo = -1;
  var maiorNumero = 0;

  for (var i = 1; i < dados.length; i++) {
    var num = numeroDoId_(dados[i][0]);
    if (num > maiorNumero) maiorNumero = num;
    var chaveLinha = soDigitos_(dados[i][3]) || String(dados[i][4] || '').trim().toLowerCase();
    if (chaveLinha && chaveLinha === chave) linhaAlvo = i + 1; // 1-based
  }

  if (linhaAlvo === -1) {
    var id = PREFIXO_ID + ('0000' + (maiorNumero + 1)).slice(-4);
    aba.appendRow([
      id, p.nome || '', p.empresa || '', p.telefone || '', p.email || '',
      p.segmento || '', p.pacote || '', quando, quando, 1, p.origem || ''
    ]);
  } else {
    var atual = aba.getRange(linhaAlvo, 1, 1, COLUNAS_CONTATOS.length).getValues()[0];
    var novo = atual.slice();
    if (p.nome)     novo[1] = p.nome;
    if (p.empresa)  novo[2] = p.empresa;
    if (p.telefone) novo[3] = p.telefone;
    if (p.email)    novo[4] = p.email;
    if (p.segmento) novo[5] = p.segmento;
    if (p.pacote)   novo[6] = p.pacote;
    // novo[7] (primeiro_contato) permanece
    novo[8] = quando;                        // ultimo_contato
    novo[9] = (Number(atual[9]) || 0) + 1;   // qtd_contatos
    aba.getRange(linhaAlvo, 1, 1, COLUNAS_CONTATOS.length).setValues([novo]);
  }
}

/**
 * Recria a aba "Contatos" a partir de TODO o histórico da aba "Leads".
 * Uso único, para o setup inicial (ou se a aba se perder). Reatribui os IDs.
 * Rodar pelo editor: selecionar "reconstruirContatos" e clicar em Executar.
 */
function reconstruirContatos() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var leads = ss.getSheetByName(ABA_LEADS);
  if (!leads) return;

  var antiga = ss.getSheetByName(ABA_CONTATOS);
  if (antiga) ss.deleteSheet(antiga);
  obterAba_(ABA_CONTATOS, COLUNAS_CONTATOS);

  var dados = leads.getDataRange().getValues();
  for (var i = 1; i < dados.length; i++) {
    var l = dados[i]; // recebido_em, data_cliente, nome, empresa, telefone, email, segmento, pacote, mensagem, origem
    atualizarContato_(
      { nome: l[2], empresa: l[3], telefone: l[4], email: l[5], segmento: l[6], pacote: l[7], origem: l[9] },
      l[0] || new Date()
    );
  }
}

/* ---------- utilitários ---------- */
function obterAba_(nome, colunas) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName(nome) || ss.insertSheet(nome);
  if (aba.getLastRow() === 0) {
    aba.appendRow(colunas);
    aba.setFrozenRows(1);
    aba.getRange(1, 1, 1, colunas.length).setFontWeight('bold');
  }
  return aba;
}

function soDigitos_(v) {
  return String(v == null ? '' : v).replace(/\D/g, '');
}

function numeroDoId_(id) {
  var m = String(id || '').match(/(\d+)\s*$/);
  return m ? parseInt(m[1], 10) : 0;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

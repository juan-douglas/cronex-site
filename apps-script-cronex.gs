/**
 * CRONEX — captura de leads do formulário do site.
 *
 * O site (js/main.js, função salvarLead) faz um POST
 * application/x-www-form-urlencoded para a URL /exec deste Web App.
 * Cada envio vira uma linha na aba "Leads".
 *
 * Instalação: ver README.md, seção "Planilha de leads".
 */

var ABA = 'Leads';

// Ordem das colunas na planilha. 'recebido_em' é o carimbo do servidor;
// 'data_cliente' é o horário que o navegador mandou (pode divergir).
var COLUNAS = [
  'recebido_em', 'data_cliente', 'nome', 'empresa', 'telefone',
  'email', 'segmento', 'pacote', 'mensagem', 'origem'
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // evita duas linhas se dois envios caírem juntos
  try {
    var p = (e && e.parameter) ? e.parameter : {};
    var aba = obterAba_();
    aba.appendRow([
      new Date(),
      p.data || '',
      p.nome || '',
      p.empresa || '',
      p.telefone || '',
      p.email || '',
      p.segmento || '',
      p.pacote || '',
      p.mensagem || '',
      p.origem || ''
    ]);
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

function obterAba_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName(ABA) || ss.insertSheet(ABA);
  if (aba.getLastRow() === 0) {
    aba.appendRow(COLUNAS);
    aba.setFrozenRows(1);
    aba.getRange(1, 1, 1, COLUNAS.length).setFontWeight('bold');
  }
  return aba;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

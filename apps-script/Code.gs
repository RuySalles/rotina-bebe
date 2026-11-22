/**
 * RotinaBebe — backend (Google Apps Script ligado a uma Google Planilha).
 *
 * Contrato de persistência (imutável, veja CLAUDE.md):
 *   - aba "eventos": somente adicionar. Editar/apagar = nova linha com substitui_id.
 *   - aba "planos":  somente adicionar. O plano mais recente de cada tipo vale.
 *   - aba "config":  chave/valor.
 * Colunas novas só entram no FINAL de cada aba. O código lê as colunas pelo nome
 * do cabeçalho, então colunas extras não quebram nada.
 */

/**
 * Versão deste código. SUBA O NÚMERO a cada mudança no Code.gs (e atualize VERSAO_BACKEND_ESPERADA no
 * js/store.js). O app mostra em Ajustes qual versão está publicada, para conferir se a republicação pegou.
 * Histórico: 4 = fase 4 (lote e leitura incremental). Antes disso não havia número.
 */
var VERSAO_BACKEND = 4;

var ABAS = {
  eventos: ['id', 'tipo', 'horario', 'dados', 'quem', 'criado_em', 'apagado', 'substitui_id', 'schema_version'],
  planos: ['id', 'tipo', 'horarios', 'ativo', 'criado_em'],
  config: ['chave', 'valor']
};

var CONFIG_PADRAO = {
  nome_bebe: '',
  febre_limite_c: '37.8',
  tylenol_max_24h: ''
};

// ---------------------------------------------------------------------------
// Web App
// ---------------------------------------------------------------------------

/**
 * Leitura. Sem parâmetros extras devolve tudo (como sempre).
 * Com "desde" (número da última linha de eventos que o celular já tem), devolve só os eventos
 * das linhas seguintes, com parcial: true. Planos e config vêm sempre completos (são pequenos).
 * "linha_eventos" diz até que linha a aba eventos vai, para o próximo pedido.
 */
function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    validarChave_(p.k);
    return json_(leitura_(p.desde));
  } catch (err) {
    return json_({ ok: false, erro: String(err.message || err) });
  }
}

/**
 * Gravação. Ações: adicionar_evento, adicionar_plano, salvar_config (uma por pedido, como sempre)
 * e lote: payload.itens = [{ acao, payload }, ...], gravados em ordem; cada item tem seu resultado,
 * e um item recusado não impede os outros. Com "desde" no corpo, a resposta já traz a leitura
 * (como o doGet), para o celular não precisar de um segundo pedido.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Chega como text/plain para evitar o preflight de CORS.
    var corpo = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    validarChave_(corpo.k);
    lock.waitLock(20000);
    garantirAbas_();
    var payload = corpo.payload || {};
    if (corpo.acao === 'lote') {
      var idsVistos = {};
      var resultados = (payload.itens || []).map(function (item) {
        try {
          return { ok: true, resultado: gravar_(item && item.acao, (item && item.payload) || {}, idsVistos) };
        } catch (errItem) {
          return { ok: false, erro: String(errItem.message || errItem) };
        }
      });
      var resposta = { ok: true, resultados: resultados, versao_backend: VERSAO_BACKEND };
      if (corpo.desde !== undefined) resposta.leitura = leitura_(corpo.desde);
      return json_(resposta);
    }
    return json_({ ok: true, resultado: gravar_(corpo.acao, payload), versao_backend: VERSAO_BACKEND });
  } catch (err) {
    return json_({ ok: false, erro: String(err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (ignorado) {}
  }
}

function gravar_(acao, payload, idsVistos) {
  switch (acao) {
    case 'adicionar_evento':
      return adicionarSemRepetir_('eventos', payload, idsVistos);
    case 'adicionar_plano':
      return adicionarSemRepetir_('planos', payload, idsVistos);
    case 'salvar_config':
      return salvarConfig_(payload.chave, payload.valor);
    default:
      throw new Error('acao_desconhecida');
  }
}

/** desde: '' ou ausente = tudo; um número = só os eventos depois dessa linha da planilha. */
function leitura_(desde) {
  var ss = planilha_();
  var n = parseInt(desde, 10);
  var parcial = String(desde === undefined || desde === null ? '' : desde) !== '' && isFinite(n) && n >= 1 &&
    !!ss.getSheetByName('eventos') && !!ss.getSheetByName('planos') && !!ss.getSheetByName('config');
  if (!parcial) garantirAbas_();
  var ultima = ss.getSheetByName('eventos').getLastRow();
  var resposta = {
    ok: true,
    eventos: parcial ? lerLinhas_('eventos', n + 1) : lerLinhas_('eventos'),
    planos: lerLinhas_('planos'),
    config: lerConfig_(),
    linha_eventos: ultima,
    versao_backend: VERSAO_BACKEND
  };
  if (parcial) resposta.parcial = true;
  return resposta;
}

// ---------------------------------------------------------------------------
// Funções para rodar pelo editor (SETUP.md)
// ---------------------------------------------------------------------------

/** Gera a chave secreta (uma vez) e mostra no registro de execução. */
function gerarChave() {
  var props = PropertiesService.getScriptProperties();
  var atual = props.getProperty('CHAVE');
  if (atual) {
    Logger.log('A chave já existe: ' + atual);
    return atual;
  }
  var nova = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
  props.setProperty('CHAVE', nova);
  Logger.log('Chave criada: ' + nova);
  return nova;
}

/** Troca a chave. Os links antigos param de funcionar. */
function trocarChave() {
  PropertiesService.getScriptProperties().deleteProperty('CHAVE');
  return gerarChave();
}

/** Cria as abas e os valores padrão de config. Pode rodar quantas vezes quiser. */
function prepararPlanilha() {
  garantirAbas_();
  var config = lerConfig_();
  Object.keys(CONFIG_PADRAO).forEach(function (chave) {
    if (!(chave in config)) salvarConfig_(chave, CONFIG_PADRAO[chave]);
  });
  Logger.log('Planilha pronta.');
}

/**
 * Carrega os dados iniciais do arquivo Seed.gs (que NÃO vai para o GitHub).
 * Idempotente: usa ids fixos, então rodar de novo não duplica nada.
 */
function rodarSeed() {
  prepararPlanilha();
  if (typeof SEED === 'undefined') {
    throw new Error('Crie o arquivo Seed.gs (veja SETUP.md) antes de rodar o seed.');
  }
  var agora = isoAgora_();
  var novos = 0;
  (SEED.planos || []).forEach(function (p) {
    var r = adicionarSemRepetir_('planos', {
      id: p.id, tipo: p.tipo, horarios: JSON.stringify(p.horarios), ativo: 'true', criado_em: agora
    });
    if (r === 'adicionado') novos++;
  });
  (SEED.eventos || []).forEach(function (ev) {
    var r = adicionarSemRepetir_('eventos', {
      id: ev.id, tipo: ev.tipo, horario: ev.horario, dados: JSON.stringify(ev.dados || {}),
      quem: ev.quem || 'Inicial', criado_em: agora, apagado: 'false', substitui_id: '', schema_version: '1'
    });
    if (r === 'adicionado') novos++;
  });
  var config = lerConfig_();
  Object.keys(SEED.config || {}).forEach(function (chave) {
    if (!(chave in config) || config[chave] === '') salvarConfig_(chave, SEED.config[chave]);
  });
  Logger.log('Seed concluído. Linhas novas: ' + novos);
}

// ---------------------------------------------------------------------------
// Internos
// ---------------------------------------------------------------------------

function validarChave_(k) {
  var chave = PropertiesService.getScriptProperties().getProperty('CHAVE');
  if (!chave) throw new Error('chave_nao_configurada');
  if (!k || String(k) !== chave) throw new Error('chave_invalida');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function planilha_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/** Cria abas que faltam e acrescenta, no final, colunas que faltam. Nunca renomeia nem reordena. */
function garantirAbas_() {
  var ss = planilha_();
  Object.keys(ABAS).forEach(function (nome) {
    var colunas = ABAS[nome];
    var aba = ss.getSheetByName(nome);
    if (!aba) {
      aba = ss.insertSheet(nome);
      aba.getRange(1, 1, 1, colunas.length).setNumberFormat('@').setValues([colunas]).setFontWeight('bold');
      aba.setFrozenRows(1);
      return;
    }
    var existentes = cabecalho_(aba);
    var faltando = colunas.filter(function (c) { return existentes.indexOf(c) === -1; });
    if (faltando.length) {
      aba.getRange(1, existentes.length + 1, 1, faltando.length).setNumberFormat('@').setValues([faltando]).setFontWeight('bold');
    }
  });
}

function cabecalho_(aba) {
  var ultima = aba.getLastColumn();
  if (ultima === 0) return [];
  return aba.getRange(1, 1, 1, ultima).getDisplayValues()[0].map(function (c) { return String(c).trim(); });
}

/** Linhas da aba como objetos (pelo cabeçalho). aPartirDe: primeira linha da planilha a ler (padrão 2). */
function lerLinhas_(nome, aPartirDe) {
  var aba = planilha_().getSheetByName(nome);
  var ultimaLinha = aba.getLastRow();
  var inicio = Math.max(2, aPartirDe || 2);
  if (ultimaLinha < inicio) return [];
  var cab = cabecalho_(aba);
  var valores = aba.getRange(inicio, 1, ultimaLinha - inicio + 1, cab.length).getDisplayValues();
  return valores
    .filter(function (linha) { return linha.join('') !== ''; })
    .map(function (linha) {
      var obj = {};
      cab.forEach(function (c, i) { if (c) obj[c] = linha[i]; });
      return obj;
    });
}

/**
 * Acrescenta uma linha, ignorando se o id já existe (reenvio da fila offline).
 * idsVistos (opcional, usado no lote): guarda os ids de cada aba já lidos neste pedido, para não reler a coluna.
 */
function adicionarSemRepetir_(nome, payload, idsVistos) {
  if (!payload || !payload.id) throw new Error('id_obrigatorio');
  var aba = planilha_().getSheetByName(nome);
  var cab = cabecalho_(aba);
  var colId = cab.indexOf('id') + 1;
  var ultimaLinha = aba.getLastRow();
  var ids = idsVistos && idsVistos[nome];
  if (!ids) {
    ids = {};
    if (ultimaLinha >= 2) {
      aba.getRange(2, colId, ultimaLinha - 1, 1).getDisplayValues().forEach(function (l) { ids[l[0]] = true; });
    }
    if (idsVistos) idsVistos[nome] = ids;
  }
  if (ids[String(payload.id)]) return 'ja_existia';
  var linha = cab.map(function (c) {
    var v = payload[c];
    if (v === undefined || v === null) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  });
  aba.getRange(ultimaLinha + 1, 1, 1, cab.length).setNumberFormat('@').setValues([linha]);
  ids[String(payload.id)] = true;
  return 'adicionado';
}

function lerConfig_() {
  var config = {};
  lerLinhas_('config').forEach(function (l) { if (l.chave) config[l.chave] = l.valor; });
  return config;
}

function salvarConfig_(chave, valor) {
  if (!chave) throw new Error('chave_config_obrigatoria');
  var aba = planilha_().getSheetByName('config');
  var ultimaLinha = aba.getLastRow();
  var texto = valor === undefined || valor === null ? '' : String(valor);
  if (ultimaLinha >= 2) {
    var chaves = aba.getRange(2, 1, ultimaLinha - 1, 1).getDisplayValues();
    for (var i = 0; i < chaves.length; i++) {
      if (chaves[i][0] === chave) {
        aba.getRange(i + 2, 2).setNumberFormat('@').setValue(texto);
        return 'atualizado';
      }
    }
  }
  aba.getRange(ultimaLinha + 1, 1, 1, 2).setNumberFormat('@').setValues([[chave, texto]]);
  return 'adicionado';
}

function isoAgora_() {
  return Utilities.formatDate(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX");
}

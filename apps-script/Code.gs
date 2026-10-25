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

function doGet(e) {
  try {
    validarChave_(e && e.parameter && e.parameter.k);
    garantirAbas_();
    return json_({
      ok: true,
      eventos: lerLinhas_('eventos'),
      planos: lerLinhas_('planos'),
      config: lerConfig_()
    });
  } catch (err) {
    return json_({ ok: false, erro: String(err.message || err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Chega como text/plain para evitar o preflight de CORS.
    var corpo = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    validarChave_(corpo.k);
    lock.waitLock(20000);
    garantirAbas_();
    var payload = corpo.payload || {};
    var resultado;
    switch (corpo.acao) {
      case 'adicionar_evento':
        resultado = adicionarSemRepetir_('eventos', payload);
        break;
      case 'adicionar_plano':
        resultado = adicionarSemRepetir_('planos', payload);
        break;
      case 'salvar_config':
        resultado = salvarConfig_(payload.chave, payload.valor);
        break;
      default:
        throw new Error('acao_desconhecida');
    }
    return json_({ ok: true, resultado: resultado });
  } catch (err) {
    return json_({ ok: false, erro: String(err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (ignorado) {}
  }
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

function lerLinhas_(nome) {
  var aba = planilha_().getSheetByName(nome);
  var ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return [];
  var cab = cabecalho_(aba);
  var valores = aba.getRange(2, 1, ultimaLinha - 1, cab.length).getDisplayValues();
  return valores
    .filter(function (linha) { return linha.join('') !== ''; })
    .map(function (linha) {
      var obj = {};
      cab.forEach(function (c, i) { if (c) obj[c] = linha[i]; });
      return obj;
    });
}

/** Acrescenta uma linha, ignorando se o id já existe (reenvio da fila offline). */
function adicionarSemRepetir_(nome, payload) {
  if (!payload || !payload.id) throw new Error('id_obrigatorio');
  var aba = planilha_().getSheetByName(nome);
  var cab = cabecalho_(aba);
  var colId = cab.indexOf('id') + 1;
  var ultimaLinha = aba.getLastRow();
  if (ultimaLinha >= 2) {
    var ids = aba.getRange(2, colId, ultimaLinha - 1, 1).getDisplayValues();
    for (var i = 0; i < ids.length; i++) {
      if (ids[i][0] === String(payload.id)) return 'ja_existia';
    }
  }
  var linha = cab.map(function (c) {
    var v = payload[c];
    if (v === undefined || v === null) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  });
  aba.getRange(ultimaLinha + 1, 1, 1, cab.length).setNumberFormat('@').setValues([linha]);
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

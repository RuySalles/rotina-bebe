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
 * Histórico: 4 = fase 4 (lote e leitura incremental); 5 = fase 10 (lembretes no Google Agenda);
 * 6 = fase 15 (lembrete da próxima dose de vacina no Google Agenda);
 * 7 = fase 16 (lembrete das consultas marcadas no Google Agenda);
 * 8 = fase 24 (carimbo: "sem mudança" sem abrir a planilha; conferência por impressão digital em vez de carga completa);
 * 9 = fase 25 (busca do id pela planilha, cabeçalhos lidos uma vez por pedido, abas conferidas uma vez por versão);
 * 10 = correção da fase 24: o carimbo vai no parâmetro "carimbo" ("c" é reservado pelo Google e derrubava o pedido).
 * Antes disso não havia número.
 */
var VERSAO_BACKEND = 10;

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
 * Versão 8 (fase 24), parâmetros opcionais que o app antigo não manda (sem eles, tudo como antes):
 *   carimbo = carimbo que o celular já tem: se ninguém gravou nada desde então, a resposta é só
 *       { sem_mudanca: true }, sem nem abrir a planilha. (Na versão 8 e 9 era "c", mas o Google reserva os nomes
 *       "c" e "sid" nos Web Apps e recusa o pedido antes de chegar aqui. Nunca use esses nomes de parâmetro.)
 *   h = impressão digital (SHA-256 do JSON) dos eventos que o celular tem até a linha "desde": se bater, a resposta é
 *       a parcial com conferido: true; se não bater (mexeram direto na planilha), vem tudo, como na carga completa.
 * Toda resposta de leitura traz "carimbo".
 */
function doGet(e) {
  try {
    CABECALHOS_ = {};
    var p = (e && e.parameter) || {};
    validarChave_(p.k);
    return json_(leitura_(p.desde, { c: p.carimbo, h: p.h }));
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
  CABECALHOS_ = {};
  try {
    // Chega como text/plain para evitar o preflight de CORS.
    var corpo = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    validarChave_(corpo.k);
    lock.waitLock(20000);
    garantirAbas_();
    var payload = corpo.payload || {};
    var agenda = { tipos: {}, tudo: false };
    if (corpo.acao === 'lote') {
      // Lote grande (muitos registros feitos sem internet): lê a coluna de ids uma vez em vez de buscar um por um.
      var idsVistos = { _lerColuna: (payload.itens || []).length > 5 };
      var resultados = (payload.itens || []).map(function (item) {
        try {
          var r = gravar_(item && item.acao, (item && item.payload) || {}, idsVistos);
          anotarAgenda_(agenda, item && item.acao, (item && item.payload) || {}, r);
          return { ok: true, resultado: r };
        } catch (errItem) {
          return { ok: false, erro: String(errItem.message || errItem) };
        }
      });
      atualizarAgenda_(agenda);
      if (resultados.some(function (r) { return r.ok && r.resultado !== 'ja_existia'; })) novoCarimbo_();
      var resposta = { ok: true, resultados: resultados, versao_backend: VERSAO_BACKEND };
      if (corpo.desde !== undefined) resposta.leitura = leitura_(corpo.desde, { h: corpo.h });
      return json_(resposta);
    }
    var resultado = gravar_(corpo.acao, payload);
    anotarAgenda_(agenda, corpo.acao, payload, resultado);
    atualizarAgenda_(agenda);
    if (resultado !== 'ja_existia') novoCarimbo_();
    return json_({ ok: true, resultado: resultado, versao_backend: VERSAO_BACKEND });
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

/**
 * desde: '' ou ausente = tudo; um número = só os eventos depois dessa linha da planilha.
 * extra.c (carimbo) e extra.h (impressão digital): veja o doGet.
 */
function leitura_(desde, extra) {
  extra = extra || {};
  var n = parseInt(desde, 10);
  var temDesde = String(desde === undefined || desde === null ? '' : desde) !== '' && isFinite(n) && n >= 1;
  var carimbo = carimbo_();
  // Ninguém gravou nada desde o último pedido deste celular: responde sem abrir a planilha.
  if (temDesde && !extra.h && extra.c && String(extra.c) === carimbo) {
    return { ok: true, sem_mudanca: true, carimbo: carimbo, versao_backend: VERSAO_BACKEND };
  }
  var ss = planilha_();
  var parcial = temDesde &&
    !!ss.getSheetByName('eventos') && !!ss.getSheetByName('planos') && !!ss.getSheetByName('config');
  var conferido = false;
  if (parcial && extra.h) {
    // Conferência: os eventos até a linha "desde" são os mesmos que o celular tem?
    conferido = digital_(JSON.stringify(lerLinhas_('eventos', 2, n))) === String(extra.h);
    if (!conferido) parcial = false;
  }
  if (!parcial) garantirAbas_();
  var ultima = ss.getSheetByName('eventos').getLastRow();
  var resposta = {
    ok: true,
    eventos: parcial ? lerLinhas_('eventos', n + 1) : lerLinhas_('eventos'),
    planos: lerLinhas_('planos'),
    config: lerConfig_(),
    linha_eventos: ultima,
    versao_backend: VERSAO_BACKEND,
    agenda: situacaoAgenda_(),
    carimbo: carimbo
  };
  if (parcial) resposta.parcial = true;
  if (conferido) resposta.conferido = true;
  return resposta;
}

/**
 * Carimbo: muda a cada gravação (e quando os lembretes da agenda são refeitos). Fica nas propriedades do script,
 * que são lidas sem abrir a planilha. Uma edição feita direto na planilha não muda o carimbo: ela aparece na
 * conferência que o app faz ao abrir e a cada 10 minutos.
 */
function carimbo_() {
  var props = PropertiesService.getScriptProperties();
  return props.getProperty('CARIMBO') || novoCarimbo_();
}

function novoCarimbo_() {
  var c = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
  PropertiesService.getScriptProperties().setProperty('CARIMBO', c);
  return c;
}

/** SHA-256 do texto (UTF-8) em hexadecimal: a mesma conta que o app faz com crypto.subtle. */
function digital_(texto) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, texto, Utilities.Charset.UTF_8)
    .map(function (b) { return ((b + 256) % 256).toString(16); })
    .map(function (x) { return x.length < 2 ? '0' + x : x; })
    .join('');
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
  garantirAbas_(true);
  var config = lerConfig_();
  Object.keys(CONFIG_PADRAO).forEach(function (chave) {
    if (!(chave in config)) salvarConfig_(chave, CONFIG_PADRAO[chave]);
  });
  novoCarimbo_();
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
  novoCarimbo_();
  Logger.log('Seed concluído. Linhas novas: ' + novos);
}

/**
 * Refaz os lembretes da agenda "Rotina do bebê" a partir dos planos ativos e das próximas doses de vacina.
 * Rode uma vez pelo editor depois de colar o código novo e ANTES de republicar: é assim que o Google pede a
 * autorização da Agenda (veja o SETUP.md). Pode rodar quantas vezes quiser: só cria o que falta e remove o que sobrou.
 */
function sincronizarAgenda() {
  garantirAbas_();
  atualizarAgenda_({ tipos: {}, tudo: true });
  Logger.log('Agenda: ' + JSON.stringify(situacaoAgenda_()));
}

// ---------------------------------------------------------------------------
// Agenda do Google (fase 10): lembretes dos planos de horário
// ---------------------------------------------------------------------------
//
// Cada horário futuro de um plano ativo vira um evento curto na agenda própria "Rotina do bebê", com aviso na hora.
// O evento guarda o tipo e o horário em tags, para o script saber quais são dele. Só mexe em eventos futuros: os que
// já passaram ficam como estão. Qualquer falha aqui NUNCA impede a gravação na planilha; o resultado fica na
// propriedade AGENDA_STATUS e o app mostra em Ajustes.

var AGENDA_NOME = 'Rotina do bebê';
var AGENDA_DURACAO_MIN = 10;
var AGENDA_DIAS = 400;
var AGENDA_CONFIG = ['remedios', 'amoxicilina_dose_ml']; // mudam o título (ou a existência) dos lembretes

/** Marca o que precisa ser refeito na agenda depois de uma gravação. */
function anotarAgenda_(agenda, acao, payload, resultado) {
  if (acao === 'adicionar_plano' && resultado === 'adicionado' && payload.tipo) agenda.tipos[String(payload.tipo)] = true;
  if (acao === 'salvar_config' && AGENDA_CONFIG.indexOf(String(payload.chave)) !== -1) agenda.tudo = true;
  // Vacina registrada, corrigida ou apagada: refaz os lembretes de próxima dose.
  if (acao === 'adicionar_evento' && resultado === 'adicionado' && String(payload.tipo) === 'vacina') agenda.tipos.vacina = true;
  // Consulta marcada, mudada ou apagada: refaz os lembretes das consultas.
  if (acao === 'adicionar_evento' && resultado === 'adicionado' && String(payload.tipo) === 'consulta') agenda.tipos.consulta = true;
}

function atualizarAgenda_(agenda) {
  if (!agenda.tudo && !Object.keys(agenda.tipos).length) return;
  var props = PropertiesService.getScriptProperties();
  try {
    var planos = planosAtuais_();
    var tipos = agenda.tudo ? Object.keys(planos) : Object.keys(agenda.tipos);
    var agendaG = obterAgenda_();
    var agora = new Date();
    var existentes = eventosDoApp_(agendaG, agora);
    if (agenda.tudo) {
      if (tipos.indexOf('vacina') === -1) tipos.push('vacina');
      if (tipos.indexOf('consulta') === -1) tipos.push('consulta');
      // Também limpa tipos que têm lembrete e hoje não têm mais plano.
      existentes.forEach(function (ev) {
        var t = ev.getTag('rb_tipo');
        if (tipos.indexOf(t) === -1) tipos.push(t);
      });
    }
    var config = lerConfig_();
    tipos.forEach(function (tipo) {
      if (tipo === 'vacina') sincronizarVacinas_(agendaG, existentes, agora);
      else if (tipo === 'consulta') sincronizarConsultas_(agendaG, existentes, agora);
      else sincronizarTipo_(agendaG, tipo, planos[tipo] || [], existentes, config, agora);
    });
    gravarSituacaoAgenda_(props, agendaG);
  } catch (err) {
    var anterior = lerSituacaoAgenda_(props);
    anterior.ok = false;
    anterior.erro = String(err.message || err).slice(0, 200);
    anterior.quando = isoAgora_();
    props.setProperty('AGENDA_STATUS', JSON.stringify(anterior));
  }
  novoCarimbo_(); // a situação da agenda (que o app mostra em Ajustes) mudou
}

/** Eventos futuros criados por este script (têm a tag rb_tipo). */
function eventosDoApp_(agendaG, agora) {
  var fim = new Date(agora.getTime() + AGENDA_DIAS * 24 * 3600 * 1000);
  // getEvents também traz o que está acontecendo agora; esse fica como está (já começou).
  return agendaG.getEvents(agora, fim).filter(function (ev) {
    return !!ev.getTag('rb_tipo') && ev.getStartTime().getTime() > agora.getTime();
  });
}

/** Deixa na agenda exatamente os horários futuros do plano do tipo, com o título atual. */
function sincronizarTipo_(agendaG, tipo, horarios, existentes, config, agora) {
  var titulo = tituloLembrete_(tipo, config);
  var futuros = titulo ? horarios.filter(function (t) { return t > agora.getTime(); }) : [];
  var faltam = {};
  futuros.forEach(function (t) { faltam[String(t)] = true; });
  existentes.forEach(function (ev) {
    if (ev.getTag('rb_tipo') !== tipo) return;
    var chave = ev.getTag('rb_horario');
    if (faltam[chave] && ev.getTitle() === titulo) delete faltam[chave]; // já está certo
    else ev.deleteEvent();
  });
  futuros.forEach(function (t) {
    if (!faltam[String(t)]) return;
    var ev = agendaG.createEvent(titulo, new Date(t), new Date(t + AGENDA_DURACAO_MIN * 60000), {
      description: 'Dose ' + (horarios.indexOf(t) + 1) + ' de ' + horarios.length + '. Registre no app quando der.\n' +
        'Lembrete criado pelo app Rotina do bebê: muda sozinho quando o plano muda.'
    });
    ev.setTag('rb_tipo', tipo);
    ev.setTag('rb_horario', String(t));
    ev.removeAllReminders();
    ev.addPopupReminder(0);
  });
}

/** Título do lembrete; '' se o remédio não existe mais ou foi encerrado (aí os lembretes saem). */
function tituloLembrete_(tipo, config) {
  var nome = '';
  var dose = '';
  if (tipo === 'amoxicilina') {
    nome = 'Amoxicilina';
    var ml = String(config.amoxicilina_dose_ml || '').trim();
    if (ml) dose = ml.replace('.', ',') + ' mL';
  } else if (tipo.indexOf('remedio_') === 0) {
    var lista = [];
    try { lista = JSON.parse(config.remedios || '[]'); } catch (ignorado) {}
    var id = tipo.slice('remedio_'.length);
    var r = (Array.isArray(lista) ? lista : []).filter(function (x) { return x && String(x.id) === id; })[0];
    if (!r || r.ativo === false || !String(r.nome || '').trim()) return '';
    nome = String(r.nome).trim();
    dose = String(r.dose || '').trim();
  } else {
    return '';
  }
  return '💊 ' + nome + (dose ? ' · ' + dose : '');
}

// ---------------------------------------------------------------------------
// Próxima dose de vacina (fase 15): lembrete de dia inteiro, com aviso na véspera às 9h.
// Mesma regra do app (js/tipos/vacina.js → pendentes): a próxima dose anotada num registro está cumprida quando há
// um registro de vacina com o mesmo nome (sem acento/maiúscula) feito depois dele. Só datas a partir de amanhã.
// ---------------------------------------------------------------------------

var VACINA_AVISO_MIN = 15 * 60; // eventos de dia inteiro começam à meia-noite: 15h antes = 9h da véspera

function sincronizarVacinas_(agendaG, existentes, agora) {
  var hoje = Utilities.formatDate(agora, 'America/Sao_Paulo', 'yyyy-MM-dd');
  var faltam = {};
  vacinasPendentes_().forEach(function (p) { if (p.data > hoje) faltam[p.chave] = p; });
  existentes.forEach(function (ev) {
    if (ev.getTag('rb_tipo') !== 'vacina') return;
    var p = faltam[ev.getTag('rb_horario')];
    if (p && ev.getTitle() === p.titulo) delete faltam[p.chave]; // já está certo
    else ev.deleteEvent();
  });
  Object.keys(faltam).forEach(function (chave) {
    var p = faltam[chave];
    // Meio-dia de São Paulo: cai no mesmo dia em qualquer fuso do script.
    var dia = new Date(Date.parse(p.data + 'T12:00:00-03:00'));
    var ev = agendaG.createAllDayEvent(p.titulo, dia, {
      description: 'Próxima dose anotada da caderneta. Registre a vacina no app quando tomar.\n' +
        'Lembrete criado pelo app Rotina do bebê: some sozinho quando a vacina é registrada.'
    });
    ev.setTag('rb_tipo', 'vacina');
    ev.setTag('rb_horario', chave);
    ev.removeAllReminders();
    ev.addPopupReminder(VACINA_AVISO_MIN);
  });
}

function normalizarVacina_(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** [{ chave, data, titulo }] das próximas doses anotadas e ainda não tomadas (qualquer data). */
function vacinasPendentes_() {
  var vacinas = vacinasAtuais_();
  var seguinte = { '1ª': '2ª dose', '2ª': '3ª dose', '3ª': 'reforço' };
  return vacinas
    .filter(function (e) { return /^\d{4}-\d{2}-\d{2}$/.test(String(e.dados.proxima || '')); })
    .filter(function (e) {
      var nome = normalizarVacina_(e.dados.vacina);
      return !vacinas.some(function (v) { return v.t > e.t && normalizarVacina_(v.dados.vacina) === nome; });
    })
    .map(function (e) {
      var nome = String(e.dados.vacina || '').trim() || 'Vacina';
      var dose = seguinte[e.dados.dose] || '';
      return {
        chave: e.dados.proxima + '|' + normalizarVacina_(nome),
        data: e.dados.proxima,
        titulo: '💉 ' + nome + (dose ? ' · ' + dose : '')
      };
    });
}

function vacinasAtuais_() { return eventosAtuais_('vacina'); }

// ---------------------------------------------------------------------------
// Consultas marcadas (fase 16): evento de 1 hora na hora da consulta, com aviso na véspera e 2 horas antes.
// Mudou a hora, o motivo ou o local, ou apagou: o lembrete muda ou some. Só consultas futuras.
// ---------------------------------------------------------------------------

var CONSULTA_DURACAO_MIN = 60;
var CONSULTA_AVISOS_MIN = [24 * 60, 2 * 60];

function sincronizarConsultas_(agendaG, existentes, agora) {
  var faltam = {};
  eventosAtuais_('consulta').forEach(function (e) {
    if (e.t <= agora.getTime()) return;
    var motivo = String(e.dados.motivo || '').trim() || 'Consulta';
    var local = String(e.dados.local || '').trim();
    var titulo = '🩺 ' + motivo + (local ? ' · ' + local : '');
    faltam[String(e.t) + '|' + titulo] = { t: e.t, titulo: titulo, local: local };
  });
  existentes.forEach(function (ev) {
    if (ev.getTag('rb_tipo') !== 'consulta') return;
    var chave = ev.getTag('rb_horario');
    if (faltam[chave]) delete faltam[chave]; // já está certo
    else ev.deleteEvent();
  });
  Object.keys(faltam).forEach(function (chave) {
    var c = faltam[chave];
    var ev = agendaG.createEvent(c.titulo, new Date(c.t), new Date(c.t + CONSULTA_DURACAO_MIN * 60000), {
      location: c.local,
      description: 'Consulta marcada no app. Depois dela, abra no app para anotar o que o médico disse.\n' +
        'Lembrete criado pelo app Rotina do bebê: muda sozinho quando a consulta muda.'
    });
    ev.setTag('rb_tipo', 'consulta');
    ev.setTag('rb_horario', chave);
    ev.removeAllReminders();
    CONSULTA_AVISOS_MIN.forEach(function (m) { ev.addPopupReminder(m); });
  });
}

/**
 * Registros de um tipo valendo hoje: aplica edições e exclusões como o resolverEventos do app (vale a versão mais
 * funda de cada cadeia de substitui_id; empate: a criada por último; se ela estiver apagada, some).
 * → [{ t, dados }]
 */
function eventosAtuais_(tipo) {
  var linhas = lerLinhas_('eventos').filter(function (l) { return l.tipo === tipo && l.id; });
  var porId = {};
  linhas.forEach(function (l) { porId[l.id] = l; });
  var grupos = {};
  linhas.forEach(function (l) {
    var atual = l, prof = 0, raiz = l.id, visto = {};
    while (atual.substitui_id && !visto[atual.id]) {
      visto[atual.id] = true;
      prof++;
      var anterior = porId[atual.substitui_id];
      if (!anterior) { raiz = atual.substitui_id; break; }
      atual = anterior;
      raiz = atual.id;
    }
    var cand = { linha: l, prof: prof, criado: Date.parse(l.criado_em) || 0 };
    var v = grupos[raiz];
    if (!v || cand.prof > v.prof || (cand.prof === v.prof && (cand.criado > v.criado || (cand.criado === v.criado && l.id > v.linha.id)))) {
      grupos[raiz] = cand;
    }
  });
  return Object.keys(grupos).map(function (k) { return grupos[k].linha; })
    .filter(function (l) { return String(l.apagado).trim().toLowerCase() !== 'true'; })
    .map(function (l) {
      var dados = {};
      try { dados = JSON.parse(l.dados || '{}') || {}; } catch (ignorado) {}
      return { t: Date.parse(l.horario), dados: dados };
    })
    .filter(function (e) { return isFinite(e.t); });
}

/** Planos ativos: { tipo: [ms...] }. Mesma regra do app (resolverPlanos): vale a linha mais recente de cada tipo. */
function planosAtuais_() {
  var ultimo = {};
  lerLinhas_('planos').forEach(function (l, i) {
    var criado = Date.parse(l.criado_em) || 0;
    var atual = ultimo[l.tipo];
    if (!atual || criado > atual.criado || (criado === atual.criado && i > atual.i)) ultimo[l.tipo] = { l: l, criado: criado, i: i };
  });
  var planos = {};
  Object.keys(ultimo).forEach(function (tipo) {
    var l = ultimo[tipo].l;
    if (String(l.ativo).trim().toLowerCase() !== 'true') return;
    var lista = [];
    try { lista = JSON.parse(l.horarios || '[]'); } catch (ignorado) {}
    planos[tipo] = (Array.isArray(lista) ? lista : [])
      .map(function (h) { return typeof h === 'number' ? h : Date.parse(h); })
      .filter(function (t) { return isFinite(t); })
      .sort(function (a, b) { return a - b; });
  });
  return planos;
}

function obterAgenda_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('AGENDA_ID');
  var agendaG = id ? CalendarApp.getCalendarById(id) : null;
  if (!agendaG) {
    agendaG = CalendarApp.createCalendar(AGENDA_NOME, {
      timeZone: 'America/Sao_Paulo',
      color: CalendarApp.Color.TEAL,
      summary: 'Lembretes dos planos de horário do app Rotina do bebê. Não edite à mão: o app refaz sozinho.'
    });
    props.setProperty('AGENDA_ID', agendaG.getId());
  }
  return agendaG;
}

function lerSituacaoAgenda_(props) {
  try { return JSON.parse(props.getProperty('AGENDA_STATUS') || '{}') || {}; } catch (e) { return {}; }
}

function gravarSituacaoAgenda_(props, agendaG) {
  var inicios = eventosDoApp_(agendaG, new Date())
    .map(function (ev) { return ev.getStartTime().getTime(); })
    .sort(function (a, b) { return a - b; });
  props.setProperty('AGENDA_STATUS', JSON.stringify({
    ok: true,
    lembretes: inicios.length,
    proximo: inicios.length ? Utilities.formatDate(new Date(inicios[0]), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX") : '',
    quando: isoAgora_()
  }));
}

/** Para o app: { ok, lembretes, proximo, quando, erro? } ou null se a agenda nunca foi usada. */
function situacaoAgenda_() {
  var s = lerSituacaoAgenda_(PropertiesService.getScriptProperties());
  return s.quando ? s : null;
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

/**
 * Cria abas que faltam e acrescenta, no final, colunas que faltam. Nunca renomeia nem reordena.
 * Fase 25: depois de conferir uma vez as colunas desta versão (propriedade ABAS_OK), só confere se as abas existem,
 * sem reler os cabeçalhos a cada pedido. forcar: confere tudo (prepararPlanilha).
 */
function garantirAbas_(forcar) {
  var ss = planilha_();
  var props = PropertiesService.getScriptProperties();
  var assinatura = JSON.stringify(ABAS);
  if (!forcar && props.getProperty('ABAS_OK') === assinatura &&
      Object.keys(ABAS).every(function (nome) { return !!ss.getSheetByName(nome); })) return;
  Object.keys(ABAS).forEach(function (nome) {
    var colunas = ABAS[nome];
    var aba = ss.getSheetByName(nome);
    delete CABECALHOS_[nome];
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
  CABECALHOS_ = {};
  props.setProperty('ABAS_OK', assinatura);
}

// Cabeçalhos já lidos neste pedido (fase 25): cada aba é lida uma vez só. Zerado no início do doGet e do doPost.
var CABECALHOS_ = {};

/** Nomes das colunas. nome (opcional): guarda para os próximos usos neste pedido. */
function cabecalho_(aba, nome) {
  if (nome && CABECALHOS_[nome]) return CABECALHOS_[nome];
  var ultima = aba.getLastColumn();
  var cab = ultima === 0 ? [] : aba.getRange(1, 1, 1, ultima).getDisplayValues()[0].map(function (c) { return String(c).trim(); });
  if (nome) CABECALHOS_[nome] = cab;
  return cab;
}

/**
 * Linhas da aba como objetos (pelo cabeçalho). aPartirDe: primeira linha da planilha a ler (padrão 2);
 * ate (opcional): última linha a ler.
 */
function lerLinhas_(nome, aPartirDe, ate) {
  var aba = planilha_().getSheetByName(nome);
  var ultimaLinha = aba.getLastRow();
  if (ate) ultimaLinha = Math.min(ultimaLinha, ate);
  var inicio = Math.max(2, aPartirDe || 2);
  if (ultimaLinha < inicio) return [];
  var cab = cabecalho_(aba, nome);
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
 * idsVistos (opcional, usado no lote): ids de cada aba já conferidos ou gravados neste pedido.
 * Fase 25: o id é procurado com a busca da própria planilha (não precisa trazer a coluna inteira, que só cresce).
 * Num lote grande (idsVistos._lerColuna, ex. muitos registros feitos sem internet), lê a coluna uma vez só, como antes.
 */
function adicionarSemRepetir_(nome, payload, idsVistos) {
  if (!payload || !payload.id) throw new Error('id_obrigatorio');
  var aba = planilha_().getSheetByName(nome);
  var cab = cabecalho_(aba, nome);
  var colId = cab.indexOf('id') + 1;
  var ultimaLinha = aba.getLastRow();
  var id = String(payload.id);
  var ids = (idsVistos && idsVistos[nome]) || {};
  if (idsVistos) idsVistos[nome] = ids;
  if (idsVistos && idsVistos._lerColuna && !ids._colunaLida) {
    if (ultimaLinha >= 2) {
      aba.getRange(2, colId, ultimaLinha - 1, 1).getDisplayValues().forEach(function (l) { ids[l[0]] = true; });
    }
    ids._colunaLida = true;
  }
  if (ids[id]) return 'ja_existia';
  if (!ids._colunaLida && ultimaLinha >= 2 &&
      aba.getRange(2, colId, ultimaLinha - 1, 1).createTextFinder(id).matchCase(true).matchEntireCell(true).findNext()) {
    ids[id] = true;
    return 'ja_existia';
  }
  var linha = cab.map(function (c) {
    var v = payload[c];
    if (v === undefined || v === null) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  });
  aba.getRange(ultimaLinha + 1, 1, 1, cab.length).setNumberFormat('@').setValues([linha]);
  ids[id] = true;
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

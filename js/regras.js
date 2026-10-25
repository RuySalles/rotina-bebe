// Cálculos puros: tempo, leitura das linhas da planilha, janelas, planos e agenda.
// Nada aqui toca em DOM, localStorage ou rede — por isso é testável (tests/regras.test.html).

export const FUSO = 'America/Sao_Paulo';
export const SCHEMA_VERSION = 1;

const MIN = 60 * 1000;
const HORA = 60 * MIN;

// ---------------------------------------------------------------------------
// Tempo (sempre no fuso America/Sao_Paulo, formato 24h)
// ---------------------------------------------------------------------------

const fmtHoraIntl = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const fmtDataIntl = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit' });
const fmtDataLongaIntl = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, weekday: 'long', day: 'numeric', month: 'long' });
const fmtChaveIntl = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' });
const partesIntl = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});

/** ISO (ou número) → milissegundos. Inválido → NaN. */
export function ms(valor) {
  if (typeof valor === 'number') return valor;
  if (valor instanceof Date) return valor.getTime();
  if (!valor) return NaN;
  return Date.parse(String(valor));
}

export const fmtHora = (t) => fmtHoraIntl.format(t);
export const fmtData = (t) => fmtDataIntl.format(t);
export const fmtDataLonga = (t) => fmtDataLongaIntl.format(t);
/** "2026-10-25" no fuso de São Paulo. */
export const chaveDia = (t) => fmtChaveIntl.format(t);

/** Deslocamento do fuso para um instante, ex. "-03:00". */
export function offsetSP(t) {
  try {
    const nome = new Intl.DateTimeFormat('en-US', { timeZone: FUSO, timeZoneName: 'longOffset' })
      .formatToParts(t).find((p) => p.type === 'timeZoneName')?.value || '';
    const m = nome.match(/GMT([+-]\d{2}):?(\d{2})?/);
    if (m) return `${m[1]}:${m[2] || '00'}`;
  } catch { /* navegador antigo */ }
  return '-03:00';
}

/** Instante → "2026-10-25T12:30:00-03:00". */
export function isoSP(t) {
  const p = Object.fromEntries(partesIntl.formatToParts(t).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${offsetSP(t)}`;
}

/** "2026-10-25" + "12:30" (horário de São Paulo) → milissegundos. */
export function deDataHoraSP(dia, hora) {
  const base = Date.parse(`${dia}T${hora}:00-03:00`);
  const off = offsetSP(base);
  return off === '-03:00' ? base : Date.parse(`${dia}T${hora}:00${off}`);
}

/** Soma dias a uma chave "AAAA-MM-DD". */
export function somarDias(dia, n) {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** "Hoje", "Ontem" ou "sábado, 24 de outubro". */
export function rotuloDia(dia, agora) {
  const hoje = chaveDia(agora);
  if (dia === hoje) return 'Hoje';
  if (dia === somarDias(hoje, -1)) return 'Ontem';
  if (dia === somarDias(hoje, 1)) return 'Amanhã';
  return fmtDataLonga(Date.parse(`${dia}T12:00:00-03:00`));
}

/** 134 → "2h 14min"; 45 → "45 min". */
export function fmtDuracao(minutos) {
  const m = Math.max(0, Math.round(minutos));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${String(r).padStart(2, '0')}min` : `${h}h`;
}

/** Texto de contagem regressiva para um horário. */
export function contagem(t, agora) {
  const diff = (t - agora) / MIN;
  if (diff > 0.5) return `em ${fmtDuracao(diff)}`;
  if (diff > -1) return 'agora';
  return `há ${fmtDuracao(-diff)}`;
}

/** "37,8" / "37.8" / 37.8 → 37.8; vazio → null. */
export function numero(valor) {
  if (valor === null || valor === undefined) return null;
  const s = String(valor).trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export const fmtNumero = (n, casas = 1) =>
  n === null || n === undefined ? '' : n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

// ---------------------------------------------------------------------------
// Leitura das linhas da planilha
// ---------------------------------------------------------------------------

const ehVerdade = (v) => v === true || String(v).trim().toLowerCase() === 'true';

/**
 * Converte uma linha crua da aba "eventos" no formato usado pelo app.
 * Aceita versões antigas de schema_version (vazio = 0): "dados" pode vir como
 * texto solto, e cada tipo pode declarar migrar(dados, versao).
 */
export function normalizarEvento(linha, tipos = {}) {
  let versao = parseInt(linha.schema_version, 10);
  if (!Number.isFinite(versao)) versao = 0;
  let dados = linha.dados;
  if (typeof dados === 'string') {
    const s = dados.trim();
    if (s === '') dados = {};
    else {
      try { dados = JSON.parse(s); } catch { dados = { observacao: s }; }
    }
  }
  if (dados === null || dados === undefined) dados = {};
  if (typeof dados !== 'object' || Array.isArray(dados)) dados = { observacao: String(dados) };
  const tipo = tipos[linha.tipo];
  if (tipo && typeof tipo.migrar === 'function' && versao < SCHEMA_VERSION) {
    dados = tipo.migrar({ ...dados }, versao);
  }
  return {
    id: String(linha.id || ''),
    tipo: String(linha.tipo || ''),
    horario: String(linha.horario || ''),
    t: ms(linha.horario),
    dados,
    quem: String(linha.quem || ''),
    criado_em: String(linha.criado_em || ''),
    criado: ms(linha.criado_em) || 0,
    apagado: ehVerdade(linha.apagado),
    substitui_id: String(linha.substitui_id || ''),
    schema_version: versao
  };
}

/**
 * Aplica edições e exclusões (aba somente-adicionar).
 * Cada cadeia de substitui_id forma um grupo; vale a versão mais "funda" da cadeia
 * (empate: a criada por último). Se essa versão estiver apagada, o evento some.
 */
export function resolverEventos(linhas, tipos = {}) {
  const todas = linhas.map((l) => normalizarEvento(l, tipos)).filter((e) => e.id);
  const porId = new Map(todas.map((e) => [e.id, e]));
  const grupos = new Map();
  for (const e of todas) {
    let atual = e;
    let profundidade = 0;
    let raiz = e.id;
    const visto = new Set();
    while (atual.substitui_id && !visto.has(atual.id)) {
      visto.add(atual.id);
      profundidade++;
      const anterior = porId.get(atual.substitui_id);
      if (!anterior) { raiz = atual.substitui_id; break; }
      atual = anterior;
      raiz = atual.id;
    }
    const candidato = { ...e, raiz, profundidade };
    const vencedor = grupos.get(raiz);
    if (!vencedor || venceDe(candidato, vencedor)) grupos.set(raiz, candidato);
  }
  return [...grupos.values()]
    .filter((e) => !e.apagado && Number.isFinite(e.t))
    .sort((a, b) => a.t - b.t || a.criado - b.criado);
}

function venceDe(a, b) {
  if (a.profundidade !== b.profundidade) return a.profundidade > b.profundidade;
  if (a.criado !== b.criado) return a.criado > b.criado;
  return a.id > b.id;
}

/** Aba "planos" → { tipo: { id, horarios: [ms...] } }. Vale o plano mais recente de cada tipo. */
export function resolverPlanos(linhas) {
  const ultimo = {};
  linhas.forEach((l, i) => {
    const criado = ms(l.criado_em) || 0;
    const atual = ultimo[l.tipo];
    if (!atual || criado > atual.criado || (criado === atual.criado && i > atual.i)) {
      ultimo[l.tipo] = { linha: l, criado, i };
    }
  });
  const planos = {};
  for (const [tipo, { linha }] of Object.entries(ultimo)) {
    if (!ehVerdade(linha.ativo)) continue;
    let lista = linha.horarios;
    if (typeof lista === 'string') {
      try { lista = JSON.parse(lista); } catch { lista = []; }
    }
    const horarios = (Array.isArray(lista) ? lista : []).map(ms).filter(Number.isFinite).sort((a, b) => a - b);
    planos[tipo] = { id: linha.id, horarios };
  }
  return planos;
}

// ---------------------------------------------------------------------------
// Janelas e regras genéricas (usadas pelos tipos em js/tipos/)
// ---------------------------------------------------------------------------

/** Quantos eventos caem na janela (fim - horas, fim]. */
export function contarEmJanela(eventos, fim, horas) {
  const inicio = fim - horas * HORA;
  return eventos.filter((e) => e.t > inicio && e.t <= fim).length;
}

/** Último evento até um instante (ignora um id, útil ao editar). */
export function ultimoAte(eventos, ate = Infinity, ignorarId = '') {
  let ultimo = null;
  for (const e of eventos) {
    if (e.id === ignorarId || e.raiz === ignorarId) continue;
    if (e.t <= ate && (!ultimo || e.t >= ultimo.t)) ultimo = e;
  }
  return ultimo;
}

/** Intervalo mínimo entre doses. */
export function liberacao(ultimo, horas, agora) {
  if (!ultimo) return { liberadoEm: null, liberado: true };
  const liberadoEm = ultimo.t + horas * HORA;
  return { liberadoEm, liberado: agora >= liberadoEm };
}

/** Recorrência simples: próxima = última + horas. */
export function proximaPorRecorrencia(ultimo, horas) {
  return ultimo ? ultimo.t + horas * HORA : null;
}

/**
 * Casa os registros com os horários de um plano fixo. Cada horário tem uma janela
 * que vai até a metade do intervalo com o vizinho; um registro dentro dela conta
 * como aquela dose. Os horários nunca se recalculam por causa de atraso.
 */
export function casarPlano(horarios, eventos) {
  const usados = new Set();
  return horarios.map((t, i) => {
    const antes = i > 0 ? horarios[i - 1] : t - 12 * HORA;
    const depois = i < horarios.length - 1 ? horarios[i + 1] : t + 12 * HORA;
    const inicio = t - (t - antes) / 2;
    const fim = t + (depois - t) / 2;
    const evento = eventos
      .filter((e) => !usados.has(e.id) && e.t >= inicio && e.t < fim)
      .sort((a, b) => Math.abs(a.t - t) - Math.abs(b.t - t))[0] || null;
    if (evento) usados.add(evento.id);
    return { indice: i, numero: i + 1, t, inicio, fim, evento };
  });
}

/** Situação de um plano fixo agora. */
export function statusPlano(horarios, eventos, agora, toleranciaMin = 30) {
  const doses = casarPlano(horarios, eventos);
  const feitas = doses.filter((d) => d.evento).length;
  const perdidas = doses.filter((d) => !d.evento && d.fim <= agora).length;
  const proxima = doses.find((d) => !d.evento && d.fim > agora) || null;
  const minutosAtraso = proxima ? Math.max(0, (agora - proxima.t) / MIN) : 0;
  return {
    doses,
    total: horarios.length,
    feitas,
    perdidas,
    proxima,
    atrasada: !!proxima && minutosAtraso > toleranciaMin,
    minutosAtraso,
    concluido: horarios.length > 0 && !proxima
  };
}

/** Horário mais próximo de t dentro de ±minutos (ou null). */
export function maisProximo(t, tempos, minutos) {
  let melhor = null;
  for (const x of tempos) {
    const d = Math.abs(x - t);
    if (d < minutos * MIN && (melhor === null || d < Math.abs(melhor - t))) melhor = x;
  }
  return melhor;
}

// ---------------------------------------------------------------------------
// Contexto e agenda
// ---------------------------------------------------------------------------

/** Junta tudo que as regras dos tipos precisam. */
export function criarContexto({ eventos = [], planos = {}, config = {}, agora = Date.now(), tipos = {} }) {
  const porTipo = {};
  for (const e of eventos) (porTipo[e.tipo] ||= []).push(e);
  return {
    agora,
    eventos,
    planos,
    config,
    tipos,
    doTipo: (id) => porTipo[id] || [],
    ultimo: (id, ate = Infinity, ignorarId = '') => ultimoAte(porTipo[id] || [], ate, ignorarId),
    plano: (id) => planos[id] || null,
    numeroConfig: (chave) => numero(config[chave])
  };
}

/**
 * Agenda das próximas horas a partir de tipo.regras.proximos(ctx).
 * Itens: { tipo, t, titulo, detalhe, alerta?, informativo?, prioridade? }.
 */
export function montarAgenda(ctx, horas = 24) {
  const limite = ctx.agora + horas * HORA;
  const itens = [];
  for (const tipo of Object.values(ctx.tipos)) {
    const lista = tipo.regras?.proximos ? tipo.regras.proximos(ctx) : [];
    for (const item of lista || []) {
      if (!Number.isFinite(item.t) || item.t > limite) continue;
      if (item.t < ctx.agora - 12 * HORA) continue;
      itens.push({ prioridade: tipo.regras?.prioridade || 0, ...item, tipo: tipo.id });
    }
  }
  return itens.sort((a, b) => a.t - b.t || b.prioridade - a.prioridade);
}

/** Item do card "PRÓXIMO": atraso primeiro, depois o mais cedo (itens informativos ficam de fora). */
export function escolherProximo(agenda) {
  const acionaveis = agenda.filter((i) => !i.informativo);
  const atrasados = acionaveis.filter((i) => i.alerta).sort((a, b) => b.prioridade - a.prioridade || a.t - b.t);
  const principal = atrasados[0] || acionaveis[0] || null;
  const depois = principal ? acionaveis.find((i) => i !== principal && i.t >= principal.t) || null : null;
  return { principal, depois };
}

// Cálculos puros: tempo, leitura das linhas da planilha, janelas, planos e agenda.
// Nada aqui toca em DOM, localStorage ou rede — por isso é testável (tests/regras.test.html).

export const FUSO = 'America/Sao_Paulo';
export const SCHEMA_VERSION = 2;

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

/** Primeiro instante a partir de "inicio" em que o relógio de São Paulo marca "HH:MM" (passa da meia-noite se preciso). */
export function horaDepois(inicio, hora) {
  const dia = chaveDia(inicio);
  const t = deDataHoraSP(dia, hora);
  return t >= inicio ? t : deDataHoraSP(somarDias(dia, 1), hora);
}

/** [início, fim) de um dia "AAAA-MM-DD" no fuso de São Paulo. */
export function limitesDia(dia) {
  return [deDataHoraSP(dia, '00:00'), deDataHoraSP(somarDias(dia, 1), '00:00')];
}

/** Minutos do intervalo [a, b) que caem dentro de [inicio, fim). */
export function minutosDentro(a, b, inicio, fim) {
  return Math.max(0, Math.min(b, fim) - Math.max(a, inicio)) / MIN;
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

/** 1.25 → "1,25 mL"; 2 → "2 mL". */
export const fmtMl = (n) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} mL`;

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

// ---------------------------------------------------------------------------
// Botões da tela inicial (fase 11): config.inicio_botoes = JSON { ordem: [tipoId...], ocultos: [tipoId...] }
// ---------------------------------------------------------------------------

const idValido = (v) => typeof v === 'string' && /^[a-z0-9_]{1,60}$/.test(v);

/** config → { ordem, ocultos } (listas de ids, sem repetir). Vazio ou inválido = padrão (tudo, na ordem do app). */
export function lerBotoesInicio(config = {}) {
  let obj = null;
  try { obj = JSON.parse(config.inicio_botoes || 'null'); } catch { obj = null; }
  const lista = (v) => [...new Set((Array.isArray(v) ? v : []).filter(idValido))];
  return { ordem: lista(obj?.ordem), ocultos: lista(obj?.ocultos) };
}

/**
 * Aplica a escolha a uma lista já na ordem padrão (itens com .id).
 * Os que estão em "ordem" vêm primeiro, nessa ordem; os que não estão (ex. remédio cadastrado depois) vêm em
 * seguida, na ordem padrão. comOcultos: false tira os escondidos (tela inicial); true mantém (tela de Ajustes).
 */
export function aplicarBotoesInicio(lista, prefs = { ordem: [], ocultos: [] }, comOcultos = false) {
  const pos = new Map(prefs.ordem.map((id, i) => [id, i]));
  const ocultos = new Set(prefs.ocultos);
  return lista
    .map((item, i) => ({ item, i, p: pos.has(item.id) ? pos.get(item.id) : Infinity }))
    .sort((a, b) => a.p - b.p || a.i - b.i)
    .map(({ item }) => item)
    .filter((item) => comOcultos || !ocultos.has(item.id));
}

/** { ordem, ocultos } → texto para a config ('' quando é o padrão: nada escondido e ordem igual à padrão). */
export function textoBotoesInicio(prefs, idsPadrao = []) {
  const ordem = [...new Set(prefs.ordem.filter(idValido))];
  const ocultos = [...new Set(prefs.ocultos.filter(idValido))];
  const mesmaOrdem = ordem.length === idsPadrao.length && ordem.every((id, i) => id === idsPadrao[i]);
  if (!ocultos.length && (!ordem.length || mesmaOrdem)) return '';
  return JSON.stringify({ ordem, ocultos });
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

/**
 * Tratamento de plano fixo que já acabou há um tempo: todas as doses passaram (registradas ou não)
 * e a última foi há mais de "horas". Aí o remédio sai da tela inicial (continua no Histórico).
 */
export function tratamentoAcabou(horarios, status, agora, horas = 12) {
  if (!status || !status.concluido || !horarios?.length) return false;
  return agora > Math.max(...horarios) + horas * HORA;
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
    doDia: (id, dia) => (porTipo[id] || []).filter((e) => chaveDia(e.t) === dia),
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

// ---------------------------------------------------------------------------
// Ritmo do bebê (fase 8): o que os próprios registros dos últimos dias mostram. Não é orientação.
// ---------------------------------------------------------------------------

export const RITMO_DIAS = 14;
const DIA_MS = 24 * HORA;

/** Previsão é "por volta de": arredonda para 5 minutos (instante ou duração em minutos). */
export const arredondar5 = (t) => Math.round(t / (5 * MIN)) * 5 * MIN;
export const minutos5 = (m) => Math.round(m / 5) * 5;

export function mediana(valores) {
  const s = valores.filter(Number.isFinite).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Hora do dia em São Paulo como número (14:30 → 14.5). */
export function horaDecimal(t) {
  const [h, m] = fmtHora(t).split(':');
  return Number(h) + Number(m) / 60;
}

/** Só dias inteiros dentro do período (o primeiro e o de hoje, pela metade, puxariam as médias por dia para baixo). */
const diaCompleto = (t, desde, ate) => { const d = chaveDia(t); return d > chaveDia(desde) && d < chaveDia(ate); };

/** Faixas do dia para o tempo acordado (pela hora em que acordou). */
export const FAIXAS_ACORDADO = [
  { de: 0, ate: 5, texto: 'de madrugada' },
  { de: 5, ate: 9, texto: 'de manhã cedo' },
  { de: 9, ate: 12, texto: 'de manhã' },
  { de: 12, ate: 15, texto: 'no começo da tarde' },
  { de: 15, ate: 18, texto: 'no fim da tarde' },
  { de: 18, ate: 24, texto: 'à noite' }
];
const faixaDe = (t) => { const h = horaDecimal(t); return FAIXAS_ACORDADO.findIndex((f) => h >= f.de && h < f.ate); };

// Hora de dormir à noite como número contínuo (00:30 → 24.5), para a mediana não "quebrar" na meia-noite.
const horaNoite = (t) => { const h = horaDecimal(t); return h < 12 ? h + 24 : h; };
export const textoHoraDecimal = (h) => {
  const total = Math.round((((h % 24) + 24) % 24 * 60) / 5) * 5;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * Ritmo do sono no período (desde, ate]. sonos: [{ t, fim }] (só os terminados).
 * janelas: mediana do tempo acordado (min) por faixa do dia (null se poucos dados); geral: todas juntas.
 * Janelas acima de 6h são ignoradas (quase sempre é um sono que não foi registrado).
 */
export function ritmoSono(sonos, desde, ate) {
  const lista = sonos.filter((s) => Number.isFinite(s.fim) && s.fim > s.t).sort((a, b) => a.t - b.t);
  const porFaixa = FAIXAS_ACORDADO.map(() => []);
  const todas = [];
  for (let i = 1; i < lista.length; i++) {
    const a = lista[i - 1], b = lista[i];
    if (a.fim <= desde || a.fim > ate) continue;
    const min = (b.t - a.fim) / MIN;
    if (min < 15 || min > 6 * 60) continue;
    porFaixa[faixaDe(a.fim)].push(min);
    todas.push(min);
  }
  const noPeriodo = lista.filter((s) => s.t > desde && s.t <= ate);
  // Hora de dormir: por noite, o primeiro sono de 30 min ou mais que começa entre 19:00 e 02:00
  // (o bebê pode acordar logo depois; o que conta é quando foi deitado para a noite).
  const inicioNoite = new Map();
  for (const s of noPeriodo) {
    const h = horaNoite(s.t);
    if (h < 19 || h >= 26 || s.fim - s.t < 30 * MIN) continue;
    const noite = chaveDia(s.t - 12 * HORA);
    if (!inicioNoite.has(noite) || s.t < inicioNoite.get(noite)) inicioNoite.set(noite, s.t);
  }
  // Acordar de manhã: por dia, o fim mais tarde (entre 04:30 e 10:30) de um sono que começou de noite/madrugada.
  const manhas = new Map();
  for (const s of noPeriodo) {
    const ini = horaDecimal(s.t), fim = horaDecimal(s.fim);
    if (!(ini >= 18 || ini < 7) || fim < 4.5 || fim > 10.5) continue;
    const dia = chaveDia(s.fim);
    if (!manhas.has(dia) || s.fim > manhas.get(dia)) manhas.set(dia, s.fim);
  }
  // Cochilos: sonos que começam entre 07:00 e 18:00 e duram menos de 4h, por dia com algum registro de sono.
  const inteiros = noPeriodo.filter((s) => diaCompleto(s.t, desde, ate));
  const cochilos = inteiros.filter((s) => { const h = horaDecimal(s.t); return h >= 7 && h < 18 && s.fim - s.t < 4 * HORA; });
  const diasComSono = new Set(inteiros.map((s) => chaveDia(s.t))).size;
  const minimo = (l, n = 3) => (l.length >= n ? mediana(l) : null);
  return {
    janelas: porFaixa.map((l) => minimo(l)),
    geral: minimo(todas, 5),
    dormir: inicioNoite.size >= 3 ? mediana([...inicioNoite.values()].map(horaNoite)) : null,
    acordar: manhas.size >= 3 ? mediana([...manhas.values()].map(horaDecimal)) : null,
    cochilosPorDia: diasComSono >= 3 ? cochilos.length / diasComSono : null,
    duracaoCochilo: minimo(cochilos.map((s) => (s.fim - s.t) / MIN)),
    amostras: todas.length
  };
}

/**
 * Próximo sono previsto, estando acordado desde "acordou" (fim do último sono).
 * Usa o tempo acordado típico da faixa do dia (ou o geral). Perto da hora de dormir à noite, prevê a noite.
 * Devolve { t, noite, minutos, faixa } ou null sem dados suficientes.
 */
export function preverSono(ritmo, acordou) {
  if (!ritmo || !Number.isFinite(acordou)) return null;
  const f = faixaDe(acordou);
  const bruto = ritmo.janelas[f] ?? ritmo.geral;
  if (!bruto) return null;
  const minutos = minutos5(bruto);
  const t = arredondar5(acordou + bruto * MIN);
  if (ritmo.dormir !== null) {
    const hAcordou = horaDecimal(acordou);
    const hPrevista = horaNoite(t);
    // Acordou à tarde/noite e o próximo cairia a menos de 45 min da hora de dormir (ou depois): é a noite.
    if (hAcordou >= 15 && hPrevista >= ritmo.dormir - 0.75) {
      const dia = chaveDia(acordou);
      const alvo = deDataHoraSP(ritmo.dormir >= 24 ? somarDias(dia, 1) : dia, textoHoraDecimal(ritmo.dormir));
      return { t: arredondar5(Math.max(alvo, acordou + 30 * MIN)), noite: true, minutos, faixa: FAIXAS_ACORDADO[f].texto };
    }
  }
  return { t, noite: false, minutos, faixa: FAIXAS_ACORDADO[f].texto };
}

/** Faixas do dia para o intervalo entre mamadeiras (pela hora da mamadeira anterior). */
export const FAIXAS_LEITE = [
  { de: 6, ate: 10 }, { de: 10, ate: 14 }, { de: 14, ate: 18 }, { de: 18, ate: 21 }, { de: 21, ate: 30 }
];
const faixaLeite = (t) => { let h = horaDecimal(t); if (h < 6) h += 24; return FAIXAS_LEITE.findIndex((f) => h >= f.de && h < f.ate); };

/**
 * Ritmo do leite no período (desde, ate]. leites: [{ t, ml }]; refeicoes: [t].
 * faixas: mediana do intervalo até a mamadeira seguinte (min) por faixa do dia; dia/noite: juntando as faixas.
 * aposRefeicao: mediana de quanto tempo depois de uma refeição veio o leite seguinte.
 */
export function ritmoLeite(leites, refeicoes, desde, ate) {
  const lista = [...leites].sort((a, b) => a.t - b.t);
  const dia = [], noite = [];
  const porFaixa = FAIXAS_LEITE.map(() => []);
  for (let i = 1; i < lista.length; i++) {
    const a = lista[i - 1], b = lista[i];
    if (a.t <= desde || a.t > ate) continue;
    const min = (b.t - a.t) / MIN;
    const h = horaDecimal(a.t);
    const deDia = h >= 6 && h < 21;
    if (min < 30 || min > (deDia ? 8 : 10) * 60) continue;
    (deDia ? dia : noite).push(min);
    porFaixa[faixaLeite(a.t)].push(min);
  }
  const apos = [];
  for (const r of refeicoes) {
    if (r <= desde || r > ate) continue;
    const prox = lista.find((l) => l.t > r);
    if (prox && prox.t - r <= 4 * HORA) apos.push((prox.t - r) / MIN);
  }
  const noPeriodo = lista.filter((l) => l.t > desde && l.t <= ate && diaCompleto(l.t, desde, ate));
  const dias = new Set(noPeriodo.map((l) => chaveDia(l.t))).size;
  const ml = noPeriodo.reduce((s, l) => s + (Number(l.ml) || 0), 0);
  return {
    faixas: porFaixa.map((l) => (l.length >= 3 ? mediana(l) : null)),
    dia: dia.length >= 4 ? mediana(dia) : null,
    noite: noite.length >= 3 ? mediana(noite) : null,
    aposRefeicao: apos.length >= 3 ? mediana(apos) : null,
    porDia: dias >= 3 ? noPeriodo.length / dias : null,
    mlPorDia: dias >= 3 && ml ? ml / dias : null
  };
}

/**
 * Próximo leite previsto a partir do último. refeicaoDepois: instante de uma refeição depois dele (ou null).
 * Usa o intervalo típico da faixa do dia (ou dia/noite); depois de uma refeição, não antes do tempo típico
 * entre refeição e leite. Devolve { t, minutos, porRefeicao } ou null sem dados suficientes.
 */
export function preverLeite(ritmo, ultimo, refeicaoDepois = null) {
  if (!ritmo || !Number.isFinite(ultimo)) return null;
  const h = horaDecimal(ultimo);
  const bruto = ritmo.faixas?.[faixaLeite(ultimo)] ?? (h >= 6 && h < 21 ? ritmo.dia : ritmo.noite);
  if (!bruto) return null;
  const minutos = minutos5(bruto);
  const base = ultimo + bruto * MIN;
  if (Number.isFinite(refeicaoDepois) && refeicaoDepois > ultimo) {
    const aposRef = refeicaoDepois + (ritmo.aposRefeicao ?? 60) * MIN;
    if (aposRef > base) return { t: arredondar5(aposRef), minutos, porRefeicao: true };
  }
  return { t: arredondar5(base), minutos, porRefeicao: false };
}

/** Período "últimos N dias" até agora, e os N anteriores (para comparar). */
export const periodoRitmo = (agora, dias = RITMO_DIAS) => ({
  atual: [agora - dias * DIA_MS, agora],
  anterior: [agora - 2 * dias * DIA_MS, agora - dias * DIA_MS]
});

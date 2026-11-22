import { proximaPorRecorrencia, fmtHora, fmtDuracao, numero, ritmoLeite, preverLeite, periodoRitmo } from '../regras.js';

// O que foi, em dados.itens (pode ser mais de um no mesmo registro): leite (com dados.ml), fruta, refeição
// (papinha, sopa…). dados.quantidade guarda o texto do que comeu; dados.observacao, uma observação.
// Registros antigos (schema_version 1) só tinham o texto: migrar() deduz itens e ml dele, sem regravar nada.
export const ITENS = [
  { valor: 'leite', rotulo: 'Leite' },
  { valor: 'fruta', rotulo: 'Fruta' },
  { valor: 'refeicao', rotulo: 'Refeição' }
];
const ROTULO = Object.fromEntries(ITENS.map((i) => [i.valor, i.rotulo]));

const RECORRENCIA_H = 3;
const MIN = 60 * 1000;
const DIA = 24 * 60 * MIN;
const ML_PADRAO = [90, 120, 150, 180];

const RE_LEITE = /leite|tet[eê]|mamadeira|f[oó]rmula/i;
const RE_REFEICAO = /sopa|sopinha|\bsolo\b|cubo|cubinho|papinha|feij|arroz|batata|inhame|ab[oó]bora|cenoura|legume|frango|carne|ovo|macarr/i;
const RE_FRUTA = /banana|ameixa|mam[aã]o|\bpera\b|ma[cç][aã]|fruta|laranja|abacate|manga|melancia|mel[aã]o|uva|morango|kiwi/i;

/**
 * Deduz itens e mL de um texto livre antigo ("180ml de leite", "Banana e 150ml", "80ml de sopa e 90ml de leite").
 * Devolve { itens, ml, resto }: resto é o texto sem a parte do leite (vazio se só falava do leite).
 */
export function lerTextoAlimentacao(texto) {
  const t = String(texto || '').trim();
  if (!t) return { itens: [], ml: null, resto: '' };
  const soNumero = t.match(/^(\d{2,3})\s*(ml)?\.?$/i);
  if (soNumero) return { itens: ['leite'], ml: Number(soNumero[1]), resto: '' };
  const itens = [];
  let ml = null;
  let resto = t;
  // "150 ml de leite", "180ml tete", "leite 120ml"
  const comLeite = t.match(/(\d{2,3})\s*ml\s*(?:de\s+)?(?:leite|tet[eê])/i) || t.match(/(?:leite|tet[eê])\s*(?:de\s+)?(\d{2,3})\s*ml/i);
  if (comLeite) {
    ml = Number(comLeite[1]);
    resto = resto.replace(comLeite[0], ' ');
  }
  if (RE_LEITE.test(t)) {
    itens.push('leite');
    resto = resto.replace(/\b(?:de\s+)?(?:leite|tet[eê])\b/gi, ' ');
  } else if (!RE_REFEICAO.test(t) && !RE_FRUTA.test(t)) {
    // "e 150ml" sem dizer de quê: só conta como leite se não falar de comida.
    const mlSolto = t.match(/(\d{2,3})\s*ml/i);
    if (mlSolto) { itens.push('leite'); ml = Number(mlSolto[1]); resto = resto.replace(mlSolto[0], ' '); }
  } else if (!RE_REFEICAO.test(t)) {
    // "Banana e 150ml": fruta + leite (sopa com mL não é leite).
    const mlSolto = t.match(/(\d{2,3})\s*ml/i);
    if (mlSolto) { itens.push('leite'); ml = Number(mlSolto[1]); resto = resto.replace(mlSolto[0], ' '); }
  }
  if (RE_FRUTA.test(t)) itens.push('fruta');
  if (RE_REFEICAO.test(t)) itens.push('refeicao');
  resto = resto.replace(/\s+/g, ' ').replace(/^[\s,e·-]+|[\s,e·-]+$/gi, '').trim();
  if (/^(e|de|com)$/i.test(resto)) resto = '';
  return { itens: ITENS.map((i) => i.valor).filter((v) => itens.includes(v)), ml, resto };
}

/** Itens de um registro (novos têm dados.itens; os sem nada são "alimentação" genérica). */
const itensDe = (e) => (Array.isArray(e.dados.itens) ? e.dados.itens : []);
const temLeite = (e) => itensDe(e).includes('leite');
const ehComida = (e) => itensDe(e).some((v) => v === 'fruta' || v === 'refeicao');
const mlDe = (e) => (temLeite(e) ? numero(e.dados.ml) : null);

/** Último registro com leite (ou, se nunca houve, a última alimentação, como antes). */
function ultimoLeite(ctx) {
  const lista = ctx.doTipo('alimentacao').filter((e) => e.t <= ctx.agora);
  return lista.filter(temLeite).at(-1) || (lista.some((e) => itensDe(e).length) ? null : lista.at(-1)) || null;
}

// Depois de uma refeição (papinha, sopa) o leite costuma vir mais tarde: o próximo leite não fica antes disso.
const APOS_REFEICAO_H = 1;

/** Ritmo do leite (últimos 14 dias e os 14 anteriores), calculado uma vez por contexto. */
const cacheRitmo = new WeakMap();
export function ritmoDoLeite(ctx) {
  if (!cacheRitmo.has(ctx)) {
    const lista = ctx.doTipo('alimentacao').filter((e) => e.t <= ctx.agora);
    const leites = lista.filter(temLeite).map((e) => ({ t: e.t, ml: mlDe(e) }));
    const refeicoes = lista.filter((e) => itensDe(e).includes('refeicao')).map((e) => e.t);
    const p = periodoRitmo(ctx.agora);
    cacheRitmo.set(ctx, { atual: ritmoLeite(leites, refeicoes, ...p.atual), anterior: ritmoLeite(leites, refeicoes, ...p.anterior) });
  }
  return cacheRitmo.get(ctx);
}

/**
 * Próximo leite: pelo ritmo dele (intervalo típico nesse horário; depois de uma refeição, o tempo típico até o leite).
 * Sem dados suficientes, a regra fixa: 3h após o último; depois de refeição, não antes de 1h após ela.
 */
function proximoLeite(ctx, leite) {
  const refeicao = ctx.doTipo('alimentacao').filter((e) => e.t <= ctx.agora && e.t > leite.t && itensDe(e).includes('refeicao')).at(-1) || null;
  const prev = temLeite(leite) ? preverLeite(ritmoDoLeite(ctx).atual, leite.t, refeicao?.t ?? null) : null;
  if (prev) return { t: prev.t, refeicao: prev.porRefeicao ? refeicao : null, minutos: prev.minutos, ritmo: true };
  const base = proximaPorRecorrencia(leite, RECORRENCIA_H);
  return refeicao && refeicao.t + APOS_REFEICAO_H * 60 * MIN > base
    ? { t: refeicao.t + APOS_REFEICAO_H * 60 * MIN, refeicao, ritmo: false }
    : { t: base, refeicao: null, ritmo: false };
}

/** Tylenol dado nos últimos 30 min, se houver. */
function tylenolRecente(ctx) {
  const t = ctx.ultimo('tylenol', ctx.agora);
  return t && ctx.agora - t.t <= 30 * MIN ? t : null;
}

function textoRegistro(dados) {
  const itens = Array.isArray(dados.itens) ? dados.itens : [];
  const partes = [];
  if (itens.includes('leite')) {
    const ml = numero(dados.ml);
    partes.push(ml ? `Leite ${ml} mL` : 'Leite');
  }
  const comida = itens.filter((v) => v !== 'leite');
  if (dados.quantidade) partes.push(dados.quantidade);
  else if (comida.length) partes.push(comida.map((v) => ROTULO[v]).join(' e '));
  if (dados.observacao) partes.push(dados.observacao);
  return partes.join(' · ');
}

/** Valores de mL mais usados nos últimos 14 dias (até 4, em ordem crescente). */
function mlMaisUsados(ctx) {
  const conta = new Map();
  for (const e of ctx.doTipo('alimentacao')) {
    if (ctx.agora - e.t > 14 * DIA) continue;
    const ml = mlDe(e);
    if (ml) conta.set(ml, (conta.get(ml) || 0) + 1);
  }
  const top = [...conta.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([ml]) => ml);
  return (top.length ? top : ML_PADRAO).sort((a, b) => a - b);
}

/** Últimos textos de fruta/refeição (os itens marcados decidem quais), os mais recentes primeiro. */
function textosRecentes(ctx, itens) {
  const quer = (itens || []).filter((v) => v !== 'leite');
  if (!quer.length) return [];
  const vistos = new Set();
  const lista = [];
  for (const e of [...ctx.doTipo('alimentacao')].reverse()) {
    const texto = String(e.dados.quantidade || '').trim();
    if (!texto || !itensDe(e).some((v) => quer.includes(v))) continue;
    const chave = texto.toLowerCase();
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    lista.push(texto);
    if (lista.length >= 5) break;
  }
  return lista;
}

export default {
  id: 'alimentacao',
  rotina: true,
  rotulo: 'Alimentação',
  cor: '#D08A4E',
  icone: '<svg viewBox="0 0 24 24"><path d="M9.5 2.5h5"/><path d="M10.5 2.5v2.8L8.3 8.4v10.3A2.8 2.8 0 0 0 11.1 21.5h1.8a2.8 2.8 0 0 0 2.8-2.8V8.4l-2.2-3.1V2.5"/><path d="M8.3 12.5h7.4"/></svg>',
  campos: [
    { id: 'itens', rotulo: 'O que foi', tipo: 'multiplas', opcoes: ITENS },
    {
      id: 'ml', rotulo: 'Leite (mL)', tipo: 'numero', casas: 0, min: 10, max: 400, placeholder: 'ex. 180',
      mostrarSe: (dados) => (dados.itens || []).includes('leite'),
      atalhos: (ctx) => mlMaisUsados(ctx).map((ml) => ({ valor: String(ml), rotulo: `${ml}` }))
    },
    {
      id: 'quantidade', rotulo: 'O que comeu', tipo: 'texto', placeholder: 'Opcional, ex. 2 cubos de feijão',
      mostrarSe: (dados) => (dados.itens || []).some((v) => v !== 'leite') || !!dados.quantidade,
      atalhos: (ctx, dados) => textosRecentes(ctx, dados.itens).map((t) => ({ valor: t, rotulo: t }))
    },
    { id: 'observacao', rotulo: 'Observação', tipo: 'texto', placeholder: 'Opcional' }
  ],

  /** schema_version 1: só texto livre. Deduz itens e mL (só na leitura; a planilha continua igual). */
  migrar(dados, versao) {
    if (versao >= 2 || Array.isArray(dados.itens)) return dados;
    // A observação ajuda a decidir (ex. quantidade "80ml" e observação "Sopinha" = refeição, não leite).
    const r = lerTextoAlimentacao([dados.quantidade, dados.observacao].filter(Boolean).join(' '));
    if (!r.itens.length) return dados;
    dados.itens = r.itens;
    if (r.ml) dados.ml = r.ml;
    // Tira do texto só a parte que virou "Leite N mL" (o resto, como "Banana", continua).
    if (r.itens.includes('leite')) {
      const q = lerTextoAlimentacao(dados.quantidade);
      if (q.itens.includes('leite')) dados.quantidade = q.resto;
    }
    return dados;
  },

  /** Leite vem com o último mL usado (os itens ficam para escolher com um toque). */
  padroes(ctx) {
    const ultimo = ctx.doTipo('alimentacao').filter((e) => mlDe(e)).at(-1);
    return ultimo ? { ml: mlDe(ultimo) } : {};
  },

  resumo(dados) {
    return { texto: textoRegistro(dados) || 'Alimentou' };
  },

  resumoDia(ctx, dia) {
    const lista = ctx.doDia('alimentacao', dia);
    if (!lista.length) return null;
    const leites = lista.filter(temLeite);
    const ml = leites.reduce((soma, e) => soma + (mlDe(e) || 0), 0);
    const frutas = lista.filter((e) => itensDe(e).includes('fruta')).length;
    const refeicoes = lista.filter((e) => itensDe(e).includes('refeicao')).length;
    const outros = lista.filter((e) => !itensDe(e).length).length;
    const plural = (n, um, varios) => (n ? `${n} ${n === 1 ? um : varios}` : '');
    const detalhe = [plural(leites.length, 'mamadeira', 'mamadeiras'), plural(refeicoes, 'refeição', 'refeições'),
      plural(frutas, 'fruta', 'frutas'), outros < lista.length ? plural(outros, 'outra', 'outras') : ''].filter(Boolean).join(' · ');
    if (ml) return { valor: `${ml} mL de leite`, detalhe };
    return { valor: lista.length === 1 ? '1 vez' : `${lista.length} vezes`, detalhe: detalhe || `última ${fmtHora(lista.at(-1).t)}` };
  },

  regras: {
    prioridade: 30,
    recorrenciaH: RECORRENCIA_H,

    status(ctx) {
      const tyl = tylenolRecente(ctx);
      const leite = ultimoLeite(ctx);
      const comida = ctx.doTipo('alimentacao').filter((e) => e.t <= ctx.agora && ehComida(e)).at(-1);
      if (!leite && !comida) return { linhas: ['Nenhum registro'] };
      const linhas = [];
      if (leite) {
        const ml = mlDe(leite);
        linhas.push(temLeite(leite) ? `Leite ${fmtHora(leite.t)}${ml ? ` · ${ml} mL` : ''}` : `Última ${fmtHora(leite.t)}`);
      }
      if (tyl) linhas.push(`20–30 min após o Tylenol (${fmtHora(tyl.t + 20 * MIN)}–${fmtHora(tyl.t + 30 * MIN)})`);
      else if (leite) { const pr = proximoLeite(ctx, leite); linhas.push(`Próximo leite ${pr.ritmo ? '~' : ''}${fmtHora(pr.t)}${pr.ritmo && pr.t < ctx.agora ? ' · já passou' : ''}`); }
      // Comida recente num registro separado (se foi junto com o leite, a linha do leite já basta).
      if (comida && comida.id !== leite?.id && (!leite || comida.t > leite.t - 6 * 60 * MIN)) {
        linhas.push(`${itensDe(comida).includes('refeicao') ? 'Refeição' : 'Fruta'} ${fmtHora(comida.t)}`);
      }
      return { linhas };
    },

    proximos(ctx) {
      const tyl = tylenolRecente(ctx);
      if (tyl) {
        return [{
          t: tyl.t + 20 * MIN,
          titulo: 'Alimentação',
          detalhe: `20–30 min após o Tylenol (até ${fmtHora(tyl.t + 30 * MIN)})`
        }];
      }
      const leite = ultimoLeite(ctx);
      if (!leite) return [];
      const pr = proximoLeite(ctx, leite);
      if (pr.ritmo) {
        // Previsão pelo ritmo: nunca vira "Atrasado"; depois da hora fica como "já passou do costume" (até 6h).
        if (ctx.agora > pr.t + 6 * 60 * MIN) return [];
        return [{
          t: pr.t,
          titulo: 'Leite',
          detalhe: pr.refeicao
            ? `costuma vir assim depois da refeição (${fmtHora(pr.refeicao.t)})`
            : `costuma ser a cada ~${fmtDuracao(pr.minutos)} nesse horário`,
          previsao: true
        }];
      }
      return [{
        t: pr.t,
        titulo: temLeite(leite) ? 'Leite' : 'Alimentação',
        detalhe: pr.refeicao
          ? `1h após a refeição (${fmtHora(pr.refeicao.t)})`
          : `3h após ${temLeite(leite) ? 'o último leite' : 'a última'} (${fmtHora(leite.t)})`,
        alerta: ctx.agora - pr.t > 30 * MIN
      }];
    },

    avisos(ctx, horario, dados) {
      const itens = dados.itens || [];
      if (itens.includes('leite') && dados.ml === null) {
        return [{ texto: 'Faltou dizer quantos mL de leite (dá para registrar assim mesmo).' }];
      }
      return [];
    }
  }
};

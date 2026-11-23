// Gamificação (fase 21): meta da semana, conquistas de quem cuida, aniversários de mês, linha do tempo dos marcos e
// retrospectiva do mês. Tudo puro (testado em tests/regras.casos.js).
// Regra que não muda: só a rotina (alimentação, sono, fralda, banho) conta. Remédio, febre e vacina nunca dão ponto
// nem medalha; nada aqui manda aviso ou cobra ninguém.

import { chaveDia, somarDias, deDataHoraSP, limitesDia, ms, fmtData, idadeTexto } from './regras.js';
import { temLeite } from './tipos/alimentacao.js';
import { minutosNoDia } from './tipos/sono.js';
import { anotacoesEntre } from './tipos/anotacao.js';
import { papel, placarEntre } from './familia.js';

const HORA = 3600000;
const DIA = 24 * HORA;
const ROTINA = new Set(['alimentacao', 'sono', 'fralda', 'banho']);
const sem = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
const nomeLimpo = (s) => String(s ?? '').trim().replace(/\s+/g, ' ');

// ---------------------------------------------------------------------------
// Meta da semana: dias com a rotina completa
// ---------------------------------------------------------------------------

/** Manhã (05–12h), tarde (12–18h) e noite (18–24h) de um dia: [inicio, fim) de cada uma. */
const PARTES = [[5, 12], [12, 18], [18, 24]];

/**
 * Dia com a rotina completa: alimentação e fralda registradas de manhã, à tarde e à noite, e nenhum sono do dia
 * sem hora de acordar (o sono em andamento agora não conta contra).
 */
export function diaCompleto(ctx, dia) {
  const [ini] = limitesDia(dia);
  const nasPartes = (tipo) => PARTES.every(([a, b]) => ctx.doDia(tipo, dia).some((e) => e.t >= ini + a * HORA && e.t < ini + b * HORA));
  const ultimoSono = ctx.ultimo('sono', ctx.agora);
  const sonoAberto = ctx.doDia('sono', dia).some((e) => !Number.isFinite(ms(e.dados.fim)) && e.id !== ultimoSono?.id);
  return nasPartes('alimentacao') && nasPartes('fralda') && !sonoAberto;
}

/** Os últimos 7 dias inteiros (ontem para trás; hoje ainda está acontecendo). → { dias: [{ dia, completo }], completos } */
export function metaSemana(ctx) {
  const hoje = chaveDia(ctx.agora);
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(hoje, i - 7)).map((dia) => ({ dia, completo: diaCompleto(ctx, dia) }));
  return { dias, completos: dias.filter((d) => d.completo).length };
}

// ---------------------------------------------------------------------------
// Conquistas de quem cuida
// ---------------------------------------------------------------------------

/** Lista das medalhas. teste(registros da pessoa em ordem) → instante em que conquistou, ou null. */
export const CONQUISTAS = [
  { id: 'estreia', emoji: '🌟', rotulo: 'Estreia', descricao: 'primeiro registro', teste: (r) => r[0]?.t ?? null },
  { id: 'banho', emoji: '🛁', rotulo: 'Primeiro banho', descricao: 'registrou um banho', teste: (r) => r.find((e) => e.tipo === 'banho')?.t ?? null },
  {
    id: 'madrugada', emoji: '🌙', rotulo: 'Plantão da madrugada', descricao: 'registro entre 0h e 5h',
    teste: (r) => r.find((e) => e.t - deDataHoraSP(chaveDia(e.t), '00:00') < 5 * HORA)?.t ?? null
  },
  { id: 'fraldas', emoji: '🧷', rotulo: 'Mestre das fraldas', descricao: '50 trocas', teste: (r) => r.filter((e) => e.tipo === 'fralda')[49]?.t ?? null },
  { id: 'mamadeiras', emoji: '🍼', rotulo: 'Cem mamadeiras', descricao: '100 mamadeiras', teste: (r) => r.filter((e) => e.tipo === 'alimentacao' && temLeite(e))[99]?.t ?? null },
  {
    id: 'semana', emoji: '📅', rotulo: 'Semana inteira', descricao: 'registrou em 7 dias seguidos',
    teste: (r) => {
      let seguidos = 0, anterior = null;
      for (const e of r) {
        const dia = chaveDia(e.t);
        if (dia === anterior) continue;
        seguidos = anterior && dia === somarDias(anterior, 1) ? seguidos + 1 : 1;
        anterior = dia;
        if (seguidos === 7) return e.t;
      }
      return null;
    }
  }
];

/**
 * Medalhas de cada pessoa (pelo autor do registro original, como no placar), conquistadas até agora.
 * → [{ nome, papel, medalhas: [{ id, emoji, rotulo, descricao, t }] }], quem tem mais primeiro.
 */
export function conquistasPorPessoa(ctx) {
  const porPessoa = new Map();
  for (const e of ctx.eventos) {
    if (!ROTINA.has(e.tipo) || e.t > ctx.agora) continue;
    const autor = e.autor ?? e.quem;
    if (!papel(autor)) continue;
    const chave = sem(autor);
    if (!porPessoa.has(chave)) porPessoa.set(chave, { nome: '', registros: [] });
    const p = porPessoa.get(chave);
    p.nome = nomeLimpo(autor);
    p.registros.push(e);
  }
  return [...porPessoa.values()].map(({ nome, registros }) => {
    registros.sort((a, b) => a.t - b.t);
    const medalhas = CONQUISTAS.map((c) => ({ id: c.id, emoji: c.emoji, rotulo: c.rotulo, descricao: c.descricao, t: c.teste(registros) }))
      .filter((m) => m.t !== null).sort((a, b) => a.t - b.t);
    return { nome, papel: papel(nome), medalhas };
  }).filter((p) => p.medalhas.length)
    .sort((a, b) => b.medalhas.length - a.medalhas.length || a.nome.localeCompare(b.nome, 'pt-BR'));
}

/** Medalhas conquistadas dentro de [inicio, fim]: [{ nome, ...medalha }], as mais recentes primeiro. */
export const medalhasNovas = (pessoas, inicio, fim) => pessoas
  .flatMap((p) => p.medalhas.filter((m) => m.t >= inicio && m.t <= fim).map((m) => ({ nome: p.nome, ...m })))
  .sort((a, b) => b.t - a.t);

// ---------------------------------------------------------------------------
// Aniversários de mês e linha do tempo
// ---------------------------------------------------------------------------

const dataValida = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

/** Dia (AAAA-MM-DD) em que o bebê completa n meses (dia 31 num mês de 30 dias cai no último dia). */
export function diaDoMes(nascimento, n) {
  const [a, m, d] = nascimento.split('-').map(Number);
  const ultimo = new Date(Date.UTC(a, m - 1 + n + 1, 0)).getUTCDate();
  const data = new Date(Date.UTC(a, m - 1 + n, Math.min(d, ultimo)));
  return data.toISOString().slice(0, 10);
}

/** Se hoje o bebê faz meses ("mêsversário"), quantos; senão null. */
export function mesesHoje(nascimento, agora) {
  if (!dataValida(nascimento)) return null;
  const hoje = chaveDia(agora);
  for (let n = 1; n <= 240; n++) {
    const d = diaDoMes(nascimento, n);
    if (d === hoje) return n;
    if (d > hoje) return null;
  }
  return null;
}

/** 6 → "6 meses"; 12 → "1 ano"; 14 → "1 ano e 2 meses". */
export function textoIdadeMeses(n) {
  const m = (k) => `${k} ${k === 1 ? 'mês' : 'meses'}`;
  if (n < 12) return m(n);
  const anos = Math.floor(n / 12), resto = n % 12;
  const a = `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
  return resto ? `${a} e ${m(resto)}` : a;
}

/** "Hoje faz 6 meses!" */
export const textoMeses = (n) => `Hoje faz ${textoIdadeMeses(n)}!`;

/**
 * Linha do tempo: nascimento, cada mês completado (até hoje) e as anotações do tipo Marco, com a idade em cada uma.
 * → [{ t, tipo: 'nascimento' | 'mes' | 'marco', texto, idade }], o mais recente primeiro.
 */
export function linhaDoTempo(ctx, nascimento) {
  const itens = [];
  const meioDia = (dia) => Date.parse(`${dia}T12:00:00-03:00`);
  if (dataValida(nascimento)) {
    itens.push({ t: meioDia(nascimento), tipo: 'nascimento', texto: 'Nasceu', idade: '' });
    const hoje = chaveDia(ctx.agora);
    for (let n = 1; n <= 240; n++) {
      const d = diaDoMes(nascimento, n);
      if (d > hoje) break;
      itens.push({ t: meioDia(d), tipo: 'mes', texto: `Fez ${textoIdadeMeses(n)}`, idade: '' });
    }
  }
  for (const m of anotacoesEntre(ctx, 0, ctx.agora, 'Marco')) {
    itens.push({ t: m.t, tipo: 'marco', texto: m.texto, idade: dataValida(nascimento) ? idadeTexto(nascimento, m.t) : '' });
  }
  return itens.sort((a, b) => b.t - a.t);
}

// ---------------------------------------------------------------------------
// Retrospectiva do mês
// ---------------------------------------------------------------------------

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const nomeMes = (mes) => MESES[Number(mes.slice(5, 7)) - 1];
/** "2026-11" → o mês anterior, "2026-10". */
export const mesAnterior = (mes) => somarDias(`${mes}-01`, -1).slice(0, 7);

/**
 * Destaques do mês (AAAA-MM) até o fim dele ou até agora: noite mais longa, recorde de leite, totais leves, marcos,
 * quem ajudou (placar) e medalhas novas. Nunca temperatura, remédio ou sintoma (vai para o grupo da família).
 */
export function retrospectiva(ctx, tiposRotina, mes) {
  const inicio = deDataHoraSP(`${mes}-01`, '00:00');
  const proximo = deDataHoraSP(`${somarDias(`${mes}-28`, 4).slice(0, 7)}-01`, '00:00');
  const fim = Math.min(proximo - 1, ctx.agora);
  const naJanela = (e) => e.t >= inicio && e.t <= fim;
  const dias = [];
  for (let d = `${mes}-01`; d <= chaveDia(fim); d = somarDias(d, 1)) dias.push(d);

  // Recorde de leite: o dia com mais mL.
  let recorde = null;
  for (const d of dias) {
    const ml = ctx.doDia('alimentacao', d).filter(temLeite).reduce((s, e) => s + (Number(e.dados.ml) || 0), 0);
    if (ml && (!recorde || ml > recorde.ml)) recorde = { dia: d, ml };
  }
  // Noite mais longa: o maior sono que começou entre 18h e 3h.
  let noite = null;
  for (const e of ctx.doTipo('sono').filter(naJanela)) {
    const f = ms(e.dados.fim);
    if (!Number.isFinite(f)) continue;
    const h = (e.t - deDataHoraSP(chaveDia(e.t), '00:00')) / HORA;
    if (!(h >= 18 || h < 3)) continue;
    const min = (f - e.t) / 60000;
    if (!noite || min > noite.min) noite = { t: e.t, min };
  }
  const sonoTotal = dias.reduce((s, d) => s + minutosNoDia(ctx, d), 0);
  const pessoas = conquistasPorPessoa(ctx);
  return {
    mes, nome: nomeMes(mes), inicio, fim, completo: proximo - 1 <= ctx.agora,
    recordeLeite: recorde, noiteMaisLonga: noite,
    sonoPorDia: dias.length ? sonoTotal / dias.length / 60 : null,
    placar: placarEntre(ctx, tiposRotina, inicio, fim),
    marcos: anotacoesEntre(ctx, inicio, fim, 'Marco'),
    medalhas: medalhasNovas(pessoas, inicio, fim)
  };
}

/** Linha da data de um marco: "20/11 · 5 meses e 8 dias". */
export const quandoMarco = (item) => [fmtData(item.t), item.idade].filter(Boolean).join(' · ');

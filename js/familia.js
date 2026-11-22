// Família participando (fase 13): quanto da rotina cada um registrou no período.
// Puro (testado em tests/regras.casos.js). Só os tipos de rotina (alimentação, sono, fralda, banho) contam:
// remédio, febre e vacina nunca dão ponto, para não incentivar dose a mais nem registro repetido.
// O ponto é de quem fez o registro original (`autor`); corrigido continua com ele; desfeito ou apagado não conta.

import { chaveDia, somarDias, deDataHoraSP } from './regras.js';
import { temLeite } from './tipos/alimentacao.js';

export const GRUPOS = [
  { id: 'mae', rotulo: 'Mãe', cor: '#2F6F6A' },
  { id: 'pai', rotulo: 'Pai', cor: '#5B6FB5' },
  { id: 'familia', rotulo: 'Família', cor: '#D08A4E' }
];

const sem = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');

/** Apelido → 'mae' | 'pai' | 'familia' | '' (vazio: registro sem apelido, fica fora do placar). */
export function papel(apelido) {
  const s = sem(apelido);
  if (!s) return '';
  if (s === 'mae' || s === 'mamae') return 'mae';
  if (s === 'pai' || s === 'papai') return 'pai';
  return 'familia';
}

/** Porcentagens inteiras que somam 100 (maiores restos). contagens: { id: n } → { id: % } */
export function porcentagens(contagens) {
  const ids = Object.keys(contagens);
  const total = ids.reduce((s, id) => s + contagens[id], 0);
  if (!total) return Object.fromEntries(ids.map((id) => [id, 0]));
  const exatas = ids.map((id) => ({ id, v: (contagens[id] * 100) / total }));
  const base = Object.fromEntries(exatas.map(({ id, v }) => [id, Math.floor(v)]));
  let falta = 100 - Object.values(base).reduce((s, v) => s + v, 0);
  for (const { id } of [...exatas].sort((a, b) => (b.v - Math.floor(b.v)) - (a.v - Math.floor(a.v)) || contagens[b.id] - contagens[a.id])) {
    if (falta <= 0) break;
    if (contagens[id]) { base[id]++; falta--; }
  }
  return base;
}

/**
 * tiposRotina: os tipos que dão ponto (tipo.rotina). nDias: dias inteiros até hoje (hoje conta), como no Relatório.
 * → { dias, inicio, fim, total, grupos: [{ id, rotulo, cor, pontos, pct }], ranking: [{ nome, pontos }],
 *     numeros: [{ id, n, rotulo }] }
 */
export function montarPlacar(ctx, tiposRotina, nDias) {
  const hoje = chaveDia(ctx.agora);
  const dias = Array.from({ length: nDias }, (_, i) => somarDias(hoje, i - nDias + 1));
  const inicio = deDataHoraSP(dias[0], '00:00');
  const fim = ctx.agora;
  const ids = new Set(tiposRotina.filter((t) => t.rotina && !t.remedio).map((t) => t.id));
  const registros = ctx.eventos.filter((e) => ids.has(e.tipo) && e.t >= inicio && e.t <= fim);

  const contagem = { mae: 0, pai: 0, familia: 0 };
  const parentes = new Map(); // apelido sem acento/maiúscula → { nome, pontos }
  for (const e of registros) {
    const autor = e.autor ?? e.quem;
    const p = papel(autor);
    if (!p) continue;
    contagem[p]++;
    if (p === 'familia') {
      const chave = sem(autor);
      if (!parentes.has(chave)) parentes.set(chave, { nome: '', pontos: 0 });
      const item = parentes.get(chave);
      item.pontos++;
      item.nome = String(autor).trim().replace(/\s+/g, ' '); // eventos em ordem de horário: fica a grafia mais recente
    }
  }
  const pct = porcentagens(contagem);
  const total = contagem.mae + contagem.pai + contagem.familia;
  // Empate divide a posição (6, 6, 6 = três 2º lugares).
  const ranking = [...parentes.values()]
    .sort((a, b) => b.pontos - a.pontos || a.nome.localeCompare(b.nome, 'pt-BR'))
    .map((r, i, lista) => ({ ...r, pos: 1 + lista.filter((x) => x.pontos > r.pontos).length }));

  // Números leves (nada de saúde): mamadeiras, fraldas, sonos, banhos.
  const conta = (tipo, filtro = () => true) => registros.filter((e) => e.tipo === tipo && filtro(e)).length;
  const plural = (n, um, varios) => (n === 1 ? um : varios);
  const numeros = [
    ['mamadeiras', conta('alimentacao', temLeite), 'mamadeira', 'mamadeiras'],
    ['refeicoes', conta('alimentacao', (e) => !temLeite(e)), 'outra refeição', 'outras refeições'],
    ['fraldas', conta('fralda'), 'fralda', 'fraldas'],
    ['sonos', conta('sono'), 'sono', 'sonos'],
    ['banhos', conta('banho'), 'banho', 'banhos']
  ].filter(([, n]) => n).map(([id, n, um, varios]) => ({ id, n, rotulo: plural(n, um, varios) }));

  return {
    dias, inicio, fim, total,
    grupos: GRUPOS.map((g) => ({ ...g, pontos: contagem[g.id], pct: pct[g.id] })),
    ranking,
    numeros
  };
}

/** "Rotina de hoje" / "Rotina dos últimos 3 dias" / "Rotina da semana" / "Rotina das últimas 2 semanas" */
export function tituloPlacar(nDias) {
  if (nDias === 1) return 'Rotina de hoje';
  if (nDias === 7) return 'Rotina da semana';
  if (nDias === 14) return 'Rotina das últimas 2 semanas';
  return `Rotina dos últimos ${nDias} dias`;
}

// ---------------------------------------------------------------------------
// Tela (texto HTML; o app só encaixa)
// ---------------------------------------------------------------------------

export const MEDALHAS = ['#D4A72C', '#9AA5B1', '#B9773F']; // ouro, prata, bronze
export const PERIODO_FAMILIA = 7;
export const textoRegistros = (n) => `${n} ${n === 1 ? 'registro' : 'registros'}`;
export const NOTA_PONTOS = 'Contam alimentação, sono, fralda e banho, para quem registrou primeiro. ' +
  'Remédios, febre e vacinas não contam. Pai e Mãe ficam fora do ranking.';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** opcoes: { nome, nDias, periodos: [[n, rotulo]], periodo: texto do período } */
export function htmlPlacar(p, { nome, nDias, periodos, periodo }) {
  const chips = periodos.map(([n, rotulo]) =>
    `<button class="chip ${n === nDias ? 'chip--ativo' : ''}" data-acao="periodo-familia" data-dias="${n}" aria-pressed="${n === nDias}">${esc(rotulo)}</button>`).join('');
  const barra = p.total
    ? p.grupos.filter((g) => g.pontos).map((g) => `<span style="width:${g.pct}%;--cor:${g.cor}" title="${esc(`${g.rotulo} ${g.pct}%`)}"></span>`).join('')
    : '';
  const legenda = p.grupos.map((g) => `
    <li style="--cor:${g.cor}">
      <span class="placar-nome"><span class="placar-ponto"></span>${esc(g.rotulo)}</span>
      <strong>${g.pct}%</strong>
      <small>${esc(textoRegistros(g.pontos))}</small>
    </li>`).join('');
  const ranking = p.ranking.length
    ? `<ol class="placar-ranking">${p.ranking.map((r) => `
        <li>
          <span class="placar-pos" ${r.pos <= 3 ? `style="--cor:${MEDALHAS[r.pos - 1]}"` : ''}>${r.pos}</span>
          <span class="placar-quem">${esc(r.nome)}</span>
          <span class="placar-pontos">${esc(textoRegistros(r.pontos))}</span>
        </li>`).join('')}</ol>`
    : `<p class="vazio">Ninguém da família registrou neste período.</p>
       <p class="ajuda">Para alguém da família participar, mande o link de acesso (Ajustes → Compartilhar link de acesso).
       O link dá acesso a tudo, inclusive aos remédios: envie só para quem cuida do bebê.</p>`;
  const numeros = p.numeros.map((n) => `<li><strong>${n.n}</strong> ${esc(n.rotulo)}</li>`).join('');
  return `
    <div class="relatorio placar">
      <div class="rel-barra">
        <button class="botao botao--leve rel-voltar" data-acao="vista" data-vista="historico">‹ Histórico</button>
        <span class="rel-acoes">
          <button class="botao botao--cheio rel-imagem" data-acao="compartilhar-familia">Enviar para a família</button>
        </span>
      </div>
      <div class="chips" role="group" aria-label="Período">${chips}</div>
      <header class="rel-cabeca">
        <p class="rel-sobre">Família participando</p>
        <h2 class="rel-titulo">${esc(tituloPlacar(nDias))}${nome ? ` · ${esc(nome)}` : ''}</h2>
        <p class="rel-periodo">${esc(periodo)}</p>
      </header>
      <section class="cartao rel-secao">
        <h3 class="rel-secao-titulo">Quem registrou a rotina</h3>
        ${p.total ? `<div class="placar-barra" role="img" aria-label="${esc(p.grupos.map((g) => `${g.rotulo} ${g.pct}%`).join(', '))}">${barra}</div>` : '<p class="vazio">Nenhum registro de rotina neste período.</p>'}
        <ul class="placar-legenda">${legenda}</ul>
      </section>
      <section class="cartao rel-secao">
        <h3 class="rel-secao-titulo">Ranking da família</h3>
        ${ranking}
      </section>
      ${numeros ? `<section class="cartao rel-secao"><h3 class="rel-secao-titulo">No período</h3><ul class="placar-numeros">${numeros}</ul></section>` : ''}
      <p class="ajuda rel-nota">${esc(NOTA_PONTOS)} A imagem para a família não mostra temperatura nem remédios.</p>
    </div>`;
}

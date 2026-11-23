// Família participando (fase 13): quanto da rotina cada um registrou no período.
// Puro (testado em tests/regras.casos.js). Só os tipos de rotina (alimentação, sono, fralda, banho) contam:
// remédio, febre e vacina nunca dão ponto, para não incentivar dose a mais nem registro repetido.
// O ponto é de quem fez o registro original (`autor`); corrigido continua com ele; desfeito ou apagado não conta.

import { chaveDia, somarDias, deDataHoraSP, fmtData } from './regras.js';
import { temLeite } from './tipos/alimentacao.js';
import { anotacoesEntre } from './tipos/anotacao.js';

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
 *     numeros: [{ id, n, rotulo }], marcos: [{ t, texto }] }
 * marcos (fase 17): anotações do tipo Marco do período. Sintomas e outras anotações nunca entram aqui.
 */
export function montarPlacar(ctx, tiposRotina, nDias) {
  const hoje = chaveDia(ctx.agora);
  const dias = Array.from({ length: nDias }, (_, i) => somarDias(hoje, i - nDias + 1));
  return { dias, ...placarEntre(ctx, tiposRotina, deDataHoraSP(dias[0], '00:00'), ctx.agora) };
}

/** O mesmo placar para um intervalo qualquer [inicio, fim] (ex. um mês, na retrospectiva). */
export function placarEntre(ctx, tiposRotina, inicio, fim) {
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
    inicio, fim, total,
    grupos: GRUPOS.map((g) => ({ ...g, pontos: contagem[g.id], pct: pct[g.id] })),
    ranking,
    numeros,
    marcos: anotacoesEntre(ctx, inicio, fim, 'Marco').map(({ t, texto }) => ({ t, texto }))
  };
}

/** "Rotina de hoje" / "Rotina dos últimos 3 dias" / "Rotina da semana" / "Rotina das últimas 2 semanas" */
export function tituloPlacar(nDias) {
  if (nDias === 1) return 'Rotina de hoje';
  if (nDias === 7) return 'Rotina da semana';
  if (nDias === 14) return 'Rotina das últimas 2 semanas';
  if (nDias === 30) return 'Rotina do mês';
  return `Rotina dos últimos ${nDias} dias`;
}

// ---------------------------------------------------------------------------
// Tela (texto HTML; o app só encaixa)
// ---------------------------------------------------------------------------

export const MEDALHAS = ['#D4A72C', '#9AA5B1', '#B9773F']; // ouro, prata, bronze
export const PERIODO_FAMILIA = 7;
export const PERIODOS_FAMILIA = [[1, 'Hoje'], [7, '7 dias'], [30, '30 dias']];
export const textoRegistros = (n) => `${n} ${n === 1 ? 'registro' : 'registros'}`;
export const NOTA_PONTOS = 'Contam alimentação, sono, fralda e banho, para quem registrou primeiro. ' +
  'Remédios, febre e vacinas não contam. Pai e Mãe ficam fora do ranking.';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** opcoes: { nome, nDias, periodos: [[n, rotulo]], periodo: texto do período } */
/** Fase 21: meta da semana (7 bolinhas, uma por dia). meta: metaSemana(ctx). */
function secaoMeta(meta) {
  if (!meta) return '';
  const semana = new Intl.DateTimeFormat('pt-BR', { weekday: 'narrow', timeZone: 'America/Sao_Paulo' });
  const completa = meta.completos === 7;
  return `
    <section class="cartao rel-secao meta-semana ${completa ? 'meta-semana--completa' : ''}">
      <h3 class="rel-secao-titulo">Meta da semana</h3>
      <p class="meta-texto">${completa ? 'Semana completa! 🎉' : `<strong>${meta.completos} de 7</strong> dias com a rotina completa`}</p>
      <ol class="meta-dias">${meta.dias.map((d) => `
        <li class="${d.completo ? 'meta-ok' : ''}" title="${esc(d.dia.split('-').reverse().slice(0, 2).join('/'))}${d.completo ? ' · completo' : ''}">
          <span class="meta-bola">${d.completo ? '✓' : ''}</span>${esc(semana.format(Date.parse(`${d.dia}T12:00:00-03:00`)).toUpperCase())}
        </li>`).join('')}</ol>
      <p class="ajuda">Dia completo: alimentação e fralda registradas de manhã, à tarde e à noite, e todo sono com hora de acordar. Ontem para trás.</p>
    </section>`;
}

/** Fase 21: medalhas de cada pessoa; as conquistadas no período aparecem como "nova". */
function secaoConquistas(pessoas, inicio, fim, total) {
  if (!pessoas?.length) return '';
  return `
    <section class="cartao rel-secao">
      <h3 class="rel-secao-titulo">Conquistas</h3>
      <ul class="conquistas">${pessoas.map((pe) => `
        <li>
          <p class="conquistas-nome">${esc(pe.nome)} <small>${pe.medalhas.length} de ${total}</small></p>
          <p class="conquistas-medalhas">${pe.medalhas.map((m) => {
            const nova = m.t >= inicio && m.t <= fim;
            return `<span class="medalha ${nova ? 'medalha--nova' : ''}" title="${esc(`${m.descricao} · ${fmtData(m.t)}`)}">${m.emoji} ${esc(m.rotulo)}${nova ? ' <b>nova</b>' : ''}</span>`;
          }).join('')}</p>
        </li>`).join('')}</ul>
      <p class="ajuda">Só a rotina conta (alimentação, sono, fralda e banho). Toque e segure numa medalha para ver quando foi.</p>
    </section>`;
}

/** Fase 21: botões da retrospectiva (mês passado e o mês atual até hoje). meses: { anterior, atual } (AAAA-MM). */
function secaoRetrospectiva(meses) {
  if (!meses) return '';
  const nome = (m) => ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'][Number(m.slice(5, 7)) - 1];
  return `
    <section class="cartao rel-secao">
      <h3 class="rel-secao-titulo">Retrospectiva do mês</h3>
      <p class="ajuda">Uma imagem para o grupo com os destaques: noite mais longa, recorde de leite, marcos e quem mais ajudou.</p>
      <div class="retro-botoes">
        <button class="botao botao--cheio" data-acao="compartilhar-retro" data-mes="${meses.anterior}">Retrospectiva de ${esc(nome(meses.anterior))}</button>
        <button class="botao botao--leve" data-acao="compartilhar-retro" data-mes="${meses.atual}">${esc(nome(meses.atual).replace(/^./, (c) => c.toUpperCase()))} até agora</button>
      </div>
    </section>`;
}

/** opcoes também (fase 21): meta (metaSemana), pessoas (conquistasPorPessoa), totalConquistas, meses ({ anterior, atual }). */
export function htmlPlacar(p, { nome, nDias, periodos, periodo, meta, pessoas, totalConquistas, meses }) {
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
        <button class="botao botao--leve rel-voltar" data-acao="vista" data-vista="resumo">‹ Resumo</button>
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
      ${secaoMeta(meta)}
      <section class="cartao rel-secao">
        <h3 class="rel-secao-titulo">Quem registrou a rotina</h3>
        ${p.total ? `<div class="placar-barra" role="img" aria-label="${esc(p.grupos.map((g) => `${g.rotulo} ${g.pct}%`).join(', '))}">${barra}</div>` : '<p class="vazio">Nenhum registro de rotina neste período.</p>'}
        <ul class="placar-legenda">${legenda}</ul>
      </section>
      <section class="cartao rel-secao">
        <h3 class="rel-secao-titulo">Ranking da família</h3>
        ${ranking}
      </section>
      ${secaoConquistas(pessoas, p.inicio, p.fim, totalConquistas)}
      ${p.marcos.length ? `<section class="cartao rel-secao"><h3 class="rel-secao-titulo">Marcos</h3><ul class="placar-marcos">${p.marcos.map((m) => `<li><time>${esc(fmtData(m.t))}</time> ${esc(m.texto)}</li>`).join('')}</ul></section>` : ''}
      ${numeros ? `<section class="cartao rel-secao"><h3 class="rel-secao-titulo">No período</h3><ul class="placar-numeros">${numeros}</ul></section>` : ''}
      ${secaoRetrospectiva(meses)}
      <p class="ajuda rel-nota">${esc(NOTA_PONTOS)} A imagem para a família não mostra temperatura, remédios nem sintomas (das anotações, só os marcos).</p>
    </div>`;
}

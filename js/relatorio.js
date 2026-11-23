// Relatório para a consulta (fases 12 e 18): o período escolhido num lugar só, para mostrar à pediatra, salvar em PDF
// ou mandar como imagem (js/imagem-relatorio.js). Começa pelo resumo (js/resumo.js), depois os gráficos; a tabela dia
// a dia e as listas ficam em "Detalhes", recolhidos (o PDF leva tudo).
// montarRelatorio é puro (testado em tests/regras.casos.js); htmlRelatorio só monta o texto da tela.
// Usa o que cada tipo já sabe dizer (resumoDia e resumo), então um tipo novo entra sozinho na tabela dia a dia.

import { chaveDia, somarDias, deDataHoraSP, fmtData, fmtHora, fmtNumero, numero } from './regras.js';
import { MEDIDAS, valor as valorMedida, textoDiferencas } from './tipos/medidas.js';
import { anotacoesEntre } from './tipos/anotacao.js';
import { resumoPeriodo, blocosResumo, seriesRelatorio } from './resumo.js';
import { graficoEvolucao } from './grafico.js';

export const PERIODOS = [['consulta', 'Desde a consulta'], [7, '7 dias'], [30, '30 dias'], [60, '60 dias']];
export const PERIODO_PADRAO = 'consulta';
const DIAS_SEM_CONSULTA = 30;
const DIAS_TABELA = 14; // a tabela dia a dia mostra no máximo os últimos 14 dias

/**
 * escolha: 'consulta' ou um número de dias. "Desde a consulta" começa no dia da última consulta antes de hoje (a de
 * hoje é a que está acontecendo); sem consulta registrada, 30 dias. → { nDias, consulta: instante | null }
 */
export function resolverPeriodo(ctx, escolha) {
  const hoje = chaveDia(ctx.agora);
  if (escolha === 'consulta') {
    const ultima = ctx.doTipo('consulta').filter((e) => chaveDia(e.t) < hoje).at(-1);
    if (!ultima) return { nDias: DIAS_SEM_CONSULTA, consulta: null };
    const dias = Math.round((Date.parse(`${hoje}T12:00:00Z`) - Date.parse(`${chaveDia(ultima.t)}T12:00:00Z`)) / 86400000) + 1;
    return { nDias: Math.max(2, dias), consulta: ultima.t };
  }
  return { nDias: Number(escolha) || 7, consulta: null };
}

const LIMITE_FEBRE_PADRAO = 37.8;
const ehRemedio = (t) => !!t.remedio || ['amoxicilina', 'tylenol', 'vacina'].includes(t.id);

/**
 * tipos: na ordem em que devem aparecer (rotina, remédios, febre…). nDias: dias inteiros até hoje (hoje conta).
 * → { dias, inicio, fim, colunas: [{ tipo, celulas: [resumoDia|null por dia] }], temperaturas, limite, remedios, medidas }
 * medidas: as do período e, antes delas, a última anterior ao período (antes: true), para comparar.
 * anotacoes: todas as do período (fase 17): [{ t, categoria, texto }].
 * resumo / anterior: resumoPeriodo do período e do período anterior de mesmo tamanho (fase 18); series: gráficos.
 * diasTabela: os dias da tabela dia a dia (no máximo os últimos 14).
 */
export function montarRelatorio(ctx, tipos, nDias) {
  const hoje = chaveDia(ctx.agora);
  const dias = Array.from({ length: nDias }, (_, i) => somarDias(hoje, i - nDias + 1));
  const inicio = deDataHoraSP(dias[0], '00:00');
  const fim = ctx.agora;
  const naJanela = (e) => e.t >= inicio && e.t <= fim;
  const visiveis = tipos.filter((t) => !t.interno);

  const diasTabela = dias.slice(-DIAS_TABELA);
  const colunas = visiveis
    .filter((t) => t.resumoDia && t.id !== 'medidas' && t.id !== 'anotacao') // têm seção própria
    .map((tipo) => ({ tipo, celulas: diasTabela.map((d) => tipo.resumoDia(ctx, d) || null) }))
    .filter((c) => c.celulas.some(Boolean));

  const temperaturas = ctx.doTipo('febre').filter(naJanela)
    .map((e) => ({ t: e.t, c: numero(e.dados.temperatura), obs: String(e.dados.observacao || '') }))
    .filter((m) => m.c !== null)
    .sort((a, b) => a.t - b.t);

  const remedios = visiveis.filter(ehRemedio)
    .map((tipo) => ({
      tipo,
      doses: ctx.doTipo(tipo.id).filter(naJanela).sort((a, b) => a.t - b.t)
        .map((e) => ({ t: e.t, texto: tipo.resumo ? tipo.resumo(e.dados, ctx, e).texto || '' : '' }))
    }))
    .filter((r) => r.doses.length);

  const medidas = [];
  if (visiveis.some((t) => t.id === 'medidas')) {
    const todas = ctx.doTipo('medidas').filter((e) => e.t <= fim);
    const anterior = todas.filter((e) => e.t < inicio).at(-1);
    for (const e of [...(anterior ? [anterior] : []), ...todas.filter(naJanela)]) {
      medidas.push({
        t: e.t,
        antes: e === anterior,
        valores: Object.fromEntries(MEDIDAS.map((m) => [m.id, valorMedida(e.dados, m.id)])),
        diferenca: textoDiferencas(ctx, e),
        obs: String(e.dados.observacao || '')
      });
    }
  }

  const anotacoes = visiveis.some((t) => t.id === 'anotacao') ? anotacoesEntre(ctx, inicio, fim) : [];

  const inicioAnterior = deDataHoraSP(somarDias(dias[0], -nDias), '00:00');
  return {
    dias, diasTabela, inicio, fim, colunas, temperaturas, limite: ctx.numeroConfig('febre_limite_c') ?? LIMITE_FEBRE_PADRAO,
    remedios, medidas, anotacoes,
    resumo: resumoPeriodo(ctx, visiveis, inicio, fim),
    anterior: resumoPeriodo(ctx, visiveis, inicioAnterior, inicio),
    series: seriesRelatorio(ctx, inicio, fim)
  };
}

// ---------------------------------------------------------------------------
// HTML
// ---------------------------------------------------------------------------

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const estiloCor = (tipo) => (tipo?.cor ? `style="--cor:${esc(tipo.cor)}"` : '');
const semanaIntl = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'America/Sao_Paulo' });
/** "2026-11-20" → "sex 20/11". Sem "hoje/ontem": o relatório pode ser lido (ou impresso) em outro dia. */
export const diaCurto = (dia) =>
  `${semanaIntl.format(Date.parse(`${dia}T12:00:00-03:00`)).replace('.', '')} ${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
const graus = (c) => `${fmtNumero(c)} °C`;

/** Período em texto: "20/11 a 22/11" (ou só "22/11"). */
export function textoPeriodo(rel) {
  const a = fmtData(rel.inicio);
  const b = fmtData(rel.fim);
  return a === b ? a : `${a} a ${b}`;
}

/**
 * Tela do relatório. opcoes: { nome, idade, escolha ('consulta' ou dias), nDias, consulta (instante|null), agora,
 * tipoFebre, tipoAntitermico, cores: { leite, sono, cocos, peso } }.
 * Ordem: dúvidas para a consulta, "Em resumo", gráficos e, recolhidos, os detalhes.
 */
export function htmlRelatorio(rel, opcoes) {
  const { nome, idade, escolha, nDias, agora } = opcoes;
  const chips = PERIODOS.map(([n, rotulo]) =>
    `<button class="chip ${n === escolha ? 'chip--ativo' : ''}" data-acao="periodo-relatorio" data-dias="${n}" aria-pressed="${n === escolha}">${esc(rotulo)}</button>`).join('');
  const vazio = !rel.colunas.length && !rel.temperaturas.length && !rel.remedios.length && !rel.medidas.some((m) => !m.antes) &&
    !rel.anotacoes.length;
  const detalhes = [secaoDias(rel), secaoTemperatura(rel, { ...opcoes, semGrafico: true }), secaoRemedios(rel, agora), secaoMedidas(rel), secaoAnotacoes(rel)].join('');
  return `
    <div class="relatorio">
      <div class="rel-barra nao-imprimir">
        <button class="botao botao--leve rel-voltar" data-acao="vista" data-vista="resumo">‹ Resumo</button>
        <span class="rel-acoes">
          <button class="botao botao--cheio rel-imagem" data-acao="compartilhar-relatorio">Enviar imagem</button>
          <button class="botao botao--leve rel-pdf" data-acao="imprimir-relatorio">Salvar em PDF</button>
        </span>
      </div>
      <div class="chips nao-imprimir" role="group" aria-label="Período">${chips}</div>
      <header class="rel-cabeca">
        <p class="rel-sobre">Relatório para a consulta</p>
        <h2 class="rel-titulo">${esc(nome || 'Rotina do bebê')}</h2>
        ${idade ? `<p class="rel-idade">${esc(idade)}</p>` : ''}
        <p class="rel-periodo">${esc(linhaPeriodo(rel, nDias, agora, opcoes.consulta))}</p>
      </header>
      ${vazio ? '<p class="vazio vazio--grande">Nenhum registro neste período.</p>' : `
        ${secaoPerguntas(rel)}
        ${secaoResumo(rel)}
        ${secaoGraficos(rel, opcoes)}
        ${detalhes ? `
          <details class="rel-detalhes" data-detalhes ${opcoes.detalhesAbertos ? 'open' : ''}>
            <summary class="cartao">Detalhes <span>dia a dia, temperaturas, doses, medidas e anotações</span></summary>
            ${detalhes}
          </details>` : ''}`}
      <p class="ajuda rel-nota">Feito a partir dos registros do app. Horários em 24h (Brasília). Comparações (↑ ↓) com os
        ${nDias} dias anteriores, só quando mudou 10% ou mais.</p>
    </div>`;
}

/** Dúvidas para a consulta (anotações do tipo Pergunta), no topo. */
function secaoPerguntas(rel) {
  const lista = rel.resumo.perguntas;
  if (!lista.length) return '';
  return `
    <section class="cartao rel-secao rel-perguntas">
      <h3 class="rel-secao-titulo">Dúvidas para a consulta</h3>
      <ul>${lista.map((p) => `<li>${esc(p.texto)} <small>${esc(fmtData(p.t))}</small></li>`).join('')}</ul>
    </section>`;
}

/** "Em resumo": um bloco por assunto, uma linha por número, com a seta quando mudou. */
function secaoResumo(rel) {
  const blocos = blocosResumo(rel.resumo, rel.anterior);
  return `
    <section class="cartao rel-secao rel-resumo-cartao">
      <h3 class="rel-secao-titulo">Em resumo</h3>
      ${blocos.map((b) => `
        <div class="rel-bloco">
          <p class="rel-bloco-titulo">${esc(b.titulo)}</p>
          <dl>${b.linhas.map((l) => `
            <div class="${l.alerta ? 'rel-alto' : ''}">
              <dt>${esc(l.rotulo)}</dt>
              <dd><strong>${esc(l.valor)}</strong>${l.comparacao ? ` <span class="rel-seta">${esc(l.comparacao.seta)} antes ${esc(l.comparacao.antes)}</span>` : ''}
                ${l.detalhe ? `<small>${esc(l.detalhe)}</small>` : ''}</dd>
            </div>`).join('')}</dl>
        </div>`).join('')}
    </section>`;
}

/** Gráficos pequenos lado a lado (por dia até 14 dias, por semana depois) e a temperatura, se houve medição. */
function secaoGraficos(rel, opcoes) {
  const cores = opcoes.cores || {};
  const graficos = rel.series.map((s) => graficoEvolucao(s.pontos, { rotulo: s.rotulo, fmt: s.fmt, fmtEixo: s.fmtEixo, cor: cores[s.id], desdeZero: s.desdeZero }));
  if (rel.temperaturas.length) {
    graficos.push(`<div class="grafico-temp" ${estiloCor(opcoes.tipoFebre)}><p class="graf-titulo">Temperatura (°C)</p>${graficoTemperatura(rel, dosesAntitermico(rel), opcoes.tipoAntitermico, opcoes.agora)}</div>`);
  }
  if (!graficos.length) return '';
  return `
    <section class="cartao rel-secao">
      <h3 class="rel-secao-titulo">Gráficos</h3>
      <div class="rel-graficos">${graficos.join('')}</div>
    </section>`;
}

function secaoDias(rel) {
  if (!rel.colunas.length) return '';
  const cabeca = rel.colunas.map(({ tipo }) =>
    `<th scope="col" ${estiloCor(tipo)}><span class="rel-col"><span class="icone icone--mini">${tipo.icone}</span>${esc(tipo.rotulo)}</span></th>`).join('');
  const linhas = rel.diasTabela.map((dia, i) => `
    <tr>
      <th scope="row">${esc(diaCurto(dia))}</th>
      ${rel.colunas.map(({ celulas }) => {
        const c = celulas[i];
        if (!c) return '<td class="rel-nada">—</td>';
        return `<td class="${c.destaque ? 'rel-alto' : ''}"><strong>${esc(c.valor)}</strong>${c.detalhe ? `<small>${esc(c.detalhe)}</small>` : ''}</td>`;
      }).join('')}
    </tr>`).join('');
  return `
    <section class="cartao rel-secao">
      <h3 class="rel-secao-titulo">Dia a dia${rel.diasTabela.length < rel.dias.length ? ` <small>(últimos ${rel.diasTabela.length} dias)</small>` : ''}</h3>
      <div class="rel-tabela-rolagem" tabindex="0" aria-label="Tabela dia a dia (role para o lado)">
        <table class="rel-tabela">
          <thead><tr><th scope="col">Dia</th>${cabeca}</tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
    </section>`;
}

/** Doses de antitérmico (Tylenol) do período, para marcar no gráfico. */
export const dosesAntitermico = (rel) => (rel.remedios.find((r) => r.tipo.id === 'tylenol')?.doses) || [];

/** "máxima 38,6 °C (25/10 09:00) · 2 medições · 1 a partir de 37,8 °C" */
export function resumoTemperatura(rel) {
  const temps = rel.temperaturas;
  const maxima = temps.reduce((m, x) => (x.c > m.c ? x : m), temps[0]);
  const acima = temps.filter((x) => x.c >= rel.limite).length;
  return [`máxima ${graus(maxima.c)} (${fmtData(maxima.t)} ${fmtHora(maxima.t)})`,
    `${temps.length} ${temps.length === 1 ? 'medição' : 'medições'}`,
    acima ? `${acima} a partir de ${graus(rel.limite)}` : `nenhuma a partir de ${graus(rel.limite)}`].join(' · ');
}

/** "20/11 a 22/11 · últimos 3 dias · gerado em 22/11 às 14:05" */
export const linhaPeriodo = (rel, nDias, agora, consulta = null) =>
  `${consulta ? `desde a consulta de ${fmtData(consulta)}` : nDias === 1 ? 'hoje' : `últimos ${nDias} dias`} · ${textoPeriodo(rel)} · gerado em ${fmtData(agora)} às ${fmtHora(agora)}`;

function secaoTemperatura(rel, { tipoFebre, tipoAntitermico, agora, semGrafico = false }) {
  if (!rel.temperaturas.length) return '';
  const temps = rel.temperaturas;
  const antitermico = dosesAntitermico(rel);
  const resumo = resumoTemperatura(rel);
  return `
    <section class="cartao rel-secao" ${estiloCor(tipoFebre)}>
      <h3 class="rel-secao-titulo">Temperatura</h3>
      <p class="rel-resumo">${esc(resumo)}</p>
      ${semGrafico ? '' : graficoTemperatura(rel, antitermico, tipoAntitermico, agora)}
      <ul class="rel-medicoes">
        ${temps.map((m) => `
          <li class="${m.c >= rel.limite ? 'rel-alto' : ''}">
            <time>${esc(fmtData(m.t))} ${esc(fmtHora(m.t))}</time>
            <strong>${esc(graus(m.c))}</strong>${m.obs ? `<span>${esc(m.obs)}</span>` : ''}
          </li>`).join('')}
      </ul>
    </section>`;
}

/**
 * Linha da temperatura ao longo do período, com a linha do limite de febre e, embaixo, as doses de antitérmico.
 * Uma série só (sem legenda da linha); as doses têm legenda porque são uma segunda marca.
 */
export function graficoTemperatura(rel, antitermico = [], tipoAntitermico = null, agora = rel.fim) {
  // viewBox estreito: no celular as letras ficam legíveis; em tela grande o CSS limita a largura.
  const W = 400, H = 230;
  const m = { esq: 38, dir: 10, topo: 22, base: antitermico.length ? 46 : 30 };
  const largura = W - m.esq - m.dir;
  const altura = H - m.topo - m.base;
  const valores = rel.temperaturas.map((x) => x.c);
  const yMin = Math.floor(Math.min(36, ...valores) * 2) / 2;
  const yMax = Math.ceil(Math.max(rel.limite + 0.5, ...valores) * 2) / 2;
  // Começa à meia-noite do dia da primeira medição (ou dose): dias sem nada antes disso não espremem o gráfico.
  const doPeriodo = antitermico.filter((d) => d.t >= rel.inicio && d.t <= rel.fim);
  const primeiro = Math.min(rel.temperaturas[0].t, ...doPeriodo.map((d) => d.t));
  const dias = rel.dias.filter((dia) => dia >= chaveDia(primeiro));
  const t0 = Math.max(rel.inicio, deDataHoraSP(dias[0], '00:00'));
  const t1 = Math.max(rel.fim, t0 + 3600000);
  const x = (t) => m.esq + ((t - t0) / (t1 - t0)) * largura;
  const y = (c) => m.topo + (1 - (c - yMin) / (yMax - yMin)) * altura;
  const r = (n) => Math.round(n * 10) / 10;

  const grade = [];
  for (let c = yMin; c <= yMax + 1e-9; c += 0.5) {
    grade.push(`<line class="graf-grade" x1="${m.esq}" x2="${W - m.dir}" y1="${r(y(c))}" y2="${r(y(c))}"/>` +
      `<text class="graf-eixo" x="${m.esq - 6}" y="${r(y(c)) + 4.5}" text-anchor="end">${fmtNumero(c)}</text>`);
  }
  // Meia-noite de cada dia: linha fina e o nome do dia.
  const diasMarcas = dias.map((dia, i) => {
    const ini = deDataHoraSP(dia, '00:00');
    const meio = (ini + Math.min(ini + 24 * 3600000, t1)) / 2; // meio da parte visível do dia (hoje vai até agora)
    const rotulo = dias.length > 4 ? dia.slice(8, 10) : `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
    return (i ? `<line class="graf-dia" x1="${r(x(ini))}" x2="${r(x(ini))}" y1="${m.topo}" y2="${H - m.base}"/>` : '') +
      `<text class="graf-eixo" x="${r(x(meio))}" y="${H - m.base + 17}" text-anchor="middle">${rotulo}</text>`;
  }).join('');
  const yLim = r(y(rel.limite));
  const limite = `<line class="graf-limite" x1="${m.esq}" x2="${W - m.dir}" y1="${yLim}" y2="${yLim}"/>` +
    `<text class="graf-limite-texto" x="${m.esq + 4}" y="${yLim - 5}" text-anchor="start">febre ${fmtNumero(rel.limite)}</text>`;
  const pontos = rel.temperaturas.map((p) => [r(x(p.t)), r(y(p.c)), p]);
  const linha = pontos.length > 1 ? `<polyline class="graf-linha" points="${pontos.map(([a, b]) => `${a},${b}`).join(' ')}"/>` : '';
  const maxima = rel.temperaturas.reduce((mx, p) => (p.c > mx.c ? p : mx), rel.temperaturas[0]);
  const marcas = pontos.map(([a, b, p]) => `
    <g class="graf-ponto ${p.c >= rel.limite ? 'graf-ponto--alto' : ''}" tabindex="0">
      <circle class="graf-alvo" cx="${a}" cy="${b}" r="12"/>
      <circle cx="${a}" cy="${b}" r="4.5"/>
      <title>${esc(`${fmtData(p.t)} ${fmtHora(p.t)} · ${graus(p.c)}`)}</title>
    </g>`).join('');
  const [mxX, mxY] = pontos[rel.temperaturas.indexOf(maxima)];
  const rotuloMax = `<text class="graf-rotulo" x="${mxX}" y="${mxY - 10}" text-anchor="${mxX > W - 70 ? 'end' : mxX < m.esq + 30 ? 'start' : 'middle'}">${fmtNumero(maxima.c)}</text>`;
  const yDose = H - m.base + 32;
  const doses = doPeriodo.map((d) => `
    <g class="graf-dose" ${estiloCor(tipoAntitermico)}>
      <path d="M${r(x(d.t))} ${yDose - 6} l5 9 h-10 z"/>
      <title>${esc(`${tipoAntitermico?.rotulo || 'Antitérmico'} ${fmtData(d.t)} ${fmtHora(d.t)}${d.texto ? ` · ${d.texto}` : ''}`)}</title>
    </g>`).join('');
  const legenda = antitermico.length
    ? `<p class="graf-legenda"><span class="graf-legenda-linha"></span>Temperatura (°C)<span class="graf-legenda-dose" ${estiloCor(tipoAntitermico)}></span>${esc(tipoAntitermico?.rotulo || 'Antitérmico')}</p>`
    : '';
  return `
    <figure class="grafico">
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`Temperatura de ${textoPeriodo(rel)}: máxima ${graus(maxima.c)}. Os valores estão na lista abaixo.`)}">
        ${grade.join('')}${diasMarcas}${limite}${linha}${marcas}${rotuloMax}${doses}
      </svg>
      ${legenda}
    </figure>`;
}

function secaoRemedios(rel, agora) {
  if (!rel.remedios.length) return '';
  const porDia = (doses) => {
    const grupos = new Map();
    for (const d of doses) {
      const dia = chaveDia(d.t);
      if (!grupos.has(dia)) grupos.set(dia, []);
      grupos.get(dia).push(d);
    }
    return [...grupos.entries()];
  };
  return `
    <section class="cartao rel-secao">
      <h3 class="rel-secao-titulo">Remédios e vacinas</h3>
      ${rel.remedios.map(({ tipo, doses }) => `
        <div class="rel-remedio" ${estiloCor(tipo)}>
          <p class="rel-remedio-nome"><span class="icone icone--mini">${tipo.icone}</span>${esc(tipo.rotulo)}
            <span class="rel-remedio-conta">${doses.length} ${tipo.id === 'vacina' ? (doses.length === 1 ? 'registro' : 'registros') : (doses.length === 1 ? 'dose' : 'doses')}</span></p>
          <dl class="rel-doses">
            ${porDia(doses).map(([dia, lista]) => `
              <div><dt>${esc(diaCurto(dia))}</dt>
                <dd>${lista.map((d) => `${esc(fmtHora(d.t))}${d.texto ? ` <span>(${esc(d.texto)})</span>` : ''}`).join(', ')}</dd></div>`).join('')}
          </dl>
        </div>`).join('')}
    </section>`;
}

/** Colunas de medida com algum valor (peso, altura, cabeça). */
export const colunasMedidas = (rel) => MEDIDAS.filter((m) => rel.medidas.some((x) => x.valores[m.id] !== null));
/** "sex 20/11" ou "10/11 (antes do período)" */
export const quandoMedida = (x) => (x.antes ? `${fmtData(x.t)} (antes do período)` : diaCurto(chaveDia(x.t)));

function secaoMedidas(rel) {
  if (!rel.medidas.length) return '';
  const cols = colunasMedidas(rel);
  const temDif = rel.medidas.some((x) => x.diferenca);
  const temExtra = temDif || rel.medidas.some((x) => x.obs);
  const linhas = rel.medidas.map((x) => `
    <tr>
      <th scope="row" class="${x.antes ? 'rel-antes' : ''}">${esc(quandoMedida(x))}</th>
      ${cols.map((m) => `<td class="${x.antes ? 'rel-antes' : ''}">${x.valores[m.id] === null ? '—' : `<strong>${esc(m.fmt(x.valores[m.id]))}</strong>`}</td>`).join('')}
      ${temExtra ? `<td>${!x.antes && x.diferenca ? `<small>${esc(x.diferenca)}</small>` : ''}${x.obs ? `<small>${esc(x.obs)}</small>` : ''}</td>` : ''}
    </tr>`).join('');
  return `
    <section class="cartao rel-secao">
      <h3 class="rel-secao-titulo">Medidas</h3>
      <div class="rel-tabela-rolagem" tabindex="0" aria-label="Medidas (role para o lado)">
        <table class="rel-tabela">
          <thead><tr><th scope="col">Dia</th>${cols.map((m) => `<th scope="col">${esc(m.rotulo)}</th>`).join('')}${temExtra ? `<th scope="col">${temDif ? 'Mudança' : 'Observação'}</th>` : ''}</tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
    </section>`;
}

/** Anotações agrupadas por dia: [[dia, [anotação...]]]. */
export function anotacoesPorDia(rel) {
  const grupos = new Map();
  for (const a of rel.anotacoes) {
    const dia = chaveDia(a.t);
    if (!grupos.has(dia)) grupos.set(dia, []);
    grupos.get(dia).push(a);
  }
  return [...grupos];
}

function secaoAnotacoes(rel) {
  if (!rel.anotacoes.length) return '';
  return `
    <section class="cartao rel-secao">
      <h3 class="rel-secao-titulo">Anotações</h3>
      <dl class="rel-anotacoes">
        ${anotacoesPorDia(rel).map(([dia, lista]) => `
          <div>
            <dt>${esc(diaCurto(dia))}</dt>
            <dd><ul>${lista.map((a) => `
              <li class="${a.categoria === 'Sintoma' ? 'rel-alto' : ''}">
                <time>${esc(fmtHora(a.t))}</time>
                ${a.categoria !== 'Outro' ? `<strong>${esc(a.categoria)}</strong>` : ''}
                <span>${esc(a.texto)}</span>
              </li>`).join('')}</ul></dd>
          </div>`).join('')}
      </dl>
    </section>`;
}

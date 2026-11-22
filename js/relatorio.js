// Relatório para a consulta (fase 12): o período escolhido num lugar só, para mostrar ao pediatra ou salvar em PDF.
// montarRelatorio é puro (testado em tests/regras.casos.js); htmlRelatorio só monta o texto da tela.
// Usa o que cada tipo já sabe dizer (resumoDia e resumo), então um tipo novo entra sozinho na tabela dia a dia.

import { chaveDia, somarDias, deDataHoraSP, fmtData, fmtHora, fmtNumero, numero } from './regras.js';

export const PERIODOS = [[1, 'Hoje'], [3, '3 dias'], [7, '7 dias'], [14, '14 dias']];
export const PERIODO_PADRAO = 3;

const LIMITE_FEBRE_PADRAO = 37.8;
const ehRemedio = (t) => !!t.remedio || ['amoxicilina', 'tylenol', 'vacina'].includes(t.id);

/**
 * tipos: na ordem em que devem aparecer (rotina, remédios, febre…). nDias: dias inteiros até hoje (hoje conta).
 * → { dias, inicio, fim, colunas: [{ tipo, celulas: [resumoDia|null por dia] }], temperaturas, limite, remedios }
 */
export function montarRelatorio(ctx, tipos, nDias) {
  const hoje = chaveDia(ctx.agora);
  const dias = Array.from({ length: nDias }, (_, i) => somarDias(hoje, i - nDias + 1));
  const inicio = deDataHoraSP(dias[0], '00:00');
  const fim = ctx.agora;
  const naJanela = (e) => e.t >= inicio && e.t <= fim;
  const visiveis = tipos.filter((t) => !t.interno);

  const colunas = visiveis
    .filter((t) => t.resumoDia)
    .map((tipo) => ({ tipo, celulas: dias.map((d) => tipo.resumoDia(ctx, d) || null) }))
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

  return { dias, inicio, fim, colunas, temperaturas, limite: ctx.numeroConfig('febre_limite_c') ?? LIMITE_FEBRE_PADRAO, remedios };
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
 * Tela do relatório. opcoes: { nome, nDias, agora, tipoFebre, tipoAntitermico }.
 */
export function htmlRelatorio(rel, opcoes) {
  const { nome, nDias, agora } = opcoes;
  const chips = PERIODOS.map(([n, rotulo]) =>
    `<button class="chip ${n === nDias ? 'chip--ativo' : ''}" data-acao="periodo-relatorio" data-dias="${n}" ${n === nDias ? 'aria-pressed="true"' : 'aria-pressed="false"'}>${esc(rotulo)}</button>`).join('');
  const vazio = !rel.colunas.length && !rel.temperaturas.length && !rel.remedios.length;
  return `
    <div class="relatorio">
      <div class="rel-barra nao-imprimir">
        <button class="botao botao--leve rel-voltar" data-acao="vista" data-vista="historico">‹ Histórico</button>
        <button class="botao botao--cheio rel-pdf" data-acao="imprimir-relatorio">Salvar em PDF</button>
      </div>
      <div class="chips nao-imprimir" role="group" aria-label="Período">${chips}</div>
      <header class="rel-cabeca">
        <p class="rel-sobre">Relatório para a consulta</p>
        <h2 class="rel-titulo">${esc(nome || 'Rotina do bebê')}</h2>
        <p class="rel-periodo">${esc(textoPeriodo(rel))} · ${nDias === 1 ? 'hoje' : `últimos ${nDias} dias`} · gerado em ${esc(fmtData(agora))} às ${esc(fmtHora(agora))}</p>
      </header>
      ${vazio ? '<p class="vazio vazio--grande">Nenhum registro neste período.</p>' : ''}
      ${secaoDias(rel, agora)}
      ${secaoTemperatura(rel, opcoes)}
      ${secaoRemedios(rel, agora)}
      <p class="ajuda rel-nota">Feito a partir dos registros do app. Horários em 24h (Brasília).</p>
    </div>`;
}

function secaoDias(rel, agora) {
  if (!rel.colunas.length) return '';
  const cabeca = rel.colunas.map(({ tipo }) =>
    `<th scope="col" ${estiloCor(tipo)}><span class="rel-col"><span class="icone icone--mini">${tipo.icone}</span>${esc(tipo.rotulo)}</span></th>`).join('');
  const linhas = rel.dias.map((dia, i) => `
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
      <h3 class="rel-secao-titulo">Dia a dia</h3>
      <div class="rel-tabela-rolagem" tabindex="0" aria-label="Tabela dia a dia (role para o lado)">
        <table class="rel-tabela">
          <thead><tr><th scope="col">Dia</th>${cabeca}</tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
    </section>`;
}

function secaoTemperatura(rel, { tipoFebre, tipoAntitermico, agora }) {
  if (!rel.temperaturas.length) return '';
  const temps = rel.temperaturas;
  const maxima = temps.reduce((m, x) => (x.c > m.c ? x : m), temps[0]);
  const acima = temps.filter((x) => x.c >= rel.limite).length;
  const antitermico = (rel.remedios.find((r) => r.tipo.id === 'tylenol')?.doses) || [];
  const resumo = [`máxima ${graus(maxima.c)} (${fmtData(maxima.t)} ${fmtHora(maxima.t)})`,
    `${temps.length} ${temps.length === 1 ? 'medição' : 'medições'}`,
    acima ? `${acima} a partir de ${graus(rel.limite)}` : `nenhuma a partir de ${graus(rel.limite)}`].join(' · ');
  return `
    <section class="cartao rel-secao" ${estiloCor(tipoFebre)}>
      <h3 class="rel-secao-titulo">Temperatura</h3>
      <p class="rel-resumo">${esc(resumo)}</p>
      ${graficoTemperatura(rel, antitermico, tipoAntitermico, agora)}
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

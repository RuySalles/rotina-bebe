// Gráfico de evolução (fase 14): uma linha ao longo do tempo, ex. peso. SVG com as mesmas classes do gráfico da
// temperatura (graf-*), então as cores vêm do CSS e funcionam no tema claro e escuro.
// Sem faixas de referência nem curvas de crescimento: só os valores registrados.

import { fmtData } from './regras.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r1 = (n) => Math.round(n * 10) / 10;

/** "Bonita" escala: passo 1, 2 ou 5 × 10^n que dá ~4 linhas. */
function passoEscala(amplitude) {
  const bruto = amplitude / 4;
  const base = 10 ** Math.floor(Math.log10(bruto));
  return [1, 2, 5, 10].map((m) => m * base).find((p) => p >= bruto) || base * 10;
}

/**
 * pontos: [{ t, v }] em ordem de tempo. opcoes: { rotulo, fmt(v) → texto, fmtEixo?(v), cor }.
 * Um ponto só: mostra o ponto e o valor. Rótulo em todos os pontos até 6; depois, só no último e no maior.
 */
export function graficoEvolucao(pontos, { rotulo, fmt, fmtEixo, cor }) {
  const W = 400, H = 190;
  const m = { esq: 44, dir: 18, topo: 24, base: 30 };
  const largura = W - m.esq - m.dir;
  const altura = H - m.topo - m.base;
  const vs = pontos.map((p) => p.v);
  let vMin = Math.min(...vs), vMax = Math.max(...vs);
  if (vMax - vMin < 1e-9) { const folga = Math.max(Math.abs(vMax) * 0.05, 0.5); vMin -= folga; vMax += folga; }
  const passo = passoEscala(vMax - vMin);
  const yMin = Math.floor(vMin / passo) * passo;
  const yMax = Math.ceil(vMax / passo) * passo;
  const t0 = pontos[0].t, t1 = pontos.at(-1).t;
  const um = t1 === t0;
  const x = (t) => (um ? m.esq + largura / 2 : m.esq + ((t - t0) / (t1 - t0)) * largura);
  const y = (v) => m.topo + (1 - (v - yMin) / (yMax - yMin)) * altura;
  const eixo = fmtEixo || ((v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 }));

  const grade = [];
  for (let v = yMin; v <= yMax + passo * 1e-6; v += passo) {
    grade.push(`<line class="graf-grade" x1="${m.esq}" x2="${W - m.dir}" y1="${r1(y(v))}" y2="${r1(y(v))}"/>` +
      `<text class="graf-eixo" x="${m.esq - 6}" y="${r1(y(v)) + 4.5}" text-anchor="end">${esc(eixo(v))}</text>`);
  }
  // Datas: primeira e última (e a do meio, se houver espaço).
  const datas = um ? [pontos[0]] : [pontos[0], ...(pontos.length > 2 ? [pontos[Math.floor(pontos.length / 2)]] : []), pontos.at(-1)];
  const rotDatas = datas.map((p, i) => {
    const ancora = um ? 'middle' : i === 0 ? 'start' : i === datas.length - 1 ? 'end' : 'middle';
    return `<text class="graf-eixo" x="${r1(x(p.t))}" y="${H - m.base + 18}" text-anchor="${ancora}">${esc(fmtData(p.t))}</text>`;
  }).join('');
  const coords = pontos.map((p) => [r1(x(p.t)), r1(y(p.v)), p]);
  const linha = coords.length > 1 ? `<polyline class="graf-linha" points="${coords.map(([a, b]) => `${a},${b}`).join(' ')}"/>` : '';
  const maior = pontos.reduce((mx, p) => (p.v > mx.v ? p : mx), pontos[0]);
  const comRotulo = (p, i) => pontos.length <= 6 || i === pontos.length - 1 || p === maior;
  const marcas = coords.map(([a, b, p], i) => `
    <g class="graf-ponto" tabindex="0">
      <circle class="graf-alvo" cx="${a}" cy="${b}" r="12"/>
      <circle cx="${a}" cy="${b}" r="4.5"/>
      <title>${esc(`${fmtData(p.t)} · ${fmt(p.v)}`)}</title>
    </g>
    ${comRotulo(p, i) ? `<text class="graf-rotulo graf-rotulo--leve" x="${a}" y="${b - 10}" text-anchor="${a > W - 50 ? 'end' : a < m.esq + 30 ? 'start' : 'middle'}">${esc(eixo(p.v))}</text>` : ''}`).join('');
  const ultimo = pontos.at(-1);
  return `
    <figure class="grafico grafico--evolucao" ${cor ? `style="--cor:${esc(cor)}"` : ''}>
      <figcaption class="graf-titulo">${esc(rotulo)}</figcaption>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`${rotulo}: ${pontos.length} ${pontos.length === 1 ? 'medida' : 'medidas'}, a última ${fmt(ultimo.v)} em ${fmtData(ultimo.t)}.`)}">
        ${grade.join('')}${rotDatas}${linha}${marcas}
      </svg>
    </figure>`;
}

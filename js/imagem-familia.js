// Imagem para o grupo da família (fase 13): quem registrou a rotina, pódio da família e números leves.
// Nunca mostra temperatura, remédios nem sintomas (só usa o montarPlacar: rotina e marcos). Sempre clara.

import { COR, FONTE_TITULO, fonte, quebrar, retanguloArredondado, bolinha, escrever, medir, paraBlob } from './desenho.js';
import { tituloPlacar, textoRegistros, MEDALHAS } from './familia.js';
import { fmtData } from './regras.js';

const LARGURA = 1080, MARGEM = 56, PAD = 40, ESPACO = 28;

/** Mistura a cor com branco (0 = cor, 1 = branco), para o fundo dos degraus do pódio. */
function clarear(hex, quanto) {
  const n = parseInt(hex.slice(1), 16);
  const canal = (v) => Math.round(v + (255 - v) * quanto);
  return `rgb(${canal(n >> 16)}, ${canal((n >> 8) & 255)}, ${canal(n & 255)})`;
}

function cartao(cx, y, h) {
  cx.fillStyle = COR.superficie;
  retanguloArredondado(cx, MARGEM, y, LARGURA - 2 * MARGEM, h, 32);
  cx.fill();
  cx.strokeStyle = COR.linha;
  cx.lineWidth = 1.5;
  cx.stroke();
}

function centro(cx, texto, x, y, cor, fonteCss) {
  cx.textAlign = 'center';
  escrever(cx, [texto], x, y, 0, cor, fonteCss);
  cx.textAlign = 'left';
}

/** p: montarPlacar(...). opcoes: { nome, nDias, periodo, medalhas? (medalhasNovas do período, fase 21) }. → Blob png */
export async function imagemFamilia(p, { nome, nDias, periodo, medalhas = [] }) {
  const c = medir();
  const larg = LARGURA - 2 * MARGEM;
  const interno = larg - 2 * PAD;

  // ---- alturas ----
  const hCab = MARGEM + 34 + 74 + 40 + 16;
  const hPlacar = PAD + 50 + 48 + 28 + 120 + PAD;
  const podio = p.ranking.slice(0, 3);
  const resto = p.ranking.slice(3, 8);
  const sobra = p.ranking.length - 8;
  const DEGRAU = [210, 160, 120]; // 1º, 2º, 3º
  const larguraDegrau = Math.min(260, (interno - 40) / 3);
  c.font = fonte(650, 28);
  const nomesPodio = podio.map((r) => quebrar(c, r.nome, larguraDegrau + 20, 2));
  const hNomes = Math.max(0, ...nomesPodio.map((l) => l.length)) * 34;
  const hPodio = podio.length ? hNomes + 70 + DEGRAU[0] : 0;
  const hResto = resto.length * 56 + (sobra > 0 ? 44 : 0);
  c.font = fonte(400, 24);
  const vazio = quebrar(c, 'Ninguém da família registrou neste período. Que tal ajudar na próxima?', interno);
  const hRanking = PAD + 50 + (podio.length ? hPodio + (hResto ? 24 + hResto : 0) : vazio.length * 34) + PAD;
  c.font = fonte(400, 26);
  const textoNumeros = p.numeros.map((n) => `${n.n} ${n.rotulo}`).join('  ·  ');
  const linhasNumeros = textoNumeros ? quebrar(c, textoNumeros, larg) : [];
  const hNumeros = linhasNumeros.length ? linhasNumeros.length * 36 + 8 : 0;
  // Marcos do período (fase 17): até 5, os mais recentes; nunca sintomas.
  const marcos = (p.marcos || []).slice(-5);
  c.font = fonte(400, 24);
  const linhasMarcos = marcos.map((m) => quebrar(c, m.texto, interno - 110, 2));
  const hMarcos = marcos.length ? PAD + 50 + linhasMarcos.reduce((s, l) => s + l.length * 32 + 14, 0) + PAD - 14 : 0;
  // Medalhas novas do período (fase 21): até 6.
  const novas = medalhas.slice(0, 6);
  const hMedalhas = novas.length ? PAD + 50 + novas.length * 44 + PAD - 8 : 0;
  const hRod = 150;
  const altura = hCab + hPlacar + ESPACO + hRanking + ESPACO + (hMedalhas ? hMedalhas + ESPACO : 0) + (hMarcos ? hMarcos + ESPACO : 0) + hNumeros + hRod;

  const canvas = document.createElement('canvas');
  canvas.width = LARGURA;
  canvas.height = Math.ceil(altura);
  const cx = canvas.getContext('2d');
  cx.fillStyle = COR.fundo;
  cx.fillRect(0, 0, LARGURA, canvas.height);

  // ---- cabeçalho ----
  let y = MARGEM;
  escrever(cx, [tituloPlacar(nDias).toUpperCase()], MARGEM, y, 0, COR.primaria, fonte(700, 24));
  y += 34;
  c.font = fonte(600, 60, FONTE_TITULO);
  escrever(cx, quebrar(c, nome || 'Nosso bebê', larg, 1), MARGEM, y, 0, COR.texto, fonte(600, 60, FONTE_TITULO));
  y += 74;
  escrever(cx, [periodo], MARGEM, y, 0, COR.texto2, fonte(400, 26));
  y = hCab;

  // ---- quem registrou a rotina ----
  cartao(cx, y, hPlacar);
  let yi = y + PAD;
  const x0 = MARGEM + PAD;
  escrever(cx, ['Quem registrou a rotina'], x0, yi, 0, COR.texto, fonte(650, 32));
  yi += 50;
  cx.save();
  retanguloArredondado(cx, x0, yi, interno, 48, 24);
  cx.clip();
  cx.fillStyle = '#ebe5dc';
  cx.fillRect(x0, yi, interno, 48);
  let xb = x0;
  for (const g of p.grupos) {
    if (!g.pontos) continue;
    const w = (interno * g.pct) / 100;
    cx.fillStyle = g.cor;
    cx.fillRect(xb, yi, w + 1, 48);
    xb += w;
  }
  cx.restore();
  yi += 48 + 28;
  const colW = interno / 3;
  p.grupos.forEach((g, i) => {
    const x = x0 + i * colW;
    bolinha(cx, x + 10, yi + 16, g.cor, 10);
    escrever(cx, [g.rotulo], x + 30, yi, 0, COR.texto, fonte(650, 28));
    escrever(cx, [`${g.pct}%`], x, yi + 40, 0, COR.texto, fonte(700, 52));
    escrever(cx, [textoRegistros(g.pontos)], x, yi + 98, 0, COR.texto2, fonte(400, 22));
  });
  y += hPlacar + ESPACO;

  // ---- ranking da família ----
  cartao(cx, y, hRanking);
  yi = y + PAD;
  escrever(cx, ['Ranking da família'], x0, yi, 0, COR.texto, fonte(650, 32));
  yi += 50;
  if (!podio.length) {
    escrever(cx, vazio, x0, yi, 34, COR.texto2, fonte(400, 24));
  } else {
    // Ordem no pódio: 2º à esquerda, 1º no meio, 3º à direita.
    const meio = MARGEM + larg / 2;
    const posicoes = [meio, meio - larguraDegrau - 20, meio + larguraDegrau + 20];
    const base = yi + hPodio;
    podio.forEach((r, i) => {
      const xc = posicoes[i];
      const m = Math.min(r.pos, 3) - 1; // empate: mesma medalha e mesmo degrau
      const h = DEGRAU[m];
      const topo = base - h;
      cx.fillStyle = clarear(MEDALHAS[m], 0.75);
      retanguloArredondado(cx, xc - larguraDegrau / 2, topo, larguraDegrau, h + 2, 18);
      cx.fill();
      cx.fillStyle = '#ffffff';
      // medalha
      bolinha(cx, xc, topo, '#ffffff', 31);
      bolinha(cx, xc, topo, MEDALHAS[m], 26);
      cx.textBaseline = 'middle';
      cx.textAlign = 'center';
      cx.font = fonte(800, 28);
      cx.fillStyle = '#ffffff';
      cx.fillText(String(r.pos), xc, topo + 1);
      cx.textAlign = 'left';
      // nome acima da medalha
      const linhas = nomesPodio[i];
      linhas.forEach((l, k) => centro(cx, l, xc, topo - 40 - (linhas.length - k) * 34, COR.texto, fonte(650, 28)));
      // pontos dentro do degrau
      centro(cx, String(r.pontos), xc, topo + 40, COR.texto, fonte(800, 50));
      centro(cx, r.pontos === 1 ? 'registro' : 'registros', xc, topo + 98, COR.texto2, fonte(400, 22));
    });
    yi = base + 24;
    resto.forEach((r, k) => {
      const yl = yi + k * 56;
      cx.fillStyle = COR.linha;
      cx.fillRect(x0, yl, interno, 1.5);
      escrever(cx, [`${r.pos}.`], x0, yl + 14, 0, COR.texto2, fonte(650, 26));
      c.font = fonte(600, 26);
      escrever(cx, quebrar(c, r.nome, interno - 260, 1), x0 + 50, yl + 14, 0, COR.texto, fonte(600, 26));
      cx.textAlign = 'right';
      escrever(cx, [textoRegistros(r.pontos)], x0 + interno, yl + 16, 0, COR.texto2, fonte(400, 24));
      cx.textAlign = 'left';
    });
    if (sobra > 0) {
      escrever(cx, [`e mais ${sobra} ${sobra === 1 ? 'pessoa' : 'pessoas'}`], x0 + 50, yi + resto.length * 56 + 12, 0, COR.texto2, fonte(400, 22));
    }
  }
  y += hRanking + ESPACO;

  // ---- medalhas novas ----
  if (hMedalhas) {
    desenharMedalhas(cx, y, hMedalhas, 'Medalhas novas', novas, interno);
    y += hMedalhas + ESPACO;
  }

  // ---- marcos ----
  if (hMarcos) {
    cartao(cx, y, hMarcos);
    let ym = y + PAD;
    escrever(cx, [p.marcos.length > marcos.length ? 'Marcos (os mais recentes)' : 'Marcos'], x0, ym, 0, COR.texto, fonte(650, 32));
    ym += 50;
    marcos.forEach((m, k) => {
      bolinha(cx, x0 + 8, ym + 14, MEDALHAS[0], 7);
      escrever(cx, [fmtData(m.t)], x0 + 26, ym, 0, COR.texto2, fonte(600, 22));
      escrever(cx, linhasMarcos[k], x0 + 110, ym - 2, 32, COR.texto, fonte(400, 24));
      ym += linhasMarcos[k].length * 32 + 14;
    });
    y += hMarcos + ESPACO;
  }

  // ---- números leves ----
  if (linhasNumeros.length) {
    linhasNumeros.forEach((l, k) => centro(cx, l, LARGURA / 2, y + k * 36, COR.texto2, fonte(400, 26)));
    y += hNumeros;
  }

  // ---- rodapé ----
  centro(cx, 'Valeu, família!', LARGURA / 2, y + 22, COR.primaria, fonte(600, 44, FONTE_TITULO));
  centro(cx, 'Contam alimentação, sono, fralda e banho.', LARGURA / 2, y + 90, COR.texto3, fonte(400, 20));

  return paraBlob(canvas);
}

/** Cartão com medalhas: "🌙  Plantão da madrugada ........ Vó Ana". */
function desenharMedalhas(cx, y, h, titulo, lista, interno) {
  const x0 = MARGEM + PAD;
  cartao(cx, y, h);
  let ym = y + PAD;
  escrever(cx, [titulo], x0, ym, 0, COR.texto, fonte(650, 32));
  ym += 50;
  for (const m of lista) {
    escrever(cx, [`${m.emoji}  ${m.rotulo}`], x0, ym, 0, COR.texto, fonte(600, 26));
    cx.textAlign = 'right';
    escrever(cx, [m.nome], x0 + interno, ym + 2, 0, COR.texto2, fonte(400, 24));
    cx.textAlign = 'left';
    ym += 44;
  }
}

/** Cartão com marcos: data à esquerda, texto à direita. linhas: texto já quebrado de cada marco. */
function desenharMarcos(cx, y, h, titulo, marcos, linhas) {
  const x0 = MARGEM + PAD;
  cartao(cx, y, h);
  let ym = y + PAD;
  escrever(cx, [titulo], x0, ym, 0, COR.texto, fonte(650, 32));
  ym += 50;
  marcos.forEach((m, k) => {
    bolinha(cx, x0 + 8, ym + 14, MEDALHAS[0], 7);
    escrever(cx, [fmtData(m.t)], x0 + 26, ym, 0, COR.texto2, fonte(600, 22));
    escrever(cx, linhas[k], x0 + 110, ym - 2, 32, COR.texto, fonte(400, 24));
    ym += linhas[k].length * 32 + 14;
  });
}

// ---------------------------------------------------------------------------
// Retrospectiva do mês (fase 21)
// ---------------------------------------------------------------------------

const horasMin = (min) => { const h = Math.floor(min / 60), m = Math.round(min % 60); return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`; };
const diaMes = (dia) => dia.split('-').reverse().slice(0, 2).join('/');

/** r: retrospectiva(...). opcoes: { nome }. Sem temperatura, remédios nem sintomas. → Blob png */
export async function imagemRetrospectiva(r, { nome }) {
  const c = medir();
  const larg = LARGURA - 2 * MARGEM;
  const interno = larg - 2 * PAD;
  const emojiNumero = { mamadeiras: '🥛', fraldas: '🧷', banhos: '🛁' };
  const destaques = [
    r.noiteMaisLonga && { emoji: '🌙', titulo: 'Noite mais longa', valor: horasMin(r.noiteMaisLonga.min), detalhe: fmtData(r.noiteMaisLonga.t) },
    r.recordeLeite && { emoji: '🍼', titulo: 'Recorde de leite', valor: `${r.recordeLeite.ml} mL`, detalhe: diaMes(r.recordeLeite.dia) },
    r.sonoPorDia && { emoji: '😴', titulo: 'Sono por dia', valor: horasMin(r.sonoPorDia * 60), detalhe: 'em média' },
    ...r.placar.numeros.filter((n) => emojiNumero[n.id]).map((n) => ({
      emoji: emojiNumero[n.id], titulo: n.rotulo.replace(/^./, (x) => x.toUpperCase()), valor: String(n.n), detalhe: 'no mês'
    }))
  ].filter(Boolean).slice(0, 6);
  const colW = (larg - 24) / 2, hCartao = 150;
  const hDestaques = Math.ceil(destaques.length / 2) * (hCartao + 20);
  const top = r.placar.ranking[0];
  const hAjuda = r.placar.total ? PAD + 50 + 40 + (top ? 40 : 0) + PAD : 0;
  const marcos = r.marcos.slice(-4);
  c.font = fonte(400, 24);
  const linhasMarcos = marcos.map((m) => quebrar(c, m.texto, interno - 110, 2));
  const hMarcos = marcos.length ? PAD + 50 + linhasMarcos.reduce((s, l) => s + l.length * 32 + 14, 0) + PAD - 14 : 0;
  const medalhas = r.medalhas.slice(0, 5);
  const hMedalhas = medalhas.length ? PAD + 50 + medalhas.length * 44 + PAD - 8 : 0;
  const hCab = MARGEM + 34 + 74 + 40 + 16;
  const soma = (h) => (h ? h + ESPACO : 0);
  const altura = hCab + hDestaques + ESPACO + soma(hAjuda) + soma(hMarcos) + soma(hMedalhas) + 120;

  const canvas = document.createElement('canvas');
  canvas.width = LARGURA;
  canvas.height = Math.ceil(altura);
  const cx = canvas.getContext('2d');
  cx.fillStyle = COR.fundo;
  cx.fillRect(0, 0, LARGURA, canvas.height);
  const x0 = MARGEM + PAD;

  let y = MARGEM;
  escrever(cx, [`RETROSPECTIVA DE ${r.nome.toUpperCase()}${r.completo ? '' : ' (ATÉ AGORA)'}`], MARGEM, y, 0, COR.primaria, fonte(700, 24));
  y += 34;
  c.font = fonte(600, 60, FONTE_TITULO);
  escrever(cx, quebrar(c, nome || 'Nosso bebê', larg, 1), MARGEM, y, 0, COR.texto, fonte(600, 60, FONTE_TITULO));
  y += 74;
  escrever(cx, [`${fmtData(r.inicio)} a ${fmtData(r.fim)}`], MARGEM, y, 0, COR.texto2, fonte(400, 26));
  y = hCab;

  destaques.forEach((d, i) => {
    const xx = i % 2 ? MARGEM + colW + 24 : MARGEM;
    const yy = y + Math.floor(i / 2) * (hCartao + 20);
    cx.fillStyle = COR.superficie;
    retanguloArredondado(cx, xx, yy, colW, hCartao, 28);
    cx.fill();
    cx.strokeStyle = COR.linha;
    cx.lineWidth = 1.5;
    cx.stroke();
    escrever(cx, [`${d.emoji}  ${d.titulo}`], xx + 28, yy + 24, 0, COR.texto2, fonte(600, 22));
    escrever(cx, [d.valor], xx + 28, yy + 58, 0, COR.texto, fonte(800, 46));
    escrever(cx, [d.detalhe], xx + 28, yy + 112, 0, COR.texto3, fonte(400, 20));
  });
  y += hDestaques + ESPACO - 20;

  if (hAjuda) {
    cartao(cx, y, hAjuda);
    let ya = y + PAD;
    escrever(cx, ['Quem registrou a rotina'], x0, ya, 0, COR.texto, fonte(650, 32));
    ya += 50;
    escrever(cx, [r.placar.grupos.map((g) => `${g.rotulo} ${g.pct}%`).join('  ·  ')], x0, ya, 0, COR.texto, fonte(600, 28));
    if (top) escrever(cx, [`Quem mais ajudou da família: ${top.nome}, ${textoRegistros(top.pontos)}`], x0, ya + 44, 0, COR.texto2, fonte(400, 24));
    y += hAjuda + ESPACO;
  }
  if (hMarcos) { desenharMarcos(cx, y, hMarcos, 'Marcos do mês', marcos, linhasMarcos); y += hMarcos + ESPACO; }
  if (hMedalhas) { desenharMedalhas(cx, y, hMedalhas, 'Medalhas do mês', medalhas, interno); y += hMedalhas + ESPACO; }
  centro(cx, 'Valeu, família!', LARGURA / 2, y + 6, COR.primaria, fonte(600, 44, FONTE_TITULO));
  centro(cx, 'Feito a partir dos registros do app.', LARGURA / 2, y + 70, COR.texto3, fonte(400, 20));
  return paraBlob(canvas);
}

// ---------------------------------------------------------------------------
// Linha do tempo dos marcos (fase 21)
// ---------------------------------------------------------------------------

/** itens: linhaDoTempo(...) (o mais recente primeiro). opcoes: { nome, idade }. Até 12 itens. → Blob png */
export async function imagemLinhaDoTempo(itens, { nome, idade }) {
  const c = medir();
  const larg = LARGURA - 2 * MARGEM;
  const interno = larg - 2 * PAD;
  const lista = itens.slice(0, 12);
  c.font = fonte(600, 26);
  const linhas = lista.map((it) => quebrar(c, it.texto, interno - 60, 2));
  const hLista = PAD + linhas.reduce((s, l) => s + l.length * 34 + 40, 0) + PAD - 10;
  const hCab = MARGEM + 34 + 74 + (idade ? 40 : 0) + 16;
  const altura = hCab + hLista + 110;
  const canvas = document.createElement('canvas');
  canvas.width = LARGURA;
  canvas.height = Math.ceil(altura);
  const cx = canvas.getContext('2d');
  cx.fillStyle = COR.fundo;
  cx.fillRect(0, 0, LARGURA, canvas.height);
  let y = MARGEM;
  escrever(cx, ['LINHA DO TEMPO'], MARGEM, y, 0, COR.primaria, fonte(700, 24));
  y += 34;
  escrever(cx, [nome || 'Nosso bebê'], MARGEM, y, 0, COR.texto, fonte(600, 60, FONTE_TITULO));
  y += 74;
  if (idade) escrever(cx, [idade], MARGEM, y, 0, COR.texto2, fonte(600, 26));
  y = hCab;
  cartao(cx, y, hLista);
  const x0 = MARGEM + PAD;
  let yi = y + PAD;
  lista.forEach((it, k) => {
    const cor = it.tipo === 'marco' ? MEDALHAS[0] : it.tipo === 'nascimento' ? '#C2577A' : COR.primaria;
    const hItem = linhas[k].length * 34 + 40;
    if (k < lista.length - 1) { cx.fillStyle = COR.linha; cx.fillRect(x0 + 13, yi + 28, 3, hItem - 8); }
    bolinha(cx, x0 + 14, yi + 16, cor, 12);
    escrever(cx, linhas[k], x0 + 48, yi, 34, COR.texto, fonte(it.tipo === 'marco' ? 650 : 500, 26));
    escrever(cx, [[fmtData(it.t), it.idade].filter(Boolean).join(' · ')], x0 + 48, yi + linhas[k].length * 34, 0, COR.texto2, fonte(400, 21));
    yi += hItem;
  });
  centro(cx, 'Feito a partir dos registros do app.', LARGURA / 2, y + hLista + 36, COR.texto3, fonte(400, 20));
  return paraBlob(canvas);
}

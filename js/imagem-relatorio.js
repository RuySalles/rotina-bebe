// Relatório como imagem (fases 12 e 18): desenha o relatório num canvas, sempre claro, para mandar no WhatsApp.
// Leva o que interessa na consulta: as dúvidas, o "Em resumo" e os gráficos (os detalhes ficam na tela e no PDF).
// O WhatsApp reduz a imagem para ~1600 px no lado maior; por isso um relatório longo vira várias imagens de no máximo
// ALTURA_MAX px, cada uma com o cabeçalho (nome, idade e período), para ficar legível sem zoom.
// Usa os mesmos dados da tela (montarRelatorio + blocosResumo); os gráficos são os mesmos SVG, convertidos em imagem.

import { fmtData } from './regras.js';
import { graficoTemperatura, dosesAntitermico, linhaPeriodo } from './relatorio.js';
import { blocosResumo } from './resumo.js';
import { graficoEvolucao } from './grafico.js';
import { COR, FONTE, FONTE_TITULO, fonte, quebrar, retanguloArredondado, linhaH, escrever, medir, paraBlob } from './desenho.js';

const LARGURA = 1080, ALTURA_MAX = 1600;
const MARGEM = 48, PAD = 32, ESPACO = 24, TITULO_H = 52;

// ---------------------------------------------------------------------------
// Paginação (pura, testada em tests/regras.casos.js)
// ---------------------------------------------------------------------------

/** Altura de um pedaço de seção (cartão): margens, título e blocos. */
export const alturaPedaco = (blocos) => PAD * 2 + TITULO_H + blocos.reduce((s, b) => s + b.h, 0);

/**
 * Distribui as seções em páginas de até `disponivel` px. secoes: [{ titulo, cabecalho?: [bloco], blocos: [bloco] }],
 * bloco = { h }. Quando uma seção continua na página seguinte, o pedaço novo repete o cabeçalho (ex. nomes das colunas)
 * e sai com `continua: true`. → [[{ titulo, continua, blocos }]] (uma lista de pedaços por página).
 */
export function paginar(secoes, disponivel, espaco = ESPACO) {
  const paginas = [];
  let pagina = [], altura = 0;
  const alturaCom = (pedaco) => altura + (pagina.length ? espaco : 0) + alturaPedaco(pedaco.blocos);
  const fecharPagina = () => { if (pagina.length) paginas.push(pagina); pagina = []; altura = 0; };
  const guardar = (pedaco) => { altura = alturaCom(pedaco); pagina.push(pedaco); };
  for (const secao of secoes) {
    const cab = secao.cabecalho || [];
    let pedaco = { titulo: secao.titulo, continua: false, blocos: [...cab] };
    let conteudo = 0;
    for (const bloco of secao.blocos) {
      const tentativa = { ...pedaco, blocos: [...pedaco.blocos, bloco] };
      if (alturaCom(tentativa) > disponivel && (conteudo || pagina.length)) {
        if (conteudo) guardar(pedaco);
        fecharPagina();
        pedaco = { titulo: secao.titulo, continua: conteudo > 0, blocos: [...cab, bloco] };
      } else {
        pedaco = tentativa;
      }
      conteudo = pedaco.blocos.length - cab.length;
    }
    if (conteudo) guardar(pedaco);
  }
  fecharPagina();
  return paginas;
}

// ---------------------------------------------------------------------------
// Gráficos: o SVG da tela, com as cores do tema claro escritas dentro, vira imagem
// ---------------------------------------------------------------------------

/** escala: aumenta as letras do gráfico (em gráficos pequenos, lado a lado). */
async function rasterizar(html, largura, cor, escala = 1) {
  const px = (n) => Math.round(n * escala * 10) / 10;
  const svg = html.match(/<svg[\s\S]*<\/svg>/)?.[0];
  if (!svg) return null;
  const [, vw, vh] = svg.match(/viewBox="0 0 (\d+) (\d+)"/) || [0, 400, 230];
  const altura = Math.round((largura * vh) / vw);
  const estilo = `
    svg { --cor: ${cor || COR.primaria}; fill: none; }
    text { stroke: none; font-family: ${FONTE}; }
    .graf-grade { stroke: ${COR.linha}; stroke-width: 1; }
    .graf-dia { stroke: ${COR.linha}; stroke-width: 1; stroke-dasharray: 2 3; }
    .graf-eixo { fill: ${COR.texto2}; font-size: ${px(12)}px; }
    .graf-limite { stroke: ${COR.alerta}; stroke-width: 1.5; stroke-dasharray: 5 4; opacity: 0.8; }
    .graf-limite-texto { fill: ${COR.alerta}; font-size: ${px(12)}px; font-weight: 600; }
    .graf-linha { fill: none; stroke: var(--cor); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
    .graf-ponto circle { fill: var(--cor); stroke: #fff; stroke-width: 2; }
    .graf-ponto .graf-alvo { fill: transparent; stroke: none; }
    .graf-rotulo { fill: ${COR.texto}; font-size: ${px(13)}px; font-weight: 650; }
    .graf-rotulo--leve { font-size: ${px(12)}px; font-weight: 600; }
    .graf-dose path { fill: var(--cor); stroke: #fff; stroke-width: 1.5; }`;
  const completo = svg
    .replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" overflow="visible" `)
    .replace(/(<svg[^>]*>)/, `$1<style>${estilo}</style>`);
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(completo)}`;
  await img.decode();
  return { img, altura };
}

// ---------------------------------------------------------------------------
// Seções
// ---------------------------------------------------------------------------

function secaoPerguntas(rel, largInterna) {
  const lista = rel.resumo.perguntas;
  if (!lista.length) return null;
  const c = medir();
  const blocos = lista.map((p) => {
    c.font = fonte(400, 24);
    const linhas = quebrar(c, p.texto, largInterna - 150, 4);
    return {
      h: linhas.length * 32 + 14,
      desenhar(cx, x, y) {
        escrever(cx, ['•'], x, y, 32, COR.primaria, fonte(700, 24));
        escrever(cx, linhas, x + 26, y, 32, COR.texto, fonte(400, 24));
        cx.textAlign = 'right';
        escrever(cx, [fmtData(p.t)], x + largInterna, y + 3, 32, COR.texto3, fonte(400, 20));
        cx.textAlign = 'left';
      }
    };
  });
  return { titulo: 'Dúvidas para a consulta', blocos };
}

function secaoResumo(rel, largInterna) {
  const c = medir();
  const colRotulo = 170;
  const largValor = largInterna - colRotulo;
  const blocos = [];
  blocosResumo(rel.resumo, rel.anterior).forEach((b, i) => {
    const cabeca = { h: (i ? 30 : 0) + 34, desenhar(cx, x, y, w) {
      if (i) linhaH(cx, x, y + 12, w);
      escrever(cx, [b.titulo.toUpperCase()], x, y + (i ? 30 : 0), 0, COR.texto2, fonte(650, 19));
    } };
    b.linhas.forEach((l, k) => {
      c.font = fonte(650, 25);
      const valor = quebrar(c, l.valor, largValor, 3);
      const seta = l.comparacao ? `${l.comparacao.seta} antes ${l.comparacao.antes}` : '';
      c.font = fonte(400, 20);
      const detalhe = l.detalhe ? quebrar(c, l.detalhe, largValor, 4) : [];
      const setaLinhas = seta ? [seta] : [];
      const hLinha = valor.length * 33 + setaLinhas.length * 27 + detalhe.length * 27 + 14;
      const linha = {
        h: hLinha,
        desenhar(cx, x, y) {
          escrever(cx, [l.rotulo], x, y + 3, 33, COR.texto2, fonte(400, 21));
          escrever(cx, valor, x + colRotulo, y, 33, l.alerta ? COR.alerta : COR.texto, fonte(650, 25));
          let yy = y + valor.length * 33;
          if (seta) { escrever(cx, [seta], x + colRotulo, yy, 27, COR.primaria, fonte(650, 20)); yy += 27; }
          if (detalhe.length) escrever(cx, detalhe, x + colRotulo, yy, 27, COR.texto2, fonte(400, 20));
        }
      };
      // O título do assunto vai junto com a primeira linha, para não ficar sozinho no fim de uma imagem.
      blocos.push(k ? linha : { h: cabeca.h + linha.h, desenhar(cx, x, y, w) { cabeca.desenhar(cx, x, y, w); linha.desenhar(cx, x, y + cabeca.h, w); } });
    });
  });
  return blocos.length ? { titulo: 'Em resumo', blocos } : null;
}

async function secaoGraficos(rel, opcoes, largInterna) {
  const cores = opcoes.cores || {};
  const itens = rel.series.map((s) => ({ titulo: s.rotulo, html: graficoEvolucao(s.pontos, { rotulo: s.rotulo, fmt: s.fmt, fmtEixo: s.fmtEixo, cor: cores[s.id], desdeZero: s.desdeZero }), cor: cores[s.id] }));
  if (rel.temperaturas.length) {
    itens.push({ titulo: 'Temperatura (°C)', html: graficoTemperatura(rel, dosesAntitermico(rel), opcoes.tipoAntitermico, opcoes.agora), cor: opcoes.tipoFebre?.cor });
  }
  // Dois por linha, com as letras maiores, para caber numa imagem só e continuar legível no celular.
  const vao = 28;
  const largura = Math.floor((largInterna - vao) / 2);
  const prontos = [];
  for (const it of itens) {
    let g = null;
    try { g = await rasterizar(it.html, largura, it.cor, 1.5); } catch { g = null; }
    if (g) prontos.push({ ...it, ...g });
  }
  const c = medir();
  const blocos = [];
  for (let i = 0; i < prontos.length; i += 2) {
    const par = prontos.slice(i, i + 2).map((g) => { c.font = fonte(600, 20); return { ...g, linhas: quebrar(c, g.titulo, largura, 2) }; });
    const hTitulo = Math.max(...par.map((g) => g.linhas.length)) * 26 + 6;
    blocos.push({
      h: hTitulo + Math.max(...par.map((g) => g.altura)) + 28,
      desenhar(cx, x, y) {
        par.forEach((g, k) => {
          const xg = x + k * (largura + vao);
          escrever(cx, g.linhas, xg, y, 26, COR.texto2, fonte(600, 20));
          cx.drawImage(g.img, xg, y + hTitulo, largura, g.altura);
        });
      }
    });
  }
  return blocos.length ? { titulo: 'Gráficos', blocos } : null;
}

// ---------------------------------------------------------------------------
// Montagem
// ---------------------------------------------------------------------------

/**
 * Gera as imagens do relatório. opcoes: as mesmas da tela (htmlRelatorio): { nome, idade, nDias, consulta, agora,
 * tipoFebre, tipoAntitermico, cores }. → [Blob png] (uma por página).
 */
export async function imagensRelatorio(rel, opcoes) {
  const largura = LARGURA;
  const largInterna = largura - 2 * (MARGEM + PAD);
  const c = medir();

  // Cabeçalho de cada imagem.
  c.font = fonte(400, 22);
  const periodo = quebrar(c, linhaPeriodo(rel, opcoes.nDias, opcoes.agora, opcoes.consulta), largura - 2 * MARGEM);
  const nome = opcoes.nome || 'Rotina do bebê';
  const idade = opcoes.idade || '';
  const hCab = MARGEM + 28 + 62 + (idade ? 32 : 0) + periodo.length * 30 + 28;
  const hRod = 96;

  const secoes = [secaoPerguntas(rel, largInterna), secaoResumo(rel, largInterna), await secaoGraficos(rel, opcoes, largInterna)]
    .filter(Boolean);
  if (!secoes.length) secoes.push({ titulo: 'Nenhum registro neste período.', blocos: [{ h: 0, desenhar() {} }] });
  const paginas = paginar(secoes, ALTURA_MAX - hCab - hRod);

  const blobs = [];
  for (const [p, pedacos] of paginas.entries()) {
    const altura = hCab + pedacos.reduce((s, pd, i) => s + alturaPedaco(pd.blocos) + (i ? ESPACO : 0), 0) + hRod;
    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = Math.ceil(altura);
    const cx = canvas.getContext('2d');
    cx.fillStyle = COR.fundo;
    cx.fillRect(0, 0, largura, canvas.height);

    let yc = MARGEM;
    escrever(cx, ['RELATÓRIO PARA A CONSULTA'], MARGEM, yc, 28, COR.texto2, fonte(650, 20));
    yc += 28;
    escrever(cx, [nome], MARGEM, yc, 62, COR.texto, fonte(600, 50, FONTE_TITULO));
    yc += 66;
    if (idade) { escrever(cx, [idade], MARGEM, yc, 30, COR.texto, fonte(650, 24)); yc += 32; }
    escrever(cx, periodo, MARGEM, yc, 30, COR.texto2, fonte(400, 22));

    let y = hCab;
    for (const pd of pedacos) {
      const h = alturaPedaco(pd.blocos);
      cx.fillStyle = COR.superficie;
      retanguloArredondado(cx, MARGEM, y, largura - 2 * MARGEM, h, 28);
      cx.fill();
      cx.strokeStyle = COR.linha;
      cx.lineWidth = 1.5;
      cx.stroke();
      const x = MARGEM + PAD;
      escrever(cx, [pd.titulo + (pd.continua ? ' (continuação)' : '')], x, y + PAD, 36, COR.texto, fonte(650, 28));
      let yb = y + PAD + TITULO_H;
      for (const b of pd.blocos) { b.desenhar(cx, x, yb, largInterna); yb += b.h; }
      y += h + ESPACO;
    }

    const yRod = canvas.height - hRod + 20;
    escrever(cx, ['Feito a partir dos registros do app. Detalhes dia a dia no PDF.',
      'Ferramenta de organização. Não substitui orientação médica.'], MARGEM, yRod, 28, COR.texto3, fonte(400, 19));
    if (paginas.length > 1) {
      cx.textAlign = 'right';
      escrever(cx, [`${p + 1} de ${paginas.length}`], largura - MARGEM, yRod + 14, 28, COR.texto2, fonte(650, 22));
      cx.textAlign = 'left';
    }
    blobs.push(await paraBlob(canvas));
  }
  return blobs;
}

// Relatório como imagem (fase 12): desenha o relatório num canvas, sempre claro, para mandar no WhatsApp.
// O WhatsApp reduz a imagem para ~1600 px no lado maior; por isso um relatório longo vira várias imagens de no máximo
// ALTURA_MAX px, cada uma com o cabeçalho (nome e período), para ficar legível sem zoom.
// Usa os mesmos dados da tela (montarRelatorio); o gráfico é o mesmo SVG, convertido em imagem.

import { chaveDia, fmtHora, fmtNumero } from './regras.js';
import { diaCurto, graficoTemperatura, resumoTemperatura, dosesAntitermico, linhaPeriodo, colunasMedidas, quandoMedida, anotacoesPorDia } from './relatorio.js';
import { COR, FONTE, FONTE_TITULO, fonte, quebrar, retanguloArredondado, bolinha, linhaH, escrever, medir, paraBlob } from './desenho.js';

const LARGURA_MIN = 1080, LARGURA_MAX = 1560, ALTURA_MAX = 1600;
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


// ---- Dia a dia ----

function secaoDias(rel, largInterna) {
  if (!rel.colunas.length) return null;
  const c = medir();
  const colDia = 150;
  const n = rel.colunas.length;
  const colW = (largInterna - colDia) / n;
  const txtW = colW - 8;

  c.font = fonte(600, 20);
  const rotulos = rel.colunas.map(({ tipo }) => quebrar(c, tipo.rotulo, txtW - 22, 2));
  const hCab = Math.max(...rotulos.map((l) => l.length)) * 25 + 20;
  const cabecalho = {
    h: hCab,
    desenhar(cx, x, y) {
      escrever(cx, ['Dia'], x, y + 4, 25, COR.texto2, fonte(600, 20));
      rel.colunas.forEach(({ tipo }, i) => {
        const cx0 = x + colDia + i * colW;
        bolinha(cx, cx0 + 7, y + 16, tipo.cor, 7);
        escrever(cx, rotulos[i], cx0 + 22, y + 4, 25, COR.texto2, fonte(600, 20));
      });
    }
  };

  const linhas = rel.dias.map((dia, d) => {
    const celulas = rel.colunas.map(({ celulas }) => {
      const cel = celulas[d];
      if (!cel) return { vazio: true, h: 30 };
      c.font = fonte(650, 24);
      const valor = quebrar(c, cel.valor, txtW, 2);
      c.font = fonte(400, 19);
      const detalhe = cel.detalhe ? quebrar(c, cel.detalhe, txtW, 3) : [];
      return { valor, detalhe, destaque: !!cel.destaque, h: valor.length * 30 + detalhe.length * 24 + (detalhe.length ? 4 : 0) };
    });
    const h = Math.max(30, ...celulas.map((x) => x.h)) + 26;
    return {
      h,
      desenhar(cx, x, y, w) {
        linhaH(cx, x, y, w);
        escrever(cx, [diaCurto(dia)], x, y + 14, 30, COR.texto, fonte(650, 22));
        celulas.forEach((cel, i) => {
          const cx0 = x + colDia + i * colW;
          if (cel.vazio) { escrever(cx, ['—'], cx0, y + 14, 30, COR.texto3, fonte(400, 24)); return; }
          escrever(cx, cel.valor, cx0, y + 13, 30, cel.destaque ? COR.alerta : COR.texto, fonte(650, 24));
          if (cel.detalhe.length) escrever(cx, cel.detalhe, cx0, y + 17 + cel.valor.length * 30, 24, COR.texto2, fonte(400, 19));
        });
      }
    };
  });
  return { titulo: 'Dia a dia', cabecalho: [cabecalho], blocos: linhas };
}

// ---- Temperatura ----

/** SVG do gráfico (o mesmo da tela) como imagem, com as cores do tema claro escritas dentro. */
async function imagemGrafico(rel, opcoes, largura) {
  const html = graficoTemperatura(rel, dosesAntitermico(rel), opcoes.tipoAntitermico, opcoes.agora);
  const svg = html.match(/<svg[\s\S]*<\/svg>/)?.[0];
  if (!svg) return null;
  const [, vw, vh] = svg.match(/viewBox="0 0 (\d+) (\d+)"/) || [0, 400, 230];
  const altura = Math.round((largura * vh) / vw);
  const estilo = `
    svg { --cor: ${opcoes.tipoFebre?.cor || COR.primaria}; fill: none; }
    text { stroke: none; font-family: ${FONTE}; }
    .graf-grade { stroke: ${COR.linha}; stroke-width: 1; }
    .graf-dia { stroke: ${COR.linha}; stroke-width: 1; stroke-dasharray: 2 3; }
    .graf-eixo { fill: ${COR.texto2}; font-size: 12px; }
    .graf-limite { stroke: ${COR.alerta}; stroke-width: 1.5; stroke-dasharray: 5 4; opacity: 0.8; }
    .graf-limite-texto { fill: ${COR.alerta}; font-size: 12px; font-weight: 600; }
    .graf-linha { fill: none; stroke: var(--cor); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
    .graf-ponto circle { fill: var(--cor); stroke: #fff; stroke-width: 2; }
    .graf-ponto .graf-alvo { fill: transparent; stroke: none; }
    .graf-rotulo { fill: ${COR.texto}; font-size: 13px; font-weight: 650; }
    .graf-dose path { fill: var(--cor); stroke: #fff; stroke-width: 1.5; }`;
  const completo = svg
    .replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" overflow="visible" `)
    .replace(/(<svg[^>]*>)/, `$1<style>${estilo}</style>`);
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(completo)}`;
  await img.decode();
  return { img, altura };
}

async function secaoTemperatura(rel, opcoes, largInterna) {
  if (!rel.temperaturas.length) return null;
  const c = medir();
  const blocos = [];

  c.font = fonte(400, 22);
  const resumo = quebrar(c, resumoTemperatura(rel), largInterna);
  const hResumo = resumo.length * 30 + 16;

  // Resumo e gráfico num bloco só, para não ficarem em imagens diferentes.
  let grafico = null;
  const largGrafico = Math.min(largInterna, 880); // letras do gráfico do tamanho do resto do texto
  try { grafico = await imagemGrafico(rel, opcoes, largGrafico); } catch { grafico = null; } // sem gráfico, fica a lista
  const doses = dosesAntitermico(rel);
  const hGrafico = grafico ? grafico.altura + (doses.length ? 52 : 16) : 0;
  const corFebre = opcoes.tipoFebre?.cor || COR.primaria;
  const corDose = opcoes.tipoAntitermico?.cor || COR.primaria;
  const nomeDose = opcoes.tipoAntitermico?.rotulo || 'Antitérmico';
  blocos.push({
    h: hResumo + hGrafico,
    desenhar(cx, x, y0) {
      escrever(cx, resumo, x, y0, 30, COR.texto2, fonte(400, 22));
      if (!grafico) return;
      const y = y0 + hResumo;
      cx.drawImage(grafico.img, x, y, largGrafico, grafico.altura);
      if (!doses.length) return;
      const yl = y + grafico.altura + 22;
      cx.fillStyle = corFebre;
      cx.fillRect(x, yl - 2, 30, 4);
      cx.font = fonte(400, 20);
      cx.fillStyle = COR.texto2;
      cx.textBaseline = 'middle';
      cx.fillText('Temperatura (°C)', x + 40, yl);
      const x2 = x + 40 + cx.measureText('Temperatura (°C)').width + 32;
      cx.fillStyle = corDose;
      cx.beginPath(); cx.moveTo(x2 + 9, yl - 9); cx.lineTo(x2 + 18, yl + 8); cx.lineTo(x2, yl + 8); cx.closePath(); cx.fill();
      cx.fillStyle = COR.texto2;
      cx.fillText(nomeDose, x2 + 28, yl);
    }
  });

  // Lista das medições, em 3 colunas.
  const porLinha = 3;
  const colW = largInterna / porLinha;
  for (let i = 0; i < rel.temperaturas.length; i += porLinha) {
    const grupo = rel.temperaturas.slice(i, i + porLinha).map((m) => {
      c.font = fonte(400, 18);
      const obs = m.obs ? quebrar(c, m.obs, colW - 20, 2) : [];
      return { m, obs, h: 64 + obs.length * 23 };
    });
    blocos.push({
      h: Math.max(...grupo.map((g) => g.h)) + 16,
      desenhar(cx, x, y, w) {
        linhaH(cx, x, y, w);
        grupo.forEach(({ m, obs }, j) => {
          const x0 = x + j * colW;
          escrever(cx, [`${diaCurto(chaveDia(m.t))} ${fmtHora(m.t)}`], x0, y + 12, 26, COR.texto2, fonte(400, 20));
          escrever(cx, [`${fmtNumero(m.c)} °C`], x0, y + 38, 30, m.c >= rel.limite ? COR.alerta : COR.texto, fonte(650, 26));
          if (obs.length) escrever(cx, obs, x0, y + 72, 23, COR.texto2, fonte(400, 18));
        });
      }
    });
  }
  return { titulo: 'Temperatura', blocos };
}

// ---- Anotações ----

function secaoAnotacoes(rel, largInterna) {
  if (!rel.anotacoes.length) return null;
  const c = medir();
  const colDia = 150, colHora = 80;
  const largTexto = largInterna - colDia - colHora;
  const blocos = [];
  for (const [dia, lista] of anotacoesPorDia(rel)) {
    lista.forEach((a, i) => {
      const prefixo = a.categoria !== 'Outro' ? `${a.categoria}: ` : '';
      c.font = fonte(400, 21);
      const linhas = quebrar(c, `${prefixo}${a.texto}`, largTexto, 6);
      const cor = a.categoria === 'Sintoma' ? COR.alerta : COR.texto;
      blocos.push({
        h: linhas.length * 29 + 12 + (i === 0 ? 8 : 0),
        desenhar(cx, x, y0, w) {
          const y = y0 + (i === 0 ? 8 : 0);
          if (i === 0) { linhaH(cx, x, y0, w); escrever(cx, [diaCurto(dia)], x, y + 4, 29, COR.texto2, fonte(400, 21)); }
          escrever(cx, [fmtHora(a.t)], x + colDia, y + 4, 29, COR.texto2, fonte(400, 21));
          escrever(cx, linhas, x + colDia + colHora, y + 4, 29, cor, fonte(400, 21));
        }
      });
    });
  }
  return { titulo: 'Anotações', blocos };
}

// ---- Medidas ----

function secaoMedidas(rel, largInterna) {
  if (!rel.medidas.length) return null;
  const c = medir();
  const cols = colunasMedidas(rel);
  const colDia = 190;
  const colW = 145;
  const xExtra = colDia + cols.length * colW;
  const larguraExtra = largInterna - xExtra;
  const cabecalho = {
    h: 44,
    desenhar(cx, x, y) {
      escrever(cx, ['Dia'], x, y + 4, 25, COR.texto2, fonte(600, 20));
      cols.forEach((m, i) => escrever(cx, [m.rotulo], x + colDia + i * colW, y + 4, 25, COR.texto2, fonte(600, 20)));
    }
  };
  const linhas = rel.medidas.map((m) => {
    c.font = fonte(400, 19);
    const extra = [!m.antes && m.diferenca, m.obs].filter(Boolean).flatMap((t) => quebrar(c, t, larguraExtra, 3));
    c.font = fonte(650, 22);
    const quando = quebrar(c, quandoMedida(m), colDia - 12, 2);
    const cor = m.antes ? COR.texto2 : COR.texto;
    return {
      h: Math.max(30 * quando.length, 24 * extra.length, 30) + 26,
      desenhar(cx, x, y, w) {
        linhaH(cx, x, y, w);
        escrever(cx, quando, x, y + 14, 30, cor, fonte(650, 22));
        cols.forEach((col, i) => {
          const v = m.valores[col.id];
          escrever(cx, [v === null ? '—' : col.fmt(v)], x + colDia + i * colW, y + 13, 30, v === null ? COR.texto3 : cor, fonte(650, 24));
        });
        if (extra.length) escrever(cx, extra, x + xExtra, y + 16, 24, COR.texto2, fonte(400, 19));
      }
    };
  });
  return { titulo: 'Medidas', cabecalho: [cabecalho], blocos: linhas };
}

// ---- Remédios e vacinas ----

function secaoRemedios(rel, largInterna) {
  if (!rel.remedios.length) return null;
  const c = medir();
  const blocos = [];
  const colDia = 150;
  rel.remedios.forEach(({ tipo, doses }, k) => {
    const conta = `${doses.length} ${tipo.id === 'vacina' ? (doses.length === 1 ? 'registro' : 'registros') : (doses.length === 1 ? 'dose' : 'doses')}`;
    const topo = k ? 24 : 0;
    const nome = {
      h: topo + 50,
      desenhar(cx, x, y, w) {
        if (k) linhaH(cx, x, y + 6, w);
        bolinha(cx, x + 9, y + topo + 19, tipo.cor, 9);
        escrever(cx, [tipo.rotulo], x + 30, y + topo + 4, 32, COR.texto, fonte(650, 26));
        cx.font = fonte(400, 21);
        cx.textAlign = 'right';
        escrever(cx, [conta], x + w, y + topo + 8, 28, COR.texto2, fonte(400, 21));
        cx.textAlign = 'left';
      }
    };
    const grupos = new Map();
    for (const d of doses) {
      const dia = chaveDia(d.t);
      if (!grupos.has(dia)) grupos.set(dia, []);
      grupos.get(dia).push(`${fmtHora(d.t)}${d.texto ? ` (${d.texto})` : ''}`);
    }
    [...grupos].forEach(([dia, lista], g) => {
      c.font = fonte(400, 21);
      const linhas = quebrar(c, lista.join(', '), largInterna - colDia);
      const linhaDia = {
        h: linhas.length * 29 + 8,
        desenhar(cx, x, y) {
          escrever(cx, [diaCurto(dia)], x, y, 29, COR.texto2, fonte(400, 21));
          escrever(cx, linhas, x + colDia, y, 29, COR.texto, fonte(400, 21));
        }
      };
      // O nome do remédio vai junto com o primeiro dia, para não ficar sozinho no fim de uma imagem.
      blocos.push(g ? linhaDia : {
        h: nome.h + linhaDia.h,
        desenhar(cx, x, y, w) { nome.desenhar(cx, x, y, w); linhaDia.desenhar(cx, x, y + nome.h, w); }
      });
    });
  });
  return { titulo: 'Remédios e vacinas', blocos };
}

// ---------------------------------------------------------------------------
// Montagem
// ---------------------------------------------------------------------------

/**
 * Gera as imagens do relatório. opcoes: { nome, nDias, agora, tipoFebre, tipoAntitermico }.
 * → [Blob png] (uma por página).
 */
export async function imagensRelatorio(rel, opcoes) {
  const n = rel.colunas.length;
  const largura = Math.min(LARGURA_MAX, Math.max(LARGURA_MIN, 2 * (MARGEM + PAD) + 150 + n * 180));
  const largInterna = largura - 2 * (MARGEM + PAD);
  const c = medir();

  // Cabeçalho de cada imagem.
  c.font = fonte(400, 22);
  const periodo = quebrar(c, linhaPeriodo(rel, opcoes.nDias, opcoes.agora), largura - 2 * MARGEM);
  const nome = opcoes.nome || 'Rotina do bebê';
  const hCab = MARGEM + 28 + 62 + periodo.length * 30 + 28;
  const hRod = 96;

  const secoes = [secaoDias(rel, largInterna), await secaoTemperatura(rel, opcoes, largInterna), secaoRemedios(rel, largInterna), secaoMedidas(rel, largInterna),
    secaoAnotacoes(rel, largInterna)]
    .filter(Boolean);
  if (!secoes.length) {
    secoes.push({ titulo: 'Nenhum registro neste período.', blocos: [{ h: 0, desenhar() {} }] });
  }
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

    escrever(cx, ['RELATÓRIO PARA A CONSULTA'], MARGEM, MARGEM, 28, COR.texto2, fonte(650, 20));
    escrever(cx, [nome], MARGEM, MARGEM + 28, 62, COR.texto, fonte(600, 50, FONTE_TITULO));
    escrever(cx, periodo, MARGEM, MARGEM + 28 + 66, 30, COR.texto2, fonte(400, 22));

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
    escrever(cx, ['Feito a partir dos registros do app. Horários em 24h (Brasília).',
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

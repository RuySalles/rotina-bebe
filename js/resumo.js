// Resumo do período para a pediatra (fase 18): o que aconteceu, no formato em que a consulta pergunta, comparado com
// o período anterior de mesmo tamanho. Tudo puro (testado em tests/regras.casos.js): a tela e a imagem só desenham.
// Nunca compara com curvas ou valores de referência: só com o próprio bebê no período anterior.

import { chaveDia, somarDias, deDataHoraSP, limitesDia, fmtData, fmtHora, fmtNumero, fmtDuracao, numero, ms,
  ritmoSono, ritmoLeite, textoHoraDecimal } from './regras.js';
import { temLeite } from './tipos/alimentacao.js';
import { minutosNoDia } from './tipos/sono.js';
import { temCoco } from './tipos/fralda.js';
import { MEDIDAS, serie as serieMedida } from './tipos/medidas.js';
import { anotacoesEntre } from './tipos/anotacao.js';
import { pendentes as vacinasPendentes } from './tipos/vacina.js';

const HORA = 3600000;
const DIA = 24 * HORA;
const LIMITE_FEBRE_PADRAO = 37.8;
const MUDANCA_MINIMA = 0.10; // menos de 10% de diferença: não mostra seta
const COBERTURA_MINIMA = 0.7; // o período anterior só vale para comparar se tem registros em 70% dos dias

const itensDe = (e) => (Array.isArray(e.dados.itens) ? e.dados.itens : []);
const media = (l) => (l.length ? l.reduce((s, v) => s + v, 0) / l.length : null);

/** Números de um dia (para médias e gráficos). */
export function numerosDoDia(ctx, dia) {
  const alim = ctx.doDia('alimentacao', dia);
  const leites = alim.filter(temLeite);
  const fraldas = ctx.doDia('fralda', dia);
  return {
    ml: leites.reduce((s, e) => s + (numero(e.dados.ml) || 0), 0),
    mamadeiras: leites.length,
    refeicoes: alim.filter((e) => itensDe(e).includes('refeicao')).length,
    frutas: alim.filter((e) => itensDe(e).includes('fruta')).length,
    sonoMin: minutosNoDia(ctx, dia),
    trocas: fraldas.length,
    cocos: fraldas.filter((e) => temCoco(e.dados)).length
  };
}

/**
 * Dias que entram nas médias "por dia": do primeiro dia do período até ontem (hoje ainda está pela metade).
 * Se o período é só hoje, usa hoje.
 */
export function diasParaMedia(inicio, fim) {
  const primeiro = chaveDia(inicio);
  const ultimoCompleto = somarDias(chaveDia(fim), -1);
  const dias = [];
  for (let d = primeiro; d <= ultimoCompleto; d = somarDias(d, 1)) dias.push(d);
  return dias.length ? dias : [chaveDia(fim)];
}

/** Episódios de febre: medições a partir do limite, juntas quando a seguinte vem em até 24h. */
export function episodiosFebre(ctx, inicio, fim, limite) {
  const altas = ctx.doTipo('febre').filter((e) => e.t >= inicio && e.t <= fim)
    .map((e) => ({ t: e.t, c: numero(e.dados.temperatura) })).filter((m) => m.c !== null && m.c >= limite)
    .sort((a, b) => a.t - b.t);
  const eps = [];
  for (const m of altas) {
    const ult = eps.at(-1);
    if (ult && m.t - ult.fim <= DIA) { ult.fim = m.t; ult.max = Math.max(ult.max, m.c); ult.medicoes++; } else eps.push({ inicio: m.t, fim: m.t, max: m.c, medicoes: 1 });
  }
  return eps;
}

/** Maior intervalo sem cocô que toca o período (conta o último cocô antes dele e o tempo até agora). */
export function maiorSemCoco(ctx, inicio, fim) {
  const cocos = ctx.doTipo('fralda').filter((e) => e.t <= fim && temCoco(e.dados)).map((e) => e.t).sort((a, b) => a - b);
  const marcos = [...cocos.filter((t) => t < inicio).slice(-1), ...cocos.filter((t) => t >= inicio)];
  if (!marcos.length) return null;
  let maior = null;
  for (let i = 1; i <= marcos.length; i++) {
    const de = marcos[i - 1], ate = i < marcos.length ? marcos[i] : fim;
    if (ate < inicio) continue;
    if (!maior || ate - de > maior.ate - maior.de) maior = { de, ate, emAberto: i === marcos.length };
  }
  return maior && { ...maior, horas: (maior.ate - maior.de) / HORA };
}

/**
 * Resumo do período [inicio, fim]. tipos: lista de tipos (para os nomes dos remédios).
 * → objeto com os números (null quando não há dado) e as listas; veja os testes para o formato.
 */
export function resumoPeriodo(ctx, tipos, inicio, fim) {
  const dias = diasParaMedia(inicio, fim);
  const porDia = dias.map((d) => numerosDoDia(ctx, d));
  const comLeite = porDia.filter((n) => n.mamadeiras);
  const comFralda = porDia.filter((n) => n.trocas);
  const comSono = porDia.filter((n) => n.sonoMin > 0);
  const naJanela = (e) => e.t >= inicio && e.t <= fim;

  // Alimentação
  const mls = comLeite.map((n) => n.ml).filter((v) => v > 0);
  const comecou = [['refeicao', 'refeição'], ['fruta', 'fruta']].map(([item, nome]) => {
    const primeiro = ctx.doTipo('alimentacao').find((e) => itensDe(e).includes(item));
    return primeiro && naJanela(primeiro) ? { item, nome, desde: primeiro.t } : null;
  }).filter(Boolean);

  // Sono: ritmo (dormir, acordar, cochilos) da regra de sempre, mais despertares por noite
  const sonos = ctx.doTipo('sono').map((e) => ({ t: e.t, fim: ms(e.dados.fim) })).filter((s) => Number.isFinite(s.fim) && s.fim > s.t);
  const ritmo = ritmoSono(sonos, inicio - 1, fim);
  const noites = new Map();
  for (const s of sonos.filter((x) => naJanela(x))) {
    const h = (s.t - deDataHoraSP(chaveDia(s.t), '00:00')) / HORA;
    if (!(h >= 19 || h < 6)) continue;
    const noite = chaveDia(s.t - 12 * HORA);
    noites.set(noite, (noites.get(noite) || 0) + 1);
  }
  const despertares = noites.size >= 2 ? media([...noites.values()].map((n) => n - 1)) : null;

  // Crescimento: a última medida de cada valor até o fim do período e a anterior a ela
  const crescimento = MEDIDAS.map((m) => {
    const pontos = serieMedida(ctx, m.id, fim);
    const atual = pontos.at(-1);
    if (!atual) return null;
    const ant = pontos.at(-2) || null;
    const dias = ant ? Math.round((atual.t - ant.t) / DIA) : null;
    return { id: m.id, rotulo: m.rotulo, fmt: m.fmt, dif: m.dif, atual: { t: atual.t, v: atual.v }, anterior: ant && { t: ant.t, v: ant.v }, dias };
  }).filter(Boolean);

  // Intercorrências
  const limite = ctx.numeroConfig('febre_limite_c') ?? LIMITE_FEBRE_PADRAO;
  const ehRemedio = (t) => !!t.remedio || ['amoxicilina', 'tylenol'].includes(t.id);
  const remedios = tipos.filter((t) => !t.interno && ehRemedio(t)).map((t) => {
    const doses = ctx.doTipo(t.id).filter(naJanela);
    return { id: t.id, rotulo: t.rotulo, doses: doses.length, dias: new Set(doses.map((e) => chaveDia(e.t))).size };
  }).filter((r) => r.doses);

  const vacinas = ctx.doTipo('vacina').filter(naJanela).map((e) => ({ t: e.t, vacina: e.dados.vacina || 'Vacina', dose: e.dados.dose || '' }));
  const proximaVacina = vacinasPendentes(ctx)[0] || null;

  return {
    inicio, fim, nDias: dias.length,
    // Parte dos dias com algum registro de rotina (para saber se dá para comparar com este período).
    cobertura: porDia.filter((n) => n.mamadeiras || n.trocas || n.sonoMin).length / dias.length,
    alimentacao: {
      mlDia: mls.length ? media(mls) : null,
      mlMin: mls.length ? Math.min(...mls) : null,
      mlMax: mls.length ? Math.max(...mls) : null,
      mamadeirasDia: comLeite.length ? media(comLeite.map((n) => n.mamadeiras)) : null,
      refeicoesDia: porDia.some((n) => n.refeicoes) ? media(porDia.map((n) => n.refeicoes)) : null,
      frutasDia: porDia.some((n) => n.frutas) ? media(porDia.map((n) => n.frutas)) : null,
      comecou
    },
    sono: {
      horasDia: comSono.length ? media(comSono.map((n) => n.sonoMin)) / 60 : null,
      dormir: ritmo.dormir, acordar: ritmo.acordar,
      cochilosDia: ritmo.cochilosPorDia, duracaoCochilo: ritmo.duracaoCochilo,
      despertares
    },
    fraldas: {
      trocasDia: comFralda.length ? media(comFralda.map((n) => n.trocas)) : null,
      cocosDia: comFralda.length ? media(comFralda.map((n) => n.cocos)) : null,
      maiorSemCoco: maiorSemCoco(ctx, inicio, fim)
    },
    crescimento,
    febre: { limite, episodios: episodiosFebre(ctx, inicio, fim, limite) },
    remedios,
    sintomas: anotacoesEntre(ctx, inicio, fim, 'Sintoma'),
    vacinas, proximaVacina,
    marcos: anotacoesEntre(ctx, inicio, fim, 'Marco'),
    perguntas: anotacoesEntre(ctx, inicio, fim, 'Pergunta')
  };
}

// ---------------------------------------------------------------------------
// Texto do resumo (o mesmo para a tela, o PDF e a imagem)
// ---------------------------------------------------------------------------

const n1 = (v) => fmtNumero(Math.round(v * 10) / 10, 1).replace(/,0$/, '');
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
/** Média com o plural certo: 1 → "1 refeição"; 1,5 → "1,5 refeições". */
const qtd = (v, um, varios) => `${n1(v)} ${n1(v) === '1' ? um : varios}`;
const horasTexto = (h) => fmtDuracao(Math.round(h * 60 / 5) * 5);
const textoDose = (d) => (!d ? '' : d === 'Reforço' ? 'reforço' : d === 'Única' ? 'dose única' : `${d} dose`);

/** Seta de comparação: só quando mudou 10% ou mais. → { seta, antes } | null */
export function comparar(atual, anterior, fmt) {
  if (atual === null || atual === undefined || anterior === null || anterior === undefined || !anterior) return null;
  const rel = (atual - anterior) / anterior;
  if (Math.abs(rel) < MUDANCA_MINIMA) return null;
  return { seta: rel > 0 ? '↑' : '↓', antes: fmt(anterior) };
}

/**
 * Blocos do "Em resumo": [{ id, titulo, linhas: [{ rotulo, valor, detalhe?, comparacao?, alerta? }] }].
 * Blocos sem nada são omitidos. ant: resumo do período anterior (ou null).
 */
export function blocosResumo(r, ant) {
  const blocos = [];
  const base = ant && ant.cobertura >= COBERTURA_MINIMA ? ant : null; // período anterior com poucos registros não compara
  const cmp = (f, fmt) => (base ? comparar(f(r), f(base), fmt) : null);

  // Crescimento
  const cresc = r.crescimento.map((m) => {
    const detalhe = [];
    if (m.anterior) {
      const d = m.atual.v - m.anterior.v;
      detalhe.push(`${m.dif(d)} em ${plural(m.dias, 'dia', 'dias')}`);
      if (m.id === 'peso' && m.dias > 0) detalhe.push(`~${Math.round((d * 1000) / m.dias)} g por dia`);
    }
    detalhe.push(`medido em ${fmtData(m.atual.t)}`);
    return { rotulo: m.rotulo, valor: m.fmt(m.atual.v), detalhe: detalhe.join(' · ') };
  });
  if (cresc.length) blocos.push({ id: 'crescimento', titulo: 'Crescimento', linhas: cresc });

  // Alimentação
  const a = r.alimentacao;
  const alim = [];
  if (a.mlDia !== null) {
    alim.push({
      rotulo: 'Leite', valor: `${Math.round(a.mlDia / 10) * 10} mL por dia`,
      detalhe: [a.mlMin !== a.mlMax ? `de ${a.mlMin} a ${a.mlMax} mL` : '', a.mamadeirasDia !== null ? `${qtd(a.mamadeirasDia, 'mamadeira', 'mamadeiras')} por dia` : ''].filter(Boolean).join(' · '),
      comparacao: cmp((x) => x.alimentacao.mlDia, (v) => `${Math.round(v / 10) * 10} mL`)
    });
  }
  if (a.refeicoesDia !== null || a.frutasDia !== null) {
    const partes = [a.refeicoesDia !== null ? qtd(a.refeicoesDia, 'refeição', 'refeições') : '', a.frutasDia !== null ? qtd(a.frutasDia, 'fruta', 'frutas') : ''].filter(Boolean);
    alim.push({
      rotulo: 'Comida', valor: `${partes.join(' e ')} por dia`,
      detalhe: a.comecou.map((c) => `${c.nome} desde ${fmtData(c.desde)}`).join(' · ')
    });
  }
  if (alim.length) blocos.push({ id: 'alimentacao', titulo: 'Alimentação', linhas: alim });

  // Sono
  const s = r.sono;
  const sono = [];
  if (s.horasDia !== null) {
    sono.push({ rotulo: 'Sono', valor: `${horasTexto(s.horasDia)} por dia`, comparacao: cmp((x) => x.sono.horasDia, horasTexto) });
  }
  if (s.dormir !== null || s.acordar !== null || s.despertares !== null) {
    const partes = [s.dormir !== null ? `dorme ~${textoHoraDecimal(s.dormir)}` : '', s.acordar !== null ? `acorda ~${textoHoraDecimal(s.acordar)}` : ''].filter(Boolean);
    sono.push({
      rotulo: 'Noite', valor: partes.join(', ') || 'Noite',
      detalhe: s.despertares !== null ? (s.despertares < 0.3 ? 'quase sempre dorme direto' : `acorda ${n1(s.despertares)} ${s.despertares < 1.5 ? 'vez' : 'vezes'} por noite`) : '',
      comparacao: cmp((x) => x.sono.despertares, (v) => `${n1(v)} por noite`)
    });
  }
  if (s.cochilosDia !== null) {
    sono.push({
      rotulo: 'Cochilos', valor: `${n1(s.cochilosDia)} por dia`,
      detalhe: s.duracaoCochilo !== null ? `~${fmtDuracao(Math.round(s.duracaoCochilo / 5) * 5)} cada` : '',
      comparacao: cmp((x) => x.sono.cochilosDia, n1)
    });
  }
  if (sono.length) blocos.push({ id: 'sono', titulo: 'Sono', linhas: sono });

  // Fraldas
  const f = r.fraldas;
  const fr = [];
  if (f.trocasDia !== null) {
    fr.push({
      rotulo: 'Fraldas', valor: `${qtd(f.trocasDia, 'troca', 'trocas')} por dia`,
      detalhe: `${qtd(f.cocosDia, 'com cocô', 'com cocô')} por dia`,
      comparacao: cmp((x) => x.fraldas.cocosDia, (v) => qtd(v, 'cocô', 'cocôs'))
    });
  }
  if (f.maiorSemCoco) {
    const h = f.maiorSemCoco.horas;
    fr.push({
      rotulo: 'Sem cocô', valor: `maior intervalo: ${h >= 48 ? `${n1(h / 24)} dias` : `${Math.round(h)}h`}`,
      detalhe: f.maiorSemCoco.emAberto ? `desde ${fmtData(f.maiorSemCoco.de)} ${fmtHora(f.maiorSemCoco.de)} (ainda sem)` : `${fmtData(f.maiorSemCoco.de)} a ${fmtData(f.maiorSemCoco.ate)}`,
      alerta: h >= 72
    });
  }
  if (fr.length) blocos.push({ id: 'fraldas', titulo: 'Fraldas', linhas: fr });

  // Intercorrências
  const inter = [];
  const eps = r.febre.episodios;
  inter.push(eps.length
    ? {
      rotulo: 'Febre', valor: plural(eps.length, 'episódio', 'episódios'), alerta: true,
      detalhe: eps.map((e) => `${fmtData(e.inicio)}${chaveDia(e.fim) !== chaveDia(e.inicio) ? ` a ${fmtData(e.fim)}` : ''}, máx. ${fmtNumero(e.max)} °C`).join(' · ')
    }
    : { rotulo: 'Febre', valor: `nenhuma (a partir de ${fmtNumero(r.febre.limite)} °C)` });
  if (r.remedios.length) {
    inter.push({ rotulo: 'Remédios', valor: r.remedios.map((m) => `${m.rotulo}: ${plural(m.doses, 'dose', 'doses')}`).join(' · '), detalhe: r.remedios.map((m) => `${m.rotulo} em ${plural(m.dias, 'dia', 'dias')}`).join(' · ') });
  }
  if (r.sintomas.length) {
    inter.push({ rotulo: 'Sintomas', valor: plural(r.sintomas.length, 'anotado', 'anotados'), detalhe: r.sintomas.map((x) => `${fmtData(x.t)}: ${x.texto}`).join(' · '), alerta: true });
  }
  blocos.push({ id: 'intercorrencias', titulo: 'Intercorrências', linhas: inter });

  // Vacinas e marcos
  const vm = [];
  if (r.vacinas.length) vm.push({ rotulo: 'Vacinas', valor: r.vacinas.map((v) => [v.vacina, textoDose(v.dose)].filter(Boolean).join(' ')).join(' · '), detalhe: r.vacinas.map((v) => fmtData(v.t)).join(' · ') });
  if (r.proximaVacina) {
    const p = r.proximaVacina;
    vm.push({ rotulo: 'Próxima dose', valor: `${p.vacina}${p.dose ? ` ${textoDose(p.dose)}` : ''}`, detalhe: `${p.dias < 0 ? 'atrasada desde' : 'em'} ${fmtData(Date.parse(`${p.data}T12:00:00-03:00`))}`, alerta: p.dias < 0 });
  }
  if (r.marcos.length) vm.push({ rotulo: 'Marcos', valor: r.marcos.map((m) => m.texto).join(' · '), detalhe: r.marcos.map((m) => fmtData(m.t)).join(' · ') });
  if (vm.length) blocos.push({ id: 'vacinas', titulo: 'Vacinas e marcos', linhas: vm });

  return blocos;
}

// ---------------------------------------------------------------------------
// Gráficos: por dia (até 14 dias) ou por semana
// ---------------------------------------------------------------------------

/**
 * Séries para os gráficos do relatório: [{ id, rotulo, fmt, fmtEixo, pontos: [{ t, v }] }].
 * Até 14 dias, um ponto por dia inteiro; mais que isso, a média por dia de cada semana (de trás para a frente,
 * terminando ontem). Peso: as medidas do período.
 */
export function seriesRelatorio(ctx, inicio, fim) {
  const dias = diasParaMedia(inicio, fim);
  const porSemana = dias.length > 14;
  const grupos = [];
  if (porSemana) {
    for (let i = dias.length; i > 0; i -= 7) grupos.unshift(dias.slice(Math.max(0, i - 7), i));
    if (grupos[0].length < 4 && grupos.length > 1) grupos.shift(); // semana muito curta no começo distorce
  } else {
    dias.forEach((d) => grupos.push([d]));
  }
  const pontos = (f) => grupos.map((g) => {
    const nums = g.map((d) => numerosDoDia(ctx, d));
    const validos = nums.filter((n) => f(n) !== null);
    const meio = limitesDia(g[Math.floor(g.length / 2)])[0] + 12 * HORA;
    return { t: meio, v: validos.length ? media(validos.map(f)) : null };
  }).filter((p) => p.v !== null);
  const sufixo = porSemana ? ' · média por semana' : '';
  const series = [
    { id: 'leite', rotulo: `Leite (mL por dia)${sufixo}`, fmt: (v) => `${Math.round(v)} mL`, fmtEixo: (v) => String(Math.round(v)), desdeZero: true, pontos: pontos((n) => (n.mamadeiras ? n.ml : null)) },
    { id: 'sono', rotulo: `Sono (horas por dia)${sufixo}`, fmt: (v) => horasTexto(v), fmtEixo: (v) => n1(v), desdeZero: true, pontos: pontos((n) => (n.sonoMin ? n.sonoMin / 60 : null)) },
    { id: 'cocos', rotulo: `Cocôs por dia${sufixo}`, fmt: (v) => n1(v), fmtEixo: (v) => n1(v), desdeZero: true, pontos: pontos((n) => (n.trocas ? n.cocos : null)) }
  ];
  const peso = serieMedida(ctx, 'peso', fim).filter((p) => p.t >= inicio - 60 * DIA);
  if (peso.length >= 2) series.push({ id: 'peso', rotulo: 'Peso (kg)', fmt: (v) => `${fmtNumero(v, 2)} kg`, fmtEixo: (v) => fmtNumero(v, 1), pontos: peso.map((p) => ({ t: p.t, v: p.v })) });
  return series.filter((s) => s.pontos.length >= 2 || (s.id === 'peso' && s.pontos.length));
}

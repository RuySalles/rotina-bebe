// Medidas (fase 14): peso, altura e perímetro da cabeça, todos opcionais.
// Mostra a diferença desde a medida anterior ("+250 g em 12 dias"), mas nunca compara com curvas de crescimento:
// isso fica com o pediatra.

import { numero, fmtData, chaveDia } from '../regras.js';

const DIA = 24 * 60 * 60 * 1000;

/** Os três valores, na ordem em que aparecem. fmt: valor; dif: diferença com sinal. */
export const MEDIDAS = [
  { id: 'peso', rotulo: 'Peso', curto: 'peso', unidade: 'kg', fmt: (v) => fmtPeso(v), dif: (d) => `${sinal(d)}${Math.abs(Math.round(d * 1000))} g` },
  { id: 'altura', rotulo: 'Altura', curto: 'altura', unidade: 'cm', fmt: (v) => fmtCm(v), dif: (d) => `${sinal(d)}${fmtCm(Math.abs(d))}` },
  { id: 'cabeca', rotulo: 'Cabeça', curto: 'cabeça', unidade: 'cm', fmt: (v) => fmtCm(v), dif: (d) => `${sinal(d)}${fmtCm(Math.abs(d))}` }
];

const sinal = (d) => (Math.abs(d) < 1e-9 ? '' : d > 0 ? '+' : '−');
const fmt = (v, min, max) => v.toLocaleString('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: max });
/** 7.35 → "7,35 kg"; 7.355 → "7,355 kg"; 7 → "7,00 kg" */
export const fmtPeso = (kg) => `${fmt(kg, 2, 3)} kg`;
/** 68 → "68 cm"; 68.5 → "68,5 cm" */
export const fmtCm = (cm) => `${fmt(Math.round(cm * 10) / 10, 0, 1)} cm`;

/** Valor de uma medida num registro (null se em branco). */
export const valor = (dados, id) => numero(dados?.[id]);

/** "7,35 kg · 68,5 cm · cabeça 43 cm" */
export function textoValores(dados) {
  return MEDIDAS.map((m) => {
    const v = valor(dados, m.id);
    if (v === null) return '';
    return m.id === 'cabeca' ? `cabeça ${m.fmt(v)}` : m.fmt(v);
  }).filter(Boolean).join(' · ');
}

/** Pontos de uma medida ao longo do tempo: [{ t, v, evento }] (só registros com esse valor). */
export function serie(ctx, id, ate = Infinity) {
  return ctx.doTipo('medidas')
    .filter((e) => e.t <= ate)
    .map((e) => ({ t: e.t, v: valor(e.dados, id), evento: e }))
    .filter((p) => p.v !== null);
}

/**
 * Diferença de cada medida do registro em relação à medida anterior com o mesmo valor preenchido.
 * → [{ id, d, dias, texto }] (vazio se não há anterior).
 */
export function diferencas(ctx, evento) {
  const lista = [];
  for (const m of MEDIDAS) {
    const v = valor(evento.dados, m.id);
    if (v === null) continue;
    const antes = serie(ctx, m.id).filter((p) => p.evento.id !== evento.id && (p.t < evento.t || (p.t === evento.t && p.evento.criado < evento.criado)));
    const ant = antes.at(-1);
    if (!ant) continue;
    const dias = Math.round((chaveMs(evento.t) - chaveMs(ant.t)) / DIA);
    lista.push({ id: m.id, d: v - ant.v, dias, texto: m.dif(v - ant.v) });
  }
  return lista;
}
const chaveMs = (t) => Date.parse(`${chaveDia(t)}T12:00:00-03:00`);

/** "+250 g, +1,5 cm em 12 dias" (agrupa as que têm o mesmo intervalo). '' se não há anterior. */
export function textoDiferencas(ctx, evento) {
  const grupos = new Map();
  for (const d of diferencas(ctx, evento)) {
    if (!grupos.has(d.dias)) grupos.set(d.dias, []);
    grupos.get(d.dias).push(d.texto);
  }
  return [...grupos].map(([dias, textos]) =>
    `${textos.join(', ')} ${dias === 0 ? 'no mesmo dia' : `em ${dias} ${dias === 1 ? 'dia' : 'dias'}`}`).join(' · ');
}

export default {
  id: 'medidas',
  rotulo: 'Medidas',
  cor: '#4F8A5B',
  icone: '<svg viewBox="0 0 24 24"><path d="M4 16.5 16.5 4l3.5 3.5L7.5 20z"/><path d="M8 12.5l1.5 1.5M10.5 10l2 2M13 7.5l1.5 1.5"/></svg>',
  lembrete: 'Preencha só o que mediu. Para medidas antigas da caderneta, use “Outro dia” no horário.',
  campos: [
    { id: 'peso', rotulo: 'Peso (kg)', tipo: 'numero', min: 1, max: 40, passo: 0.005, casas: 3, placeholder: 'ex. 7,35' },
    { id: 'altura', rotulo: 'Altura (cm)', tipo: 'numero', min: 30, max: 130, passo: 0.1, casas: 1, placeholder: 'ex. 68,5' },
    { id: 'cabeca', rotulo: 'Perímetro da cabeça (cm)', tipo: 'numero', min: 25, max: 60, passo: 0.1, casas: 1, placeholder: 'Opcional, ex. 43' },
    { id: 'observacao', rotulo: 'Observação', tipo: 'texto', placeholder: 'Opcional, ex. na consulta' }
  ],

  resumo(dados, ctx, evento) {
    const valores = textoValores(dados) || 'Medidas (sem valores)';
    const dif = ctx && evento ? textoDiferencas(ctx, evento) : '';
    return { texto: [dif ? `${valores} (${dif})` : valores, dados.observacao].filter(Boolean).join(' · ') };
  },

  resumoDia(ctx, dia) {
    const lista = ctx.doDia('medidas', dia);
    if (!lista.length) return null;
    const ultima = lista.at(-1);
    return { valor: textoValores(ultima.dados) || 'Medidas', detalhe: textoDiferencas(ctx, ultima) };
  },

  /** Gráficos do Histórico filtrado por Medidas: um por medida que tenha algum valor. */
  evolucao(ctx) {
    return MEDIDAS.map((m) => ({ id: m.id, rotulo: `${m.rotulo} (${m.unidade})`, fmt: m.fmt, pontos: serie(ctx, m.id, ctx.agora) }))
      .filter((s) => s.pontos.length);
  },

  regras: {
    prioridade: 0,

    status(ctx) {
      const ultima = ctx.ultimo('medidas', ctx.agora);
      if (!ultima) return { linhas: ['Nenhuma medida', 'Peso, altura e cabeça'] };
      // Linha curta (a faixa corta o resto): peso e altura; da diferença, só a do peso. O completo está no Histórico.
      const curto = textoValores({ peso: ultima.dados.peso, altura: ultima.dados.altura }) || textoValores(ultima.dados) || 'Medidas';
      const difPeso = diferencas(ctx, ultima).find((d) => d.id === 'peso');
      const quando = chaveDia(ultima.t) === chaveDia(ctx.agora) ? 'hoje' : `em ${fmtData(ultima.t)}`;
      const dif = difPeso ? `${difPeso.texto} em ${difPeso.dias} ${difPeso.dias === 1 ? 'dia' : 'dias'}` : '';
      return { linhas: [curto, dif ? `${dif} · ${quando}` : `Medidas ${quando}`] };
    },

    avisos(ctx, horario, dados) {
      const avisos = [];
      const peso = valor(dados, 'peso');
      if (peso !== null && peso >= 400) avisos.push({ texto: 'O peso parece estar em gramas. Digite em kg, ex. 7,35.', confirmar: true });
      if (MEDIDAS.every((m) => valor(dados, m.id) === null)) {
        avisos.push({ texto: 'Nenhuma medida preenchida. Preencha o peso, a altura ou a cabeça.', confirmar: true });
      }
      return avisos;
    }
  }
};

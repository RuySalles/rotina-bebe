import { ms, isoSP, fmtHora, fmtData, fmtDuracao, chaveDia, limitesDia, minutosDentro } from '../regras.js';

const MIN = 60 * 1000;
const HORA = 60 * MIN;
// Sono "em andamento" esquecido aberto não conta além disso no total do dia.
const MAX_ABERTO_H = 16;
const LONGO_H = 14;

const fimDe = (e) => {
  const f = ms(e.dados.fim);
  return Number.isFinite(f) && f > e.t ? f : null;
};

/** Sono iniciado e ainda sem horário de acordar (o último registro, até agora). */
function emAndamento(ctx) {
  const ultimo = ctx.ultimo('sono', ctx.agora);
  return ultimo && fimDe(ultimo) === null ? ultimo : null;
}

/** Fim efetivo: o registrado ou, se for o sono em andamento, agora. */
function fimEfetivo(e, ctx) {
  const f = fimDe(e);
  if (f !== null) return f;
  return emAndamento(ctx)?.id === e.id ? Math.min(ctx.agora, e.t + MAX_ABERTO_H * HORA) : e.t;
}

/** Minutos de sono dentro do dia (conta o pedaço que passa da meia-noite no dia certo). */
function minutosNoDia(ctx, dia) {
  const [inicio, fim] = limitesDia(dia);
  return ctx.doTipo('sono').reduce((soma, e) => soma + minutosDentro(e.t, fimEfetivo(e, ctx), inicio, fim), 0);
}

const quando = (t, agora) => (chaveDia(t) === chaveDia(agora) ? fmtHora(t) : `${fmtData(t)} ${fmtHora(t)}`);

export default {
  id: 'sono',
  rotulo: 'Sono',
  cor: '#5B6FB5',
  icone: '<svg viewBox="0 0 24 24"><path d="M18.5 14.5A7.5 7.5 0 0 1 9.5 5.5a7.5 7.5 0 1 0 9 9z"/><path d="M14 4h4l-4 4h4"/></svg>',
  campos: [
    { id: 'fim', rotulo: 'Acordou às', tipo: 'hora', ajuda: 'Deixe em branco se ainda estiver dormindo. Depois é só tocar em Sono de novo.' },
    { id: 'observacao', rotulo: 'Observação', tipo: 'texto', placeholder: 'Opcional' }
  ],

  resumo(dados, ctx, evento) {
    const obs = dados.observacao ? ` · ${dados.observacao}` : '';
    if (!evento) return { texto: (dados.observacao || 'Sono') };
    const fim = fimDe(evento);
    if (fim !== null) return { texto: `Até ${fmtHora(fim)} · ${fmtDuracao((fim - evento.t) / MIN)}${obs}` };
    if (ctx && emAndamento(ctx)?.id === evento.id) return { texto: `Dormindo · ${fmtDuracao((ctx.agora - evento.t) / MIN)}${obs}` };
    return { texto: `Sem horário de acordar${obs}` };
  },

  resumoDia(ctx, dia) {
    const min = minutosNoDia(ctx, dia);
    if (min < 1) return null;
    const n = ctx.doDia('sono', dia).length;
    return { valor: fmtDuracao(min), detalhe: n === 1 ? '1 sono' : `${n} sonos` };
  },

  regras: {
    prioridade: 20,

    status(ctx) {
      const aberto = emAndamento(ctx);
      if (aberto) {
        const horas = (ctx.agora - aberto.t) / HORA;
        if (horas > LONGO_H) return { linhas: [`Dormindo desde ${quando(aberto.t, ctx.agora)}`, 'Esqueceram de marcar o despertar?'], aviso: true };
        return { linhas: [`Dormindo há ${fmtDuracao(horas * 60)}`, `Desde ${fmtHora(aberto.t)} · toque ao acordar`], ativo: true };
      }
      const ultimo = ctx.ultimo('sono', ctx.agora);
      const hoje = minutosNoDia(ctx, chaveDia(ctx.agora));
      if (!ultimo) return { linhas: ['Nenhum registro', 'Toque quando dormir'] };
      const acordou = fimDe(ultimo);
      return { linhas: [`Acordado há ${fmtDuracao((ctx.agora - acordou) / MIN)}`, `Hoje: ${fmtDuracao(hoje)} de sono`] };
    },

    /** Com um sono em andamento, o botão abre esse registro para marcar o despertar. */
    registrarComo(ctx) {
      const aberto = emAndamento(ctx);
      if (!aberto) return null;
      return { editarId: aberto.id, dados: { fim: isoSP(ctx.agora) }, titulo: 'Registrar despertar' };
    },

    avisos(ctx, horario, dados, editandoId) {
      const avisos = [];
      const fim = ms(dados.fim);
      if (Number.isFinite(fim) && fim - horario > LONGO_H * HORA) {
        avisos.push({ texto: `Sono de ${fmtDuracao((fim - horario) / MIN)}. Confira os horários.`, confirmar: true });
      }
      if (!editandoId) {
        const aberto = emAndamento(ctx);
        if (aberto) avisos.push({ texto: `O sono das ${fmtHora(aberto.t)} ainda está sem horário de acordar. Ele vai ficar assim no histórico.` });
      }
      return avisos;
    }
  }
};

import {
  ms, isoSP, fmtHora, fmtData, fmtDuracao, fmtDuracaoCurta, chaveDia, limitesDia, minutosDentro, ritmoSono, preverSono, periodoRitmo
} from '../regras.js';

const MIN = 60 * 1000;
const HORA = 60 * MIN;
// Sono "em andamento" esquecido aberto não conta além disso no total do dia.
const MAX_ABERTO_H = 16;
const LONGO_H = 14;
// Sono aberto há menos que isso, ao registrar outro: quase certo que é o mesmo (marcado no outro celular).
const RECENTE_H = 3;

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
export function minutosNoDia(ctx, dia) {
  const [inicio, fim] = limitesDia(dia);
  return ctx.doTipo('sono').reduce((soma, e) => soma + minutosDentro(e.t, fimEfetivo(e, ctx), inicio, fim), 0);
}

/** Ritmo do sono (últimos 14 dias e os 14 anteriores), calculado uma vez por contexto. */
const cacheRitmo = new WeakMap();
export function ritmoDoSono(ctx) {
  if (!cacheRitmo.has(ctx)) {
    const sonos = ctx.doTipo('sono').filter((e) => e.t <= ctx.agora).map((e) => ({ t: e.t, fim: fimDe(e) })).filter((x) => x.fim !== null);
    const p = periodoRitmo(ctx.agora);
    cacheRitmo.set(ctx, { atual: ritmoSono(sonos, ...p.atual), anterior: ritmoSono(sonos, ...p.anterior) });
  }
  return cacheRitmo.get(ctx);
}

/** Próximo sono previsto (acordado agora), ou null. */
export function previsaoSono(ctx) {
  if (emAndamento(ctx)) return null;
  const ultimo = ctx.ultimo('sono', ctx.agora);
  const acordou = ultimo ? fimDe(ultimo) : null;
  if (acordou === null || acordou > ctx.agora) return null;
  return preverSono(ritmoDoSono(ctx).atual, acordou);
}
// Previsão que já passou continua no card ("já passou do costume", sem vermelho) por até 6h.
const PREVISAO_VALE_MIN = 6 * 60;

const quando = (t, agora) => (chaveDia(t) === chaveDia(agora) ? fmtHora(t) : `${fmtData(t)} ${fmtHora(t)}`);

export default {
  id: 'sono',
  rotina: true,
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
      const prev = previsaoSono(ctx);
      const linhaPrev = prev ? `${prev.noite ? 'Dormir à noite' : 'Próximo sono'} ~${fmtHora(prev.t)}${prev.t < ctx.agora ? ' · já passou' : ''}` : null;
      return { linhas: [`Acordado há ${fmtDuracao((ctx.agora - acordou) / MIN)}`, ...(linhaPrev ? [linhaPrev] : []), `Hoje: ${fmtDuracao(hoje)} de sono`] };
    },

    /** Previsão do próximo sono (pelo ritmo dele); nunca vira "Atrasado". */
    proximos(ctx) {
      const prev = previsaoSono(ctx);
      if (!prev || ctx.agora > prev.t + PREVISAO_VALE_MIN * MIN) return [];
      return [{
        t: prev.t,
        titulo: prev.noite ? 'Sono da noite' : 'Sono',
        detalhe: prev.noite
          ? 'hora de dormir de costume'
          : `~${fmtDuracaoCurta(prev.minutos)} acordado ${prev.faixa}`,
        previsao: true
      }];
    },

    /**
     * Estado atual para o card PRÓXIMO (fase 20): dormindo agora vem antes de qualquer previsão.
     * Sono aberto há mais de 14h (esqueceram de marcar o despertar) não toma o card; fica o aviso no botão.
     */
    emCurso(ctx) {
      const aberto = emAndamento(ctx);
      if (!aberto || ctx.agora - aberto.t > LONGO_H * HORA) return null;
      return {
        titulo: `Dormindo há ${fmtDuracao((ctx.agora - aberto.t) / MIN)}`,
        detalhe: `desde ${fmtHora(aberto.t)}`,
        desde: aberto.t,
        botao: 'Acordou'
      };
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
        const por = (e) => (e.quem ? ` por ${e.quem}` : '');
        if (aberto && ctx.agora - aberto.t < RECENTE_H * HORA) {
          // Provavelmente o outro celular marcou enquanto esta tela estava aberta.
          avisos.push({
            texto: `Já tem um sono iniciado às ${fmtHora(aberto.t)}${por(aberto)}. Para marcar o despertar, cancele e toque em Sono de novo.`,
            confirmar: true
          });
        } else if (aberto) {
          avisos.push({ texto: `O sono das ${fmtHora(aberto.t)} ainda está sem horário de acordar. Ele vai ficar assim no histórico.` });
        }
        // Um sono já registrado (e terminado) que cobre o horário escolhido.
        const cobre = ctx.doTipo('sono').find((e) => e.id !== aberto?.id && fimDe(e) !== null && e.t <= horario && horario < fimDe(e));
        if (cobre) {
          avisos.push({
            texto: `Já tem um sono das ${fmtHora(cobre.t)} às ${fmtHora(fimDe(cobre))}${por(cobre)} nesse horário.`,
            confirmar: true
          });
        }
      }
      return avisos;
    }
  }
};

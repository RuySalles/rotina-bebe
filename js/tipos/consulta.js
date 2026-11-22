// Consultas e retornos (fase 16): marcadas com dia e hora à frente (agendavel). Futuras aparecem no card PRÓXIMO
// (7 dias antes; no dia, em destaque) e no Google Agenda (Code.gs, com aviso na véspera e 2h antes). Depois da hora,
// vão para o Histórico; o campo Anotações guarda o que o médico disse.

import { fmtData, fmtHora, chaveDia, somarDias } from '../regras.js';

export const ANTECEDENCIA_DIAS = 7;  // nas linhas de baixo do card PRÓXIMO
export const LEMBRAR_ANOTAR_DIAS = 3; // consulta passada sem anotação: o botão lembra por 3 dias
const DIA = 24 * 60 * 60 * 1000;

const motivo = (dados) => String(dados.motivo || '').trim() || 'Consulta';
const semana = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'America/Sao_Paulo' });

/** "hoje 14:30" / "amanhã 14:30" / "qui 26/11 14:30" */
export function quandoConsulta(t, agora) {
  const dia = chaveDia(t);
  const hoje = chaveDia(agora);
  if (dia === hoje) return `hoje ${fmtHora(t)}`;
  if (dia === somarDias(hoje, 1)) return `amanhã ${fmtHora(t)}`;
  return `${semana.format(t).replace('.', '')} ${fmtData(t)} ${fmtHora(t)}`;
}

/** Consultas marcadas daqui para a frente, da mais próxima para a mais longe. */
export const futuras = (ctx) => ctx.doTipo('consulta').filter((e) => e.t > ctx.agora).sort((a, b) => a.t - b.t);

/**
 * Consultas que já passaram (há até 3 dias) e estão sem anotação. Se alguém abriu e salvou sem anotar (a versão
 * valendo é uma correção, com substitui_id), o app entende que não há o que anotar e para de pedir.
 */
export const semAnotacao = (ctx) => ctx.doTipo('consulta')
  .filter((e) => e.t <= ctx.agora && ctx.agora - e.t <= LEMBRAR_ANOTAR_DIAS * DIA && !e.substitui_id &&
    !String(e.dados.anotacoes || '').trim());

export default {
  id: 'consulta',
  rotulo: 'Consultas',
  tituloNovo: 'Marcar consulta',
  agendavel: true,
  cor: '#5A6F8A',
  icone: '<svg viewBox="0 0 24 24"><path d="M6 3.5v5a4 4 0 0 0 8 0v-5"/><path d="M10 12.5v2a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="10.5" r="2"/></svg>',
  lembrete: 'Depois da consulta, abra de novo para anotar o que o médico disse (ou salve sem anotar, e o app para de pedir).',
  campos: [
    { id: 'motivo', rotulo: 'Motivo', tipo: 'texto', placeholder: 'ex. retorno com o pediatra' },
    { id: 'local', rotulo: 'Local', tipo: 'texto', placeholder: 'Opcional, ex. clínica, posto' },
    { id: 'anotacoes', rotulo: 'Anotações', tipo: 'textolongo', placeholder: 'Opcional: o que o médico disse, pedidos, próximos passos' }
  ],

  resumo(dados) {
    const notas = String(dados.anotacoes || '').trim().replace(/\s+/g, ' ');
    const curto = notas.length > 90 ? `${notas.slice(0, 88)}…` : notas;
    return { texto: [motivo(dados), dados.local, curto].filter(Boolean).join(' · ') };
  },

  resumoDia(ctx, dia) {
    const lista = ctx.doDia('consulta', dia);
    if (!lista.length) return null;
    return {
      valor: lista.length === 1 ? motivo(lista[0].dados) : `${lista.length} consultas`,
      detalhe: lista.map((e) => fmtHora(e.t)).join(', ')
    };
  },

  regras: {
    prioridade: 2,

    status(ctx) {
      const pendente = semAnotacao(ctx).at(-1);
      if (pendente) {
        return { linhas: ['Anote o que o médico disse', `${motivo(pendente.dados)} · ${fmtData(pendente.t)}`], aviso: true };
      }
      const proxima = futuras(ctx)[0];
      if (proxima) {
        const local = String(proxima.dados.local || '').trim();
        return {
          linhas: [motivo(proxima.dados), [quandoConsulta(proxima.t, ctx.agora), local].filter(Boolean).join(' · ')],
          aviso: chaveDia(proxima.t) === chaveDia(ctx.agora)
        };
      }
      const ultima = ctx.ultimo('consulta', ctx.agora);
      if (!ultima) return { linhas: ['Nenhuma marcada', 'Toque para marcar'] };
      return { linhas: ['Nenhuma marcada', `Última: ${motivo(ultima.dados)} · ${fmtData(ultima.t)}`] };
    },

    /** 7 dias antes, nas linhas de baixo do card PRÓXIMO; no dia, em destaque. Nunca toma o lugar da rotina. */
    proximos(ctx) {
      const limite = ctx.agora + ANTECEDENCIA_DIAS * DIA;
      const hoje = chaveDia(ctx.agora);
      return futuras(ctx).filter((e) => e.t <= limite).map((e) => ({
        t: e.t,
        titulo: `Consulta · ${motivo(e.dados)}`,
        detalhe: String(e.dados.local || ''),
        informativo: true,
        destaque: chaveDia(e.t) === hoje,
        alemDe24h: true
      }));
    },

    /** Consulta recente sem anotação: o botão abre essa consulta para anotar. */
    registrarComo(ctx) {
      const pendente = semAnotacao(ctx).at(-1);
      return pendente ? { editarId: pendente.id, titulo: 'Anotar a consulta' } : null;
    },

    aposRegistrar(ctx, horario) {
      return horario > ctx.agora ? `Consulta marcada para ${quandoConsulta(horario, ctx.agora)}.` : '';
    }
  }
};

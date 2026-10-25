import { statusPlano, casarPlano, fmtHora, fmtData, fmtDuracao, chaveDia } from '../regras.js';

const TOLERANCIA_MIN = 30;

function situacao(ctx) {
  const plano = ctx.plano('amoxicilina');
  if (!plano || !plano.horarios.length) return null;
  return statusPlano(plano.horarios, ctx.doTipo('amoxicilina'), ctx.agora, TOLERANCIA_MIN);
}

const quando = (t, agora) => (chaveDia(t) === chaveDia(agora) ? fmtHora(t) : `${fmtData(t)} às ${fmtHora(t)}`);

export default {
  id: 'amoxicilina',
  rotulo: 'Amoxicilina',
  cor: '#3F8F8A',
  icone: '<svg viewBox="0 0 24 24"><path d="M10.6 3.9a5 5 0 0 1 7.1 7.1l-6.7 6.7a5 5 0 0 1-7.1-7.1z"/><path d="M7.3 7.3l7.1 7.1"/></svg>',
  campos: [
    { id: 'observacao', rotulo: 'Observação', tipo: 'texto', placeholder: 'Opcional' }
  ],

  resumo(dados) {
    return { texto: dados.observacao || 'Dose dada' };
  },

  regras: {
    prioridade: 100,
    usaPlano: true,
    toleranciaAtrasoMin: TOLERANCIA_MIN,

    status(ctx) {
      const s = situacao(ctx);
      if (!s) return { linhas: ['Sem plano de horários', 'Defina em Ajustes'] };
      const contador = `${s.feitas} de ${s.total} doses`;
      if (s.concluido) return { linhas: [contador, 'Tratamento concluído'], ok: true };
      if (s.atrasada) {
        return { linhas: [contador, `Atrasada há ${fmtDuracao(s.minutosAtraso)}`], alerta: true };
      }
      return { linhas: [contador, `Próxima ${quando(s.proxima.t, ctx.agora)}`] };
    },

    proximos(ctx) {
      const s = situacao(ctx);
      if (!s) return [];
      return s.doses
        .filter((d) => !d.evento && d.fim > ctx.agora)
        .map((d) => ({
          t: d.t,
          titulo: 'Amoxicilina',
          detalhe: `Dose ${d.numero} de ${s.total}`,
          alerta: d === s.proxima && s.atrasada
        }));
    },

    infoRegistro(ctx, horario, editandoId) {
      const plano = ctx.plano('amoxicilina');
      if (!plano || !plano.horarios.length) return '';
      const eventos = ctx.doTipo('amoxicilina').filter((e) => e.id !== editandoId);
      const doses = casarPlano(plano.horarios, [...eventos, { id: '__novo__', t: horario }]);
      const dose = doses.find((d) => d.evento && d.evento.id === '__novo__');
      if (!dose) return 'Fora dos horários do plano';
      return `Dose ${dose.numero} de ${plano.horarios.length} · prevista ${quando(dose.t, ctx.agora)}`;
    },

    avisos(ctx, horario, dados, editandoId) {
      const plano = ctx.plano('amoxicilina');
      if (!plano || !plano.horarios.length) return [];
      const eventos = ctx.doTipo('amoxicilina').filter((e) => e.id !== editandoId);
      const doses = casarPlano(plano.horarios, eventos);
      const alvo = doses.find((d) => horario >= d.inicio && horario < d.fim);
      if (alvo && alvo.evento) {
        return [{ texto: `A dose ${alvo.numero} já foi registrada às ${fmtHora(alvo.evento.t)}. Confira antes de registrar de novo.`, confirmar: true }];
      }
      return [];
    }
  }
};

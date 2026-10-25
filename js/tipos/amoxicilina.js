import { statusPlano, casarPlano, fmtHora, fmtData, fmtDuracao, chaveDia, somarDias, fmtMl } from '../regras.js';

const TOLERANCIA_MIN = 30;
// Pela bula: nunca duas doses com intervalo de 1 hora ou menos.
const INTERVALO_MINIMO_MIN = 60;
// Pela bula: a suspensão preparada vale 14 dias na geladeira.
const VALIDADE_FRASCO_DIAS = 14;
const MIN = 60 * 1000;

function situacao(ctx) {
  const plano = ctx.plano('amoxicilina');
  if (!plano || !plano.horarios.length) return null;
  return statusPlano(plano.horarios, ctx.doTipo('amoxicilina'), ctx.agora, TOLERANCIA_MIN);
}

const quando = (t, agora) => (chaveDia(t) === chaveDia(agora) ? fmtHora(t) : `${fmtData(t)} às ${fmtHora(t)}`);

const fmtDia = (dia) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;

/** Último dia de uso do frasco ("AAAA-MM-DD"), a partir de Ajustes → amoxicilina_frasco_preparado. */
function validadeFrasco(ctx) {
  const preparo = String(ctx.config.amoxicilina_frasco_preparado || '');
  return /^\d{4}-\d{2}-\d{2}$/.test(preparo) ? somarDias(preparo, VALIDADE_FRASCO_DIAS) : null;
}

/** Dose registrada mais próxima de um horário, se estiver a 1 hora ou menos. */
function dosePerto(ctx, horario, editandoId) {
  let perto = null;
  for (const e of ctx.doTipo('amoxicilina')) {
    if (e.id === editandoId || e.raiz === editandoId) continue;
    const d = Math.abs(e.t - horario);
    if (d <= INTERVALO_MINIMO_MIN * MIN && (!perto || d < Math.abs(perto.t - horario))) perto = e;
  }
  return perto;
}

export default {
  id: 'amoxicilina',
  rotulo: 'Amoxicilina',
  cor: '#3F8F8A',
  icone: '<svg viewBox="0 0 24 24"><path d="M10.6 3.9a5 5 0 0 1 7.1 7.1l-6.7 6.7a5 5 0 0 1-7.1-7.1z"/><path d="M7.3 7.3l7.1 7.1"/></svg>',
  lembrete: 'Pela bula: agite o frasco antes e use a colher ou seringa dosadora. Não pare antes do fim do tratamento, mesmo que melhore.',
  campos: [
    { id: 'dose', rotulo: 'Dose', tipo: 'texto', placeholder: 'Opcional, como na receita' },
    { id: 'observacao', rotulo: 'Observação', tipo: 'texto', placeholder: 'Opcional' }
  ],

  resumo(dados) {
    return { texto: [dados.dose, dados.observacao].filter(Boolean).join(' · ') || 'Dose dada' };
  },

  /** Registro novo já vem com a dose da receita (Ajustes → amoxicilina_dose_ml). */
  padroes(ctx) {
    const ml = ctx.numeroConfig('amoxicilina_dose_ml');
    return ml ? { dose: fmtMl(ml) } : {};
  },

  resumoDia(ctx, dia) {
    const n = ctx.doDia('amoxicilina', dia).length;
    const previstas = (ctx.plano('amoxicilina')?.horarios || []).filter((t) => chaveDia(t) === dia).length;
    if (!n && !previstas) return null;
    return { valor: n === 1 ? '1 dose' : `${n} doses`, detalhe: previstas ? `de ${previstas} no plano` : '' };
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
      const validade = validadeFrasco(ctx);
      const vencido = validade !== null && chaveDia(ctx.agora) > validade;
      const frasco = validade === null ? [] : [vencido ? `Frasco vencido em ${fmtDia(validade)}` : `Frasco vale até ${fmtDia(validade)}`];
      if (s.atrasada) {
        return { linhas: [contador, `Atrasada há ${fmtDuracao(s.minutosAtraso)}`, ...frasco], alerta: true };
      }
      return { linhas: [contador, `Próxima ${quando(s.proxima.t, ctx.agora)}`, ...frasco], aviso: vencido };
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
      const avisos = [];
      const perto = dosePerto(ctx, horario, editandoId);
      if (perto) {
        avisos.push({ texto: `Há uma dose registrada às ${fmtHora(perto.t)}, a 1 hora ou menos. A bula pede para não dar duas doses com intervalo de 1 hora ou menos.`, confirmar: true });
      }
      const validade = validadeFrasco(ctx);
      if (validade !== null && chaveDia(horario) > validade) {
        avisos.push({ texto: `O frasco preparado vale 14 dias e venceu em ${fmtDia(validade)}. Se já preparou outro, atualize a data em Ajustes.`, confirmar: true });
      }
      const plano = ctx.plano('amoxicilina');
      if (!plano || !plano.horarios.length) return avisos;
      const eventos = ctx.doTipo('amoxicilina').filter((e) => e.id !== editandoId);
      const doses = casarPlano(plano.horarios, eventos);
      const alvo = doses.find((d) => horario >= d.inicio && horario < d.fim);
      if (alvo && alvo.evento && alvo.evento !== perto) {
        avisos.push({ texto: `A dose ${alvo.numero} já foi registrada às ${fmtHora(alvo.evento.t)}. Confira antes de registrar de novo.`, confirmar: true });
      }
      return avisos;
    }
  }
};

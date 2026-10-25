import { liberacao, contarEmJanela, maisProximo, casarPlano, fmtHora, fmtMl } from '../regras.js';

const INTERVALO_H = 6;
const MIN = 60 * 1000;

/** Doses de Tylenol nas 24h que terminam em "ate" (sem contar o registro em edição). */
function dosesEm24h(ctx, ate, ignorarId = '') {
  return contarEmJanela(ctx.doTipo('tylenol').filter((e) => e.id !== ignorarId), ate, 24);
}

/** Horários de amoxicilina relevantes: plano + doses registradas. */
function temposAmoxicilina(ctx) {
  const plano = ctx.plano('amoxicilina');
  const registradas = ctx.doTipo('amoxicilina').map((e) => e.t);
  const pendentes = plano ? casarPlano(plano.horarios, ctx.doTipo('amoxicilina')).filter((d) => !d.evento).map((d) => d.t) : [];
  return [...registradas, ...pendentes];
}

export default {
  id: 'tylenol',
  rotulo: 'Tylenol',
  cor: '#8070C4',
  icone: '<svg viewBox="0 0 24 24"><path d="M12 3.2c3.6 4.3 6 7.4 6 10.6a6 6 0 0 1-12 0c0-3.2 2.4-6.3 6-10.6z"/><path d="M9.4 14.2a2.6 2.6 0 0 0 2.6 2.6"/></svg>',
  lembrete: 'Só se tiver febre. Registre apenas doses dadas por causa de febre. Pela bula: no máximo 5 doses em 24 horas, sempre com a seringa dosadora (nunca direto do frasco).',
  campos: [
    { id: 'dose', rotulo: 'Dose', tipo: 'texto', placeholder: 'Opcional, como na receita' },
    { id: 'observacao', rotulo: 'Observação', tipo: 'texto', placeholder: 'Opcional' }
  ],

  resumo(dados) {
    return { texto: [dados.dose, dados.observacao].filter(Boolean).join(' · ') || 'Dose dada' };
  },

  /** Registro novo já vem com a dose da receita (Ajustes → tylenol_dose_ml). */
  padroes(ctx) {
    const ml = ctx.numeroConfig('tylenol_dose_ml');
    return ml ? { dose: fmtMl(ml) } : {};
  },

  resumoDia(ctx, dia) {
    const lista = ctx.doDia('tylenol', dia);
    if (!lista.length) return null;
    return { valor: lista.length === 1 ? '1 dose' : `${lista.length} doses`, detalhe: lista.map((e) => fmtHora(e.t)).join(', ') };
  },

  regras: {
    prioridade: 50,
    intervaloMinimoH: INTERVALO_H,

    status(ctx) {
      const { liberadoEm, liberado } = liberacao(ctx.ultimo('tylenol', ctx.agora), INTERVALO_H, ctx.agora);
      const linhas = [liberado ? 'Liberado agora (se tiver febre)' : `Liberado a partir de ${fmtHora(liberadoEm)} (se tiver febre)`];
      const max = ctx.numeroConfig('tylenol_max_24h');
      const n = dosesEm24h(ctx, ctx.agora);
      if (max === null) return { linhas: [...linhas, 'Defina o máximo em 24h em Ajustes'], aviso: true };
      if (n >= max) return { linhas: [...linhas, `Limite atingido: ${n} de ${max} em 24h`], alerta: true };
      return { linhas: [...linhas, `${n} de ${max} doses em 24h`] };
    },

    proximos(ctx) {
      const { liberadoEm, liberado } = liberacao(ctx.ultimo('tylenol', ctx.agora), INTERVALO_H, ctx.agora);
      if (liberado) return [];
      return [{ t: liberadoEm, titulo: 'Tylenol liberado', detalhe: 'Só se tiver febre', informativo: true }];
    },

    avisos(ctx, horario, dados, editandoId) {
      const avisos = [];
      const anterior = ctx.ultimo('tylenol', horario, editandoId);
      const { liberadoEm, liberado } = liberacao(anterior, INTERVALO_H, horario);
      if (!liberado) {
        avisos.push({ texto: `Ainda não passaram 6h da última dose (${fmtHora(anterior.t)}). Liberado a partir de ${fmtHora(liberadoEm)}.`, confirmar: true });
      }
      const max = ctx.numeroConfig('tylenol_max_24h');
      if (max === null) {
        avisos.push({ texto: 'O máximo de doses em 24h ainda não foi definido. Preencha em Ajustes conforme a bula.' });
      } else {
        const n = dosesEm24h(ctx, horario, editandoId);
        if (n >= max) {
          avisos.push({ texto: `Limite atingido: já foram ${n} de ${max} doses nas últimas 24h.`, confirmar: true });
        }
      }
      const amox = maisProximo(horario, temposAmoxicilina(ctx), 30);
      if (amox !== null) {
        avisos.push({ texto: `Separe 30–60 min da amoxicilina (dose às ${fmtHora(amox)}).` });
      }
      return avisos;
    },

    aposRegistrar(ctx, horario) {
      return `Ofereça alimento entre ${fmtHora(horario + 20 * MIN)} e ${fmtHora(horario + 30 * MIN)}.`;
    }
  }
};

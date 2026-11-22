import { fmtData, chaveDia, somarDias } from '../regras.js';

const DOSES = ['1ª', '2ª', '3ª', 'Reforço', 'Única'];

// Próxima dose (fase 15): a data vem da caderneta; o app nunca calcula o calendário.
export const ANTECEDENCIA_DIAS = 15; // aparece no botão a partir de 15 dias antes
export const ATRASO_MAX_DIAS = 60;   // atrasada continua no botão por até 60 dias
const SEGUINTE = { '1ª': '2ª', '2ª': '3ª', '3ª': 'Reforço' };

function textoDose(dose) {
  if (!dose) return '';
  if (dose === 'Reforço') return 'reforço';
  if (dose === 'Única') return 'dose única';
  return `${dose} dose`;
}

const nome = (dados) => [dados.vacina || 'Vacina', textoDose(dados.dose)].filter(Boolean).join(' · ');

/** Nome para comparar: sem acento, maiúscula nem espaços extras. Igual ao normalizarVacina_ do Code.gs. */
export const normalizarNome = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
const dataValida = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
const diasEntre = (de, ate) => Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86400000);
const fmtDia = (data) => fmtData(Date.parse(`${data}T12:00:00-03:00`));

/**
 * Próximas doses anotadas e ainda não tomadas. Uma próxima dose está cumprida quando há um registro de vacina com o
 * mesmo nome feito depois do registro que a anotou (a mesma regra do Code.gs, que cria os lembretes na agenda).
 * → [{ evento, data, vacina, dose (a seguinte, se dá para saber), dias (de hoje até a data; negativo = atrasada) }]
 */
export function pendentes(ctx) {
  const hoje = chaveDia(ctx.agora);
  const lista = ctx.doTipo('vacina');
  return lista
    .filter((e) => dataValida(e.dados.proxima))
    .filter((e) => !lista.some((v) => v.t > e.t && normalizarNome(v.dados.vacina) === normalizarNome(e.dados.vacina)))
    .map((e) => ({
      evento: e,
      data: e.dados.proxima,
      vacina: String(e.dados.vacina || '').trim() || 'Vacina',
      dose: SEGUINTE[e.dados.dose] || '',
      dias: diasEntre(hoje, e.dados.proxima)
    }))
    .sort((a, b) => a.data.localeCompare(b.data));
}

/** As que aparecem no botão: até 15 dias antes e até 60 dias de atraso. */
export const avisosVacina = (ctx) => pendentes(ctx).filter((p) => p.dias <= ANTECEDENCIA_DIAS && p.dias >= -ATRASO_MAX_DIAS);

/** "Pentavalente · 3ª dose" */
export const nomePendente = (p) => [p.vacina, textoDose(p.dose)].filter(Boolean).join(' · ');

/** "em 5 dias" / "amanhã" / "hoje" / "atrasada" */
export function quandoPendente(p) {
  if (p.dias < 0) return 'atrasada';
  if (p.dias === 0) return 'hoje';
  if (p.dias === 1) return 'amanhã';
  return `em ${p.dias} dias`;
}

export default {
  id: 'vacina',
  rotulo: 'Vacinas',
  cor: '#B85B8C',
  icone: '<svg viewBox="0 0 24 24"><path d="M17.5 3.5l3 3M19 5l-3.5 3.5"/><path d="M15.5 6.5l2 2-9 9H6.5v-2z"/><path d="M11 8l1.5 1.5M8.5 10.5 10 12"/><path d="M6.5 17.5 3.5 20.5"/></svg>',
  lembrete: 'Para vacinas antigas da caderneta, use “Outro dia” no horário.',
  campos: [
    { id: 'vacina', rotulo: 'Vacina', tipo: 'texto', placeholder: 'Nome, como na caderneta' },
    { id: 'dose', rotulo: 'Dose', tipo: 'opcoes', opcoes: DOSES },
    { id: 'local', rotulo: 'Local da aplicação', tipo: 'texto', placeholder: 'Opcional, ex. coxa esquerda' },
    { id: 'observacao', rotulo: 'Observação', tipo: 'texto', placeholder: 'Opcional, ex. reação, lote' },
    {
      id: 'proxima', rotulo: 'Data da próxima dose (opcional)', tipo: 'data',
      ajuda: `Como está na caderneta. O app avisa ${ANTECEDENCIA_DIAS} dias antes e põe um lembrete no Google Agenda.`
    }
  ],

  /** Registrar com uma próxima dose perto: já vem com o nome e a dose seguinte. */
  padroes(ctx) {
    const p = avisosVacina(ctx)[0];
    return p ? { vacina: p.vacina === 'Vacina' ? '' : p.vacina, dose: p.dose } : {};
  },

  resumo(dados) {
    const proxima = dataValida(dados.proxima) ? `próxima em ${fmtDia(dados.proxima)}` : '';
    return { texto: [nome(dados), dados.local, dados.observacao, proxima].filter(Boolean).join(' · ') };
  },

  resumoDia(ctx, dia) {
    const lista = ctx.doDia('vacina', dia);
    if (!lista.length) return null;
    return {
      valor: lista.length === 1 ? (lista[0].dados.vacina || '1 vacina') : `${lista.length} vacinas`,
      detalhe: lista.length === 1 ? textoDose(lista[0].dados.dose) : lista.map((e) => e.dados.vacina || 'Vacina').join(', ')
    };
  },

  regras: {
    prioridade: 1,

    status(ctx) {
      const avisos = avisosVacina(ctx);
      if (avisos.length) {
        const p = avisos[0];
        const mais = avisos.length > 1 ? ` · +${avisos.length - 1}` : '';
        const quando = p.dias < 0 ? `desde ${fmtDia(p.data)}` : fmtDia(p.data);
        return {
          linhas: [`${nomePendente(p)} ${quandoPendente(p)}`, `${quando}${mais}`],
          alerta: p.dias < 0,
          aviso: p.dias >= 0
        };
      }
      const ultima = ctx.ultimo('vacina', ctx.agora);
      if (!ultima) return { linhas: ['Nenhuma registrada', 'Inclua as da caderneta'] };
      const total = ctx.doTipo('vacina').filter((e) => e.t <= ctx.agora).length;
      const quando = chaveDia(ultima.t) === chaveDia(ctx.agora) ? 'hoje' : `em ${fmtData(ultima.t)}`;
      return { linhas: [nome(ultima.dados), `Última ${quando} · ${total} ${total === 1 ? 'registrada' : 'registradas'}`] };
    },

    /** No dia: linha em destaque no card PRÓXIMO (informativo: nunca toma o lugar da rotina). */
    proximos(ctx) {
      return avisosVacina(ctx).filter((p) => p.dias === 0).map((p) => ({
        t: ctx.agora,
        titulo: `Vacina hoje · ${nomePendente(p)}`,
        detalhe: 'Data anotada da caderneta',
        informativo: true,
        destaque: true,
        diaInteiro: true
      }));
    },

    avisos(ctx, horario, dados) {
      if (!dataValida(dados.proxima)) return [];
      if (dados.proxima <= chaveDia(horario)) {
        return [{ texto: 'A data da próxima dose é igual ou anterior ao dia desta vacina. Confira na caderneta.', confirmar: true }];
      }
      if (dados.proxima > somarDias(chaveDia(horario), 5 * 366)) {
        return [{ texto: 'A data da próxima dose está muito longe. Confira na caderneta.', confirmar: true }];
      }
      return [];
    }
  }
};

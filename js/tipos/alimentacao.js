import { proximaPorRecorrencia, fmtHora } from '../regras.js';

const RECORRENCIA_H = 3;
const MIN = 60 * 1000;

/** Tylenol dado nos últimos 30 min, se houver. */
function tylenolRecente(ctx) {
  const t = ctx.ultimo('tylenol', ctx.agora);
  return t && ctx.agora - t.t <= 30 * MIN ? t : null;
}

export default {
  id: 'alimentacao',
  rotulo: 'Alimentação',
  cor: '#D08A4E',
  icone: '<svg viewBox="0 0 24 24"><path d="M9.5 2.5h5"/><path d="M10.5 2.5v2.8L8.3 8.4v10.3A2.8 2.8 0 0 0 11.1 21.5h1.8a2.8 2.8 0 0 0 2.8-2.8V8.4l-2.2-3.1V2.5"/><path d="M8.3 12.5h7.4"/></svg>',
  campos: [
    { id: 'quantidade', rotulo: 'Quantidade', tipo: 'texto', placeholder: 'Opcional, ex. 120 ml' },
    { id: 'observacao', rotulo: 'Observação', tipo: 'texto', placeholder: 'Opcional' }
  ],

  resumo(dados) {
    return { texto: [dados.quantidade, dados.observacao].filter(Boolean).join(' · ') || 'Alimentou' };
  },

  resumoDia(ctx, dia) {
    const lista = ctx.doDia('alimentacao', dia);
    if (!lista.length) return null;
    return { valor: lista.length === 1 ? '1 vez' : `${lista.length} vezes`, detalhe: `última ${fmtHora(lista.at(-1).t)}` };
  },

  regras: {
    prioridade: 30,
    recorrenciaH: RECORRENCIA_H,

    status(ctx) {
      const tyl = tylenolRecente(ctx);
      const ultima = ctx.ultimo('alimentacao', ctx.agora);
      const linhas = [ultima ? `Última ${fmtHora(ultima.t)}` : 'Nenhum registro'];
      if (tyl) linhas.push(`20–30 min após o Tylenol (${fmtHora(tyl.t + 20 * MIN)}–${fmtHora(tyl.t + 30 * MIN)})`);
      else if (ultima) linhas.push(`Próxima ${fmtHora(proximaPorRecorrencia(ultima, RECORRENCIA_H))}`);
      return { linhas };
    },

    proximos(ctx) {
      const tyl = tylenolRecente(ctx);
      if (tyl) {
        return [{
          t: tyl.t + 20 * MIN,
          titulo: 'Alimentação',
          detalhe: `20–30 min após o Tylenol (até ${fmtHora(tyl.t + 30 * MIN)})`
        }];
      }
      const ultima = ctx.ultimo('alimentacao', ctx.agora);
      if (!ultima) return [];
      const t = proximaPorRecorrencia(ultima, RECORRENCIA_H);
      return [{ t, titulo: 'Alimentação', detalhe: `3h após a última (${fmtHora(ultima.t)})`, alerta: ctx.agora - t > 30 * MIN }];
    }
  }
};

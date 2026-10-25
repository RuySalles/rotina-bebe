import { fmtHora, chaveDia, rotuloDia, somarDias } from '../regras.js';

/** Quantos dias de calendário entre dois instantes (no fuso de São Paulo). */
function diasEntre(t, agora) {
  let dia = chaveDia(t);
  const hoje = chaveDia(agora);
  let n = 0;
  while (dia < hoje && n < 400) { dia = somarDias(dia, 1); n++; }
  return n;
}

export default {
  id: 'banho',
  rotulo: 'Banho',
  cor: '#3E93B8',
  icone: '<svg viewBox="0 0 24 24"><path d="M3.5 12h17v1.5a6 6 0 0 1-6 6h-5a6 6 0 0 1-6-6z"/><path d="M6 12V6.5A2.5 2.5 0 0 1 10.6 5"/><path d="M8 19.5 7 21M16 19.5l1 1.5"/></svg>',
  campos: [
    { id: 'observacao', rotulo: 'Observação', tipo: 'texto', placeholder: 'Opcional' }
  ],

  resumo(dados) {
    return { texto: dados.observacao || 'Tomou banho' };
  },

  resumoDia(ctx, dia) {
    const lista = ctx.doDia('banho', dia);
    if (!lista.length) return null;
    return {
      valor: lista.length === 1 ? `Às ${fmtHora(lista[0].t)}` : `${lista.length} banhos`,
      detalhe: lista.length === 1 ? '' : lista.map((e) => fmtHora(e.t)).join(', ')
    };
  },

  regras: {
    prioridade: 5,

    status(ctx) {
      const ultimo = ctx.ultimo('banho', ctx.agora);
      if (!ultimo) return { linhas: ['Nenhum registro'] };
      const n = diasEntre(ultimo.t, ctx.agora);
      const rot = rotuloDia(chaveDia(ultimo.t), ctx.agora);
      if (n === 0) return { linhas: [`Hoje às ${fmtHora(ultimo.t)}`] };
      if (n === 1) return { linhas: [`${rot} às ${fmtHora(ultimo.t)}`] };
      return { linhas: [`Há ${n} dias`, `Último em ${rot}`] };
    }
  }
};

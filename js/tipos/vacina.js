import { fmtData, chaveDia } from '../regras.js';

const DOSES = ['1ª', '2ª', '3ª', 'Reforço', 'Única'];

function textoDose(dose) {
  if (!dose) return '';
  if (dose === 'Reforço') return 'reforço';
  if (dose === 'Única') return 'dose única';
  return `${dose} dose`;
}

const nome = (dados) => [dados.vacina || 'Vacina', textoDose(dados.dose)].filter(Boolean).join(' · ');

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
    { id: 'observacao', rotulo: 'Observação', tipo: 'texto', placeholder: 'Opcional, ex. reação, lote' }
  ],

  resumo(dados) {
    return { texto: [nome(dados), dados.local, dados.observacao].filter(Boolean).join(' · ') };
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
      const ultima = ctx.ultimo('vacina', ctx.agora);
      if (!ultima) return { linhas: ['Nenhuma registrada', 'Inclua as da caderneta'] };
      const total = ctx.doTipo('vacina').filter((e) => e.t <= ctx.agora).length;
      const quando = chaveDia(ultima.t) === chaveDia(ctx.agora) ? 'hoje' : `em ${fmtData(ultima.t)}`;
      return { linhas: [nome(ultima.dados), `Última ${quando} · ${total} ${total === 1 ? 'registrada' : 'registradas'}`] };
    }
  }
};

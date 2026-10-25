import { fmtHora, fmtData, chaveDia, rotuloDia } from '../regras.js';

const OPCOES = ['Xixi', 'Cocô', 'Os dois'];

const temCoco = (dados) => dados.conteudo === 'Cocô' || dados.conteudo === 'Os dois';

const quando = (t, agora) => {
  const rot = rotuloDia(chaveDia(t), agora);
  if (rot === 'Hoje') return fmtHora(t);
  return `${rot === 'Ontem' ? 'ontem' : fmtData(t)} ${fmtHora(t)}`;
};

export default {
  id: 'fralda',
  rotulo: 'Fralda',
  cor: '#B08A2E',
  icone: '<svg viewBox="0 0 24 24"><path d="M3.5 7h17v3.5a8.5 8.5 0 0 1-17 0z"/><path d="M7.5 7v2.2M16.5 7v2.2"/><path d="M9 15.5c1.8 1.3 4.2 1.3 6 0"/></svg>',
  campos: [
    { id: 'conteudo', rotulo: 'O que tinha', tipo: 'opcoes', opcoes: OPCOES },
    { id: 'observacao', rotulo: 'Observação', tipo: 'texto', placeholder: 'Opcional, ex. assadura' }
  ],

  resumo(dados) {
    return { texto: [dados.conteudo, dados.observacao].filter(Boolean).join(' · ') || 'Troca de fralda' };
  },

  resumoDia(ctx, dia) {
    const lista = ctx.doDia('fralda', dia);
    if (!lista.length) return null;
    const cocos = lista.filter((e) => temCoco(e.dados)).length;
    return {
      valor: lista.length === 1 ? '1 troca' : `${lista.length} trocas`,
      detalhe: cocos ? `${cocos} com cocô` : 'nenhuma com cocô'
    };
  },

  regras: {
    prioridade: 15,

    status(ctx) {
      const ultima = ctx.ultimo('fralda', ctx.agora);
      if (!ultima) return { linhas: ['Nenhum registro'] };
      const hoje = ctx.doDia('fralda', chaveDia(ctx.agora)).filter((e) => e.t <= ctx.agora).length;
      const coco = ultimoCoco(ctx);
      const linhas = [
        `Última ${quando(ultima.t, ctx.agora)}${ultima.dados.conteudo ? ` · ${ultima.dados.conteudo}` : ''}`,
        `Hoje: ${hoje === 1 ? '1 troca' : `${hoje} trocas`}`
      ];
      if (coco) linhas.push(`Último cocô ${quando(coco.t, ctx.agora)}`);
      return { linhas };
    }
  }
};

function ultimoCoco(ctx) {
  let ultimo = null;
  for (const e of ctx.doTipo('fralda')) if (e.t <= ctx.agora && temCoco(e.dados)) ultimo = e;
  return ultimo;
}

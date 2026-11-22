// Anotações livres (fase 17): sintomas, marcos ("primeira vez que…") e o que mais quiserem guardar.
// Entram no Relatório (todas do período) e os marcos entram na imagem do grupo da família (nunca os sintomas).

import { fmtData, fmtHora, chaveDia } from '../regras.js';

export const CATEGORIAS = ['Sintoma', 'Marco', 'Outro'];

/** Sem tipo escolhido conta como Outro. */
export const categoria = (dados) => (CATEGORIAS.includes(dados?.categoria) ? dados.categoria : 'Outro');
export const textoAnotacao = (dados) => String(dados?.texto || '').trim().replace(/\s+/g, ' ');
const encurtar = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Anotações de um período: [{ t, categoria, texto }], em ordem de horário. */
export function anotacoesEntre(ctx, inicio, fim, so = null) {
  return ctx.doTipo('anotacao')
    .filter((e) => e.t >= inicio && e.t <= fim)
    .map((e) => ({ t: e.t, categoria: categoria(e.dados), texto: textoAnotacao(e.dados) }))
    .filter((a) => a.texto && (!so || a.categoria === so));
}

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

export default {
  id: 'anotacao',
  rotulo: 'Anotações',
  tituloNovo: 'Nova anotação',
  cor: '#7A7F3A',
  icone: '<svg viewBox="0 0 24 24"><path d="M5.5 4h9l4 4v11.5a.5.5 0 0 1-.5.5H5.5a.5.5 0 0 1-.5-.5v-15a.5.5 0 0 1 .5-.5z"/><path d="M14.5 4v4h4M8.5 12h7M8.5 15.5h5"/></svg>',
  lembrete: 'Sintomas, marcos ("primeira vez que…") ou o que quiser lembrar. Para algo de outro dia, use “Ontem” ou “Outro dia”.',
  campos: [
    { id: 'texto', rotulo: 'Anotação', tipo: 'textolongo', placeholder: 'ex. vomitou após mamar; manchinha no braço; primeira vez que comeu pera' },
    { id: 'categoria', rotulo: 'Tipo (opcional)', tipo: 'opcoes', opcoes: CATEGORIAS }
  ],

  resumo(dados) {
    const texto = encurtar(textoAnotacao(dados), 140) || 'Anotação sem texto';
    const cat = categoria(dados);
    return { texto: cat === 'Outro' ? texto : `${cat} · ${texto}`, destaque: cat === 'Sintoma' };
  },

  resumoDia(ctx, dia) {
    const lista = ctx.doDia('anotacao', dia);
    if (!lista.length) return null;
    const sintomas = lista.filter((e) => categoria(e.dados) === 'Sintoma').length;
    const marcos = lista.filter((e) => categoria(e.dados) === 'Marco').length;
    return {
      valor: plural(lista.length, 'anotação', 'anotações'),
      detalhe: [sintomas ? plural(sintomas, 'sintoma', 'sintomas') : '', marcos ? plural(marcos, 'marco', 'marcos') : ''].filter(Boolean).join(' · ')
    };
  },

  regras: {
    prioridade: 0,

    status(ctx) {
      const ultima = ctx.ultimo('anotacao', ctx.agora);
      if (!ultima) return { linhas: ['Nenhuma ainda', 'Sintomas, marcos, o que quiser'] };
      const quando = chaveDia(ultima.t) === chaveDia(ctx.agora) ? `hoje ${fmtHora(ultima.t)}` : `${fmtData(ultima.t)} ${fmtHora(ultima.t)}`;
      return { linhas: [encurtar(textoAnotacao(ultima.dados) || 'Anotação', 48), quando] };
    },

    avisos(ctx, horario, dados) {
      return textoAnotacao(dados) ? [] : [{ texto: 'Escreva a anotação antes de salvar.', confirmar: true }];
    }
  }
};

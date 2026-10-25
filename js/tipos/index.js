// Registro central dos tipos de evento.
// Para criar um tipo novo: crie js/tipos/<id>.js (veja os existentes) e adicione abaixo.
// A ordem da lista é a ordem dos botões na tela principal.
//
// Formato de um tipo:
// {
//   id, rotulo, cor, icone (SVG), lembrete?,
//   campos: [{ id, rotulo, tipo: 'texto' | 'numero' | 'opcoes', opcoes?, min?, max?, passo?, placeholder? }],
//   resumo(dados, ctx) → { texto, destaque? },
//   migrar?(dados, versao) → dados        (ler schema_version antigo)
//   painel?(ctx) → { titulo, itens }      (bloco extra na tela principal)
//   regras?: {
//     prioridade, usaPlano?, intervaloMinimoH?, recorrenciaH?,
//     status(ctx) → { linhas, alerta?, aviso?, ok? },
//     proximos(ctx) → [{ t, titulo, detalhe, alerta?, informativo? }],
//     infoRegistro?(ctx, horario, editandoId) → texto,
//     avisos?(ctx, horario, dados, editandoId) → [{ texto, confirmar? }],
//     aposRegistrar?(ctx, horario, dados) → texto
//   }
// }

import amoxicilina from './amoxicilina.js';
import tylenol from './tylenol.js';
import alimentacao from './alimentacao.js';
import febre from './febre.js';

export const LISTA_TIPOS = [amoxicilina, tylenol, alimentacao, febre];

export const TIPOS = Object.fromEntries(LISTA_TIPOS.map((t) => [t.id, t]));

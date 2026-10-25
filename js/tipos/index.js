// Registro central dos tipos de evento.
// Para criar um tipo novo: crie js/tipos/<id>.js (veja os existentes) e adicione abaixo.
// A ordem da lista é a ordem dos botões na tela principal.
//
// Formato de um tipo:
// {
//   id, rotulo, cor, icone (SVG), lembrete? (texto ou (ctx) → texto),
//   campos: [{ id, rotulo, tipo: 'texto' | 'numero' | 'opcoes' | 'hora', opcoes?, min?, max?, passo?, placeholder?, ajuda? }],
//     ('hora' guarda um ISO: o primeiro horário HH:MM a partir do horário do registro; vazio = '')
//   resumo(dados, ctx, evento?) → { texto, destaque? },
//   padroes?(ctx) → dados                 (valores já preenchidos num registro novo)
//   resumoDia?(ctx, dia) → { valor, detalhe?, destaque? } | null   (cartão "Resumo" e cabeçalho do histórico filtrado)
//   migrar?(dados, versao) → dados        (ler schema_version antigo)
//   painel?(ctx) → { titulo, itens }      (bloco extra na tela principal)
//   regras?: {
//     prioridade, usaPlano?, intervaloMinimoH?, recorrenciaH?,
//     status(ctx) → { linhas, alerta?, aviso?, ok?, ativo? },   (ativo: algo em andamento, ex. dormindo)
//     proximos(ctx) → [{ t, titulo, detalhe, alerta?, informativo? }],
//     registrarComo?(ctx) → { editarId, dados?, titulo? } | null   (o botão abre um registro existente)
//     infoRegistro?(ctx, horario, editandoId) → texto,
//     avisos?(ctx, horario, dados, editandoId) → [{ texto, confirmar? }],
//     aposRegistrar?(ctx, horario, dados) → texto
//   }
// }

import amoxicilina from './amoxicilina.js';
import tylenol from './tylenol.js';
import alimentacao from './alimentacao.js';
import febre from './febre.js';
import sono from './sono.js';
import fralda from './fralda.js';
import banho from './banho.js';
import vacina from './vacina.js';

export const LISTA_TIPOS = [amoxicilina, tylenol, alimentacao, febre, sono, fralda, banho, vacina];

export const TIPOS = Object.fromEntries(LISTA_TIPOS.map((t) => [t.id, t]));

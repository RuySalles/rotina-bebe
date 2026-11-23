# Plano de melhorias em fases

Uma melhoria por fase. Só passamos para a próxima depois do seu ok.

## Como cada fase funciona

1. **Eu implemento**, rodo os testes automáticos e confiro no navegador com dados de teste (sem tocar na planilha real).
2. **Publico** no site. Como vocês só usam a versão web, o teste é no próprio app.
3. **Você testa no celular** seguindo o roteiro "Como testar" da fase.
4. **Você dá o ok** (ou me diz o que ajustar). Se algo der errado, eu corrijo ou desfaço a mudança e publico de novo.
5. Marco a fase como aprovada aqui e começamos a próxima.

Nenhuma fase apaga ou altera registros já feitos. Fases que exigem algo da sua parte (republicar o Web App, autorizar
algo) dizem isso em "Você vai precisar".

**Situação:** ⬜ pendente · 🔄 em andamento · 🧪 publicada, aguardando seu teste · ✅ aprovada

| Fase | Melhoria | Prioridade | Situação |
|---|---|---|---|
| 1 | Desfazer logo depois de registrar | — | ✅ |
| 2 | Remédio novo sem precisar de programação | — | ✅ |
| 3 | Histórico de ajustes (quem mudou o quê, com volta) | — | ✅ |
| 4 | Sincronização mais rápida | — | ✅ |
| 5 | Rotina em primeiro lugar na tela inicial | — | ✅ |
| 6 | Organização das 3 abas (Início, Histórico, Ajustes) | — | ✅ |
| 7 | Alimentação: leite, fruta ou refeição | — | ✅ |
| 8 | Previsões de sono e de leite | — | ✅ |
| 9 | Abrir o app sem internet | — | ✅ |
| 10 | Alertas no celular pelo Google Agenda | — | ✅ |
| 11 | Esconder e reordenar botões | — | ✅ |
| 12 | Relatório para a consulta (+ compartilhar como imagem) | Alta | ✅ |
| 13 | Família participando (placar e ranking) | Alta | ✅ |
| 14 | Peso e altura | Alta | ✅ |
| 15 | Aviso de vacina | Alta | ✅ |
| 16 | Consultas e retornos | Média | ✅ |
| 17 | Anotações livres | Baixa | ✅ |
| 18 | Relatório para a pediatra: resumo primeiro, 30 e 60 dias | Alta | ✅ |
| 19 | Aba Resumo (Histórico só com a lista) | Alta | ✅ |
| 20 | Tela inicial: o que importa agora em primeiro lugar | Média | 🧪 |
| 21 | Gamificação: conquistas, meta da semana e marcos | Média | ⬜ |

**Revisão de 22/11 (depois de 1 mês de uso):** a ordem foi refeita olhando os registros do mês. Quase todos os
registros são de alimentação, sono, fralda e banho, mas os primeiros botões da tela são remédios; houve sonos
iniciados duas vezes (um celular ainda não sabia do outro); e a pergunta do dia a dia é "já está na hora de dormir / de
comer?". Por isso entraram as fases 4 a 8. A antiga "App leve depois de muitos meses" virou parte da fase 4 e a antiga
"Mamada completa" (peito, lado) virou a fase 7, porque a alimentação é por mamadeira e sólidos.

**Replanejamento de 22/11 (depois da fase 12):** cada fase pendente ganhou uma prioridade (alta, média, baixa) e a
fila segue essa ordem: primeiro Peso e altura e Aviso de vacina (alta), depois Consultas (média) e por último Anotações
livres (baixa). Antes disso, "Anotações livres" já tinha ido para o fim. Nenhuma fase ganhou itens novos nesta revisão.
Em seguida, a fase 12 ganhou "Compartilhar como imagem" e entrou a fase 13 nova, **Família participando** (prioridade
alta): placar de Pai, Mãe e família e ranking só da família, com uma imagem para o grupo sem dados de saúde.

**Revisão de 22/11, tela por tela (depois da fase 17):** com 2 meses de dados de teste (1.097 registros, 4 pessoas
registrando), cada tela foi olhada no celular e na tela grande, perguntando "a informação mais importante está em
primeiro lugar?". O que apareceu:
- **Relatório:** abre com a tabela dia a dia (cerca de 1.000 px no celular) antes de qualquer resumo, e vai só até
  14 dias. Para a consulta, o que interessa é o resumo do período, comparado com o anterior, no formato em que a
  pediatra pergunta (crescimento, alimentação, sono, fraldas, intercorrências, vacinas, marcos, dúvidas). Falta a
  idade do bebê (não há data de nascimento) e um período "desde a última consulta". → **fase 18**.
- **Histórico:** antes da lista aparecem o Relatório, a Família e o Ritmo; a lista começa no meio da tela. Relatório,
  Família, Ritmo e os gráficos de Medidas são "resumos", não histórico. → **fase 19** (aba Resumo).
- **Tela inicial:** com o bebê dormindo, o card PRÓXIMO fala do leite e o "Dormindo há 35 min" fica num botão menor;
  Febre (medida há 7 dias) e Tylenol ("liberado agora") ficam sempre no alto da faixa, mesmo sem uso; a vacina com
  dose em 5 dias fica no meio; vários textos da faixa são cortados ("Def…"); o botão de Alimentação repete o "próximo
  leite" do card. → **fase 20**.
- **Ajustes, formulários, Família:** estão enxutos. Ajustes ganha só a data de nascimento (fase 18).
- **Gamificação:** o placar da fase 13 é um começo; as ideias da fase 21 premiam quem cuida e registros completos
  (o que também deixa o relatório melhor), nunca remédio ou febre.
- **Ordem combinada:** 18, 19, 20, 21 (primeiro o relatório, que é o pedido principal).

---

## Fase 1 — Desfazer logo depois de registrar

**Por quê:** um toque errado de madrugada hoje exige ir ao Histórico, abrir o registro e apagar.

**O que muda:** depois de registrar, salvar uma alteração ou apagar, aparece por 8 segundos um aviso com o botão
**Desfazer**. Ele apaga o registro novo, volta a alteração ou traz de volta o apagado (pela regra de sempre: uma linha
nova na planilha, nada é sobrescrito).

**Você vai precisar:** nada.

**Como testar:**
- [ ] Registrar uma fralda e tocar em **Desfazer**: o registro some do Histórico e do Resumo.
- [ ] Registrar outra e **não** tocar em Desfazer: o aviso some sozinho e o registro fica.
- [ ] Registrar o despertar de um sono e desfazer: o sono volta a aparecer como "Dormindo".
- [ ] Editar um registro (ex. mudar a hora), desfazer: volta como estava.
- [ ] Apagar um registro pelo Histórico, desfazer: ele volta.
- [ ] No outro celular, depois de sincronizar, o registro desfeito também não aparece.

---

## Fase 2 — Remédio novo sem precisar de programação

**Por quê:** hoje cada remédio está escrito no código. Uma receita nova (vitamina D, outro antibiótico, um xarope)
dependeria de mim.

**O que muda:** em Ajustes, **Remédios → Adicionar remédio**, com:
- nome e dose (texto livre, ex. "4 mL" ou "2 gotas");
- jeito de dar: **horários fixos** (como a amoxicilina, com plano e contador de doses), **a cada X horas**, ou
  **só se precisar** (como o Tylenol: nunca entra no card PRÓXIMO, só mostra quando está liberado);
- intervalo mínimo entre doses (aviso se registrar antes);
- máximo de doses em 24 horas e um lembrete na hora de registrar (opcionais);
- encerrar o remédio quando o tratamento acabar (o histórico continua) ou reativar depois;
- excluir um remédio cadastrado por engano (só aparece se ele não tiver nenhuma dose).

Cada remédio cadastrado ganha botão na tela inicial, entra no Resumo, no Histórico (com filtro) e na linha do tempo.
Amoxicilina e Tylenol continuam exatamente como estão.

**Você vai precisar:** nada (os remédios ficam na aba config da planilha; o Web App não muda).

**Como testar** (Ajustes → Remédios; use nomes como "Teste 1" para achar fácil):
- [ ] Cadastrar "Teste 1", **A cada X h**, a cada 8 horas, intervalo mínimo 6, dose "1 mL". O botão aparece na tela
      inicial; ao registrar, a dose já vem "1 mL" e o botão mostra "Próxima" 8h depois.
- [ ] Registrar outra dose de "Teste 1" logo em seguida: o app pede confirmação (intervalo mínimo).
- [ ] Cadastrar "Teste 2", **Só se precisar**, máximo 2 em 24h. Registrar 2 doses: o botão mostra "Limite atingido"
      e ele nunca aparece no card PRÓXIMO.
- [ ] Cadastrar "Teste 3", **Horários fixos**; em Planos de horário aparece "Teste 3": salvar 2 horários de hoje.
      O botão mostra "0 de 2 doses" e a próxima, como a amoxicilina.
- [ ] No outro celular, depois de sincronizar, os 3 remédios aparecem.
- [ ] Encerrar "Teste 1": o botão some; no Histórico, o filtro "Teste 1" ainda mostra as doses.
- [ ] Limpeza: desfazer/apagar as doses de teste e, em cada remédio de teste, tocar em **Excluir remédio**.
- [ ] Amoxicilina e Tylenol seguem iguais.

---

## Fase 3 — Histórico de ajustes (quem mudou o quê, com volta)

**Por quê:** hoje a planilha **sobrescreve** cada ajuste: o valor antigo se perde e não fica registrado quem mudou nem
quando. Se alguém mexer sem querer (uma dose, o limite de febre, um remédio, um plano de horários), não dá para saber o
que era antes.

**O que muda:**
- Toda mudança feita em Ajustes passa a deixar um registro: **quando, quem (o apelido do celular), o quê, o valor de
  antes e o de depois**. Vale para: nome do bebê, limite de febre, Tylenol (remédio em uso, máximo, doses),
  amoxicilina (dose, frasco), remédios cadastrados (adicionado, alterado, encerrado, reativado, excluído) e planos de
  horário (salvo ou encerrado).
- Em Ajustes, uma seção nova **Histórico de ajustes** mostra as mudanças mais recentes primeiro, por exemplo:
  "25/10 21:10 · Mãe · Tylenol Bebê: dose em mL · 1,2 → 1,5".
- Cada item tem **Voltar** (toque e depois **Confirmar**), que desfaz aquela mudança (e a volta também fica registrada).
  Mostra as 10 mais recentes; **Ver mais** traz as anteriores.
- Os registros ficam na aba **eventos** (que só recebe linhas novas, nunca apaga), como um tipo interno que não aparece
  na tela inicial, no Histórico de registros nem no Resumo.

**Limites (de propósito):**
- Só registra mudanças feitas **pelo app a partir desta fase**. O que foi mudado antes, ou direto na planilha, não
  aparece.
- O apelido de cada celular não entra (ele fica só naquele aparelho).

**Você vai precisar:** nada (sem republicar o Web App, sem mexer na planilha).

**Como testar:**
- [ ] Mudar o limite de febre de 37,8 para 38: o Histórico de ajustes mostra "Limite de febre · 37,8 → 38" com seu
      apelido e o horário.
- [ ] Tocar em **Voltar** e depois em **Confirmar**: o limite volta a 37,8 e aparece uma linha nova da volta.
- [ ] No celular da sua esposa, mudar a dose do Tylenol: no seu celular, depois de sincronizar, aparece com o apelido
      dela.
- [ ] Encerrar e reativar um remédio, e salvar um plano de horários: cada um aparece com antes e depois.
- [ ] Tela inicial, Histórico e Resumo continuam sem nenhum item de ajuste.

---

## Fase 4 — Sincronização mais rápida

**Por quê:** hoje cada registro é enviado sozinho e, depois de cada envio, o app baixa a planilha inteira de novo. Com
algumas dezenas de linhas novas por dia, isso fica mais lento a cada semana. Quando um celular ainda não sabe do outro,
acontece de o sono ser iniciado duas vezes, ou de alguém esperar para fechar o sono que o outro abriu.

**O que muda:**
- O que estiver na fila vai **de uma vez só**, num único envio.
- O app baixa **só o que mudou** desde a última vez, não a planilha toda. Ao abrir o app e a cada 10 minutos,
  confere tudo de novo, para nunca ficar com algo faltando.
- Um registro feito enquanto o app sincroniza sobe logo em seguida (antes podia esperar até 30 segundos).
- Ao tocar em **Sono**, se a última sincronização foi há mais de 15 segundos, o app confere o outro celular antes de
  abrir (no máximo 4 segundos; sem internet, abre na hora). Assim, se o sono já foi iniciado lá, abre direto
  "Registrar despertar".
- Se mesmo assim o outro celular iniciar um sono enquanto a tela está aberta, ao salvar aparece "Já tem um sono
  iniciado às 14:02 por Pai" e é preciso confirmar. O mesmo vale para um horário que cai dentro de um sono já
  registrado.

**Você vai precisar:** republicar o Web App (Implantar → Gerenciar implantações → editar → Nova versão). A mudança é
compatível: a versão atual do app continua funcionando com o Web App novo, e vice-versa.

**Como testar:**
- [ ] Registrar uma fralda num celular: no outro, aparece em até 30 segundos (ou na hora, ao voltar para o app).
- [ ] Em modo avião, registrar 3 coisas; desligar o modo avião: as 3 sobem juntas e viram "Sincronizado".
- [ ] Iniciar um sono num celular e, uns 20 segundos depois, tocar em Sono no outro: abre "Registrar despertar"
      (e não um sono novo).
- [ ] Antes de republicar o Web App o app continua funcionando normalmente (só sem a parte mais rápida).
- [ ] O Histórico, o Resumo de ontem e o Histórico de ajustes continuam completos.

---

## Fase 5 — Rotina em primeiro lugar na tela inicial

**Por quê:** quase todos os registros do mês foram de alimentação, sono, fralda e banho, mas os primeiros botões da
tela são remédios: um tratamento que já acabou e um remédio "só se precisar" que quase não foi usado. E uma vitamina de
todo dia não se encaixa em nenhum dos jeitos de dar de hoje (fica mostrando "Sem plano de horários"), e passa
despercebida quando esquecem.

**O que muda:**
- Os botões da rotina (Alimentação, Sono, Fralda, Banho) vêm primeiro e grandes. O Resumo do dia também começa por
  eles.
- Remédios, Febre e Vacinas ficam numa faixa compacta logo abaixo, uma linha cada, com o estado ("Hoje: dada às
  08:19", "Liberado agora", "Próxima 21:00"). Ordem: tratamentos em andamento, Febre, "só se precisar" (como o
  Tylenol), Vacinas. Tocar na linha registra, como os botões.
- Remédio de horários fixos com o tratamento concluído (como a amoxicilina) mostra "Tratamento concluído" por 12 horas
  depois da última dose do plano e então sai da tela inicial. Continua no Histórico e no filtro. A amoxicilina sem
  plano também não aparece; salvar um plano novo para ela traz o botão de volta.
- Jeito de dar novo: **1 vez por dia**, com "Avisar se não for dada até" (padrão 10:00, de meia em meia hora). Mostra
  "Hoje: ainda não" ou "Hoje: dada às HH:MM". Passando da hora sem registro, a linha fica em destaque e o remédio entra
  no card PRÓXIMO (sem "Atrasado"). Registrar de novo no mesmo dia pede confirmação.
- Ajustes depois dos primeiros prints: o topo mostra só o primeiro nome (o completo continua em Ajustes) e o bloco
  "Febre · últimas medições" só aparece com medição dos últimos 3 dias (febre antiga também perde o destaque).

**Você vai precisar:** em **Ajustes → Remédios**, tocar na vitamina, escolher **1 vez por dia** em "Como dar",
conferir a hora em "Avisar se não for dada até" e tocar em **Salvar alterações**.

**Como testar:**
- [ ] A tela inicial abre com Alimentação, Sono, Fralda e Banho em cima; logo abaixo, a faixa com a vitamina, Febre,
      Tylenol e Vacinas.
- [ ] A amoxicilina (já concluída) não aparece mais na tela inicial; no Histórico, o filtro dela mostra as doses.
- [ ] Com a vitamina em "1 vez por dia": antes de registrar mostra "Hoje: ainda não"; depois, "Hoje: dada às HH:MM".
- [ ] Num dia em que ninguém deu a vitamina até a hora escolhida, ela aparece no card PRÓXIMO.
- [ ] O Tylenol continua a um toque e nunca aparece no card PRÓXIMO.
- [ ] O topo mostra só o primeiro nome; o bloco "Febre · últimas medições" só aparece com medição dos últimos 3 dias.

---

## Fase 6 — Organização das 3 abas (Início, Histórico, Ajustes)

**Por quê:** depois da fase 5, cada aba ainda repetia informação ou misturava assuntos. No Início, o Resumo repetia o
que os botões já mostram e "Próximas 24 horas" repetia o card PRÓXIMO. No Histórico, os filtros começavam pelos
remédios e o dia só dizia "20 registros". Ajustes era uma página muito longa: nome e febre misturados com seis campos
de Tylenol e amoxicilina, o formulário de remédio sempre aberto e os horários dos planos numa seção separada.

**O que muda:**
- **Início = o agora.** Ficam o card PRÓXIMO, os 4 botões da rotina e a faixa. Os próximos horários viram até 3
  linhas "Depois" dentro do card PRÓXIMO. O Resumo sai daqui e vai para o Histórico.
- **Histórico:** cada dia começa com os totais (alimentação, sono, fraldas, banho, remédios); tocar num total filtra.
  Os filtros seguem a ordem da tela inicial (rotina, remédios em uso, febre, "só se precisar", vacinas) e os
  tratamentos encerrados ficam no fim.
- **Ajustes em blocos que abrem ao tocar:**
  - **Bebê:** nome e limite de febre.
  - **Remédios:** um item por remédio (Tylenol, os cadastrados e a amoxicilina); tocar abre tudo dele: dose, jeito
    de dar, horários do plano, encerrar. **+ Adicionar remédio** só abre ao tocar. Tratamentos encerrados ficam
    recolhidos no fim.
  - **Histórico de ajustes** e **Este celular** (apelido, link, sincronia, versões).
- Nada muda nos dados: só a arrumação das telas. O Histórico de ajustes continua registrando tudo, com Voltar.

**Você vai precisar:** nada.

**Como testar:**
- [ ] O Início mostra PRÓXIMO (com as linhas "Depois"), os 4 botões e a faixa, sem Resumo nem "Próximas 24 horas".
- [ ] No Histórico, cada dia mostra os totais no topo; tocar em "Sono" filtra só os sonos. Os filtros começam por
      Alimentação, Sono, Fralda, Banho.
- [ ] Em Ajustes, os blocos começam fechados. Abrir Remédios → Tylenol, mudar a dose e salvar: vale no próximo
      registro e aparece no Histórico de ajustes.
- [ ] A amoxicilina está em "Tratamentos encerrados", com os horários do plano dentro dela.
- [ ] Mudar o nome em Bebê e o apelido em Este celular continua funcionando.

---

## Fase 7 — Alimentação: leite, fruta ou refeição

**Por quê:** a alimentação era só um texto livre, então o app não sabia se foi mamadeira ou uma fruta. Não dava para
somar o leite do dia, e a "próxima alimentação" contava a partir de qualquer coisa que ele comeu.

**O que muda:**
- Ao registrar, **O que foi:** Leite, Fruta, Refeição. Dá para marcar mais de um (ex. Leite + Fruta).
  - **Leite:** mL com atalhos dos valores mais usados nos últimos 14 dias (já vem o último usado) e um campo para outro
    valor.
  - **Fruta / Refeição:** campo "O que comeu" com os últimos textos usados como atalho (ex. "Banana", "2 cubos de
    feijão…").
- O botão mostra o último leite (com mL), o próximo leite e a última fruta ou refeição.
- O próximo leite é 3h depois do último leite (fruta não muda isso). Depois de uma refeição, ele não fica antes de 1h
  depois dela (até a fase 8 aprender o ritmo de verdade).
- O Histórico mostra "Leite 180 mL · Banana", e o total do dia vira "900 mL de leite" (mamadeiras, refeições e frutas
  no detalhe).
- **Registros antigos** são lidos pelo texto (ex. "180ml" e "150 ml de leite" viram leite; "Banana" vira fruta; "sopa",
  "cubos", "feijão" viram refeição), só na hora de mostrar: a planilha continua igual. Num mês de dados reais, 97% dos
  registros foram reconhecidos (os que sobraram estavam sem texto).

**Você vai precisar:** nada.

**Como testar:**
- [ ] Registrar Leite: os mL já vêm com o último valor; tocar num atalho troca o valor.
- [ ] Registrar Leite + Fruta no mesmo registro: o Histórico mostra "Leite N mL · Banana".
- [ ] Registrar uma Fruta: o "Próximo leite" no botão não muda.
- [ ] No Histórico, os dias antigos mostram o total em mL de leite e os registros antigos aparecem como "Leite 180 mL".
- [ ] A regra de "20–30 min após o Tylenol" continua valendo.

---

## Fase 8 — Previsões de sono e de leite

**Por quê:** a pergunta de todo dia é "será que já está na hora de dormir? de mamar de novo?". O app usava um número
fixo (3 horas) e não dizia nada sobre o sono. Um mês de registros mostra que o bebê tem um ritmo próprio e regular, que
muda com a hora do dia.

**O que muda:**
- **Sono:** o botão mostra "Próximo sono ~14:10" (ou "Dormir à noite ~21:05" no fim da tarde), pelo tempo que ele
  costuma ficar acordado naquela faixa do dia (de manhã é diferente do fim da tarde) e pela hora em que costuma ser
  deitado para a noite.
- **Leite:** "Próximo leite ~16:35", pelo intervalo que ele costuma fazer entre mamadeiras naquele horário. Depois de
  uma refeição, pelo tempo que o leite costuma demorar depois dela. Fruta não muda a conta.
- **Card PRÓXIMO:** mostra o que vem primeiro (sono ou leite), com "Próximo · por volta de"; o outro aparece em
  "Depois". Previsão **nunca fica vermelha nem vira "Atrasado"**; se passar 1h da hora prevista sem registro, ela sai
  do card.
- **Ritmo dele** (topo do Histórico, recolhido numa linha): tempo acordado típico de manhã, no começo e no fim da
  tarde; cochilos por dia; hora de dormir e de acordar; mamadeiras e mL por dia; intervalo entre mamadeiras. Entre
  parênteses, os 14 dias anteriores, quando mudou.
- As contas usam só os **últimos 14 dias** (dias inteiros), então se ajustam sozinhas conforme ele cresce. Tempo
  acordado acima de 6h é ignorado (quase sempre é um sono que não foi registrado). Horários previstos são arredondados
  para 5 minutos. Sem registros suficientes, nada é previsto (o leite volta à regra fixa das 3h).
- Conferido com o mês real (sem tocar na planilha): a previsão do próximo sono erra ~20 minutos em geral (6 em cada 10
  ficam a até meia hora). A do leite erra mais (~50 min), porque as mamadeiras variam mais; ela melhora a conta fixa
  das 3h, mas é só uma referência.

- Ajustes depois dos primeiros prints (22/11): previsão que já passou da hora **continua no card** como "Já passou
  do costume" (sem vermelho) por até 6h, em vez de sumir e deixar "Nada programado"; o botão mostra "· já passou".
- Junto, a tela ficou **responsiva**: tudo em rem com a fonte base crescendo com a tela (16px no celular, ~18px em
  Full HD, ~21px em ultrawide, ~26px em 4K); cartões mais compactos e espaçamento uniforme; tablet com a folha de
  registro no meio da tela; desktop com barra lateral, Início em duas colunas com os botões grandes ocupando a altura
  da tela, e Histórico/Ajustes em colunas (dias da esquerda para a direita).

**Você vai precisar:** nada.

**Como testar:**
- [ ] Quando passar da hora prevista sem registro, o card mostra "Já passou do costume" (não "Nada programado").
- [ ] Abrir o app no computador (e, se tiver, numa TV ou monitor grande): ocupa a tela toda, com letras proporcionais.
- [ ] Depois de marcar o despertar de um cochilo de manhã, o botão de Sono mostra "Próximo sono ~…" num horário que faz
      sentido para vocês.
- [ ] Depois de uma mamadeira, o botão de Alimentação mostra "Próximo leite ~…"; registrar uma fruta não muda esse
      horário.
- [ ] No card PRÓXIMO, a previsão aparece com "por volta de" e, quando passa da hora, não fica vermelha.
- [ ] O "Ritmo dele" (topo do Histórico) bate com o que vocês percebem.

---

## Fase 9 — Abrir o app sem internet

**Por quê:** os registros já ficam guardados quando a internet cai com o app aberto, mas **abrir** o app sem sinal
pode não carregar a tela.

**O que muda:** o app passa a guardar a si mesmo no celular. Abre sempre, mostra os últimos dados conhecidos e envia
os registros quando a internet voltar. A atualização automática de versão continua funcionando.
- Sem internet, o indicador no topo mostra "Sem internet" (ou "Sem internet · 1 pendente"), em vez de "Erro".
- Conferido com o site montado de verdade: abre com o servidor desligado (com os dados do celular), registra em
  "Pendente", e uma versão nova publicada chega normalmente (a cópia antiga é apagada).

**Você vai precisar:** abrir o app uma vez com internet depois da publicação.

**Como testar:**
- [ ] Abrir o app com internet uma vez. Depois, ativar o modo avião, fechar o app de vez e abrir de novo: a tela
      aparece com os dados.
- [ ] Ainda em modo avião, registrar uma fralda: aparece "Pendente (1)".
- [ ] Desligar o modo avião: em até 30 segundos vira "Sincronizado" e o registro aparece no outro celular.
- [ ] Na fase seguinte que eu publicar, o app se atualiza sozinho como hoje.

---

## Fase 10 — Alertas no celular pelo Google Agenda

**Por quê:** por não ser de loja, o app não consegue tocar alarme sozinho de forma confiável (principalmente no iPhone).
O Google Agenda consegue.

**O que muda:**
- Ao salvar um plano de horários (amoxicilina ou um remédio cadastrado com "Horários fixos"), a planilha cria um
  lembrete para cada horário futuro numa agenda própria, **Rotina do bebê**, com aviso na hora: "💊 Nome · dose".
- Mudou o plano: só os horários que mudaram são trocados. Encerrou o plano, encerrou ou excluiu o remédio: os
  lembretes futuros somem. Renomeou o remédio ou mudou a dose: o título dos lembretes acompanha. Os que já passaram
  ficam na agenda.
- Em **Ajustes → Este celular** aparece "Google Agenda: N lembretes · próximo …" (ou um aviso, se a agenda não pôde
  ser atualizada). Se a agenda falhar, o plano é salvo do mesmo jeito.
- Remédios "a cada X horas", "1 vez por dia" e "só se precisar" não geram lembrete (não têm horários marcados).

**Você vai precisar** (passo a passo no `SETUP.md`, seção "Lembretes no Google Agenda"):
- no computador, colar o `Code.gs` novo, rodar **sincronizarAgenda** uma vez para autorizar o acesso à Agenda e só
  **depois** republicar o Web App (Implantar → Gerenciar implantações → editar → Nova versão);
- compartilhar a agenda "Rotina do bebê" com sua esposa e, no celular dela, ligar a notificação padrão dessa agenda
  (o aviso é de cada pessoa; no seu já vem ligado).

**Como testar:**
- [ ] Em Ajustes → Este celular, depois de "Sincronizar agora": "Web App: versão 5" e a linha do Google Agenda.
- [ ] Cadastrar "Teste 1" com **Horários fixos** e salvar um plano com um horário daqui a 10 minutos: o evento aparece
      na agenda e os dois celulares avisam na hora.
- [ ] Mudar o horário no plano: o evento muda na agenda.
- [ ] Encerrar o plano: o evento some. (Limpeza: excluir o "Teste 1".)
- [ ] Registros e planos antigos continuam iguais.

---

## Fase 11 — Esconder e reordenar botões

**O que muda:** em Ajustes, um bloco novo **Tela inicial** com dois grupos, **Botões grandes** (Alimentação, Sono,
Fralda, Banho) e **Remédios e saúde** (a faixa de baixo). Cada item tem **Mostrar** e setas para subir e descer;
**Salvar** grava e **Voltar ao padrão** desfaz tudo.
- Vale para os dois celulares e entra no Histórico de ajustes (com Voltar).
- O que fica escondido continua no Histórico, no filtro e nos totais do dia. O card PRÓXIMO continua mostrando os
  horários de tudo (para nenhuma dose de remédio sumir por engano).
- Remédio cadastrado depois entra no fim da faixa; dá para mudar o lugar dele. Tratamento concluído continua saindo
  sozinho da tela (a fase 5), mesmo que esteja marcado para mostrar.

**Você vai precisar:** nada.

**Como testar:**
- [ ] Ajustes → Tela inicial: desmarcar Banho e Salvar. O botão some do Início; os banhos continuam no Histórico e
      no filtro.
- [ ] Subir Sono para o primeiro lugar e Salvar: no outro celular, depois de sincronizar, Sono também vem primeiro.
- [ ] O Histórico de ajustes mostra "Botões da tela inicial" com o antes e o depois; **Voltar** desfaz.
- [ ] **Voltar ao padrão**: tudo volta como era.

---

## Fase 12 — Relatório para a consulta

**O que muda:** no topo do **Histórico**, **Relatório para a consulta** abre uma tela com:
- **Período:** Hoje, 3 dias (padrão), 7 dias ou 14 dias (dias inteiros até agora).
- **Dia a dia:** uma tabela com uma linha por dia e uma coluna para cada coisa registrada no período (leite em mL e
  mamadeiras, refeições, sono, fraldas, banho, remédios, febre, vacinas), com os mesmos totais do Histórico. No
  celular, a tabela rola para o lado.
- **Temperatura:** máxima, quantas medições e quantas a partir do limite de febre; um gráfico com a linha do limite e
  as doses de Tylenol marcadas embaixo; e a lista com todas as medições.
- **Remédios e vacinas:** cada um com as doses do período, por dia, com hora e dose.
- **Salvar em PDF:** abre a impressão do celular, onde dá para escolher "Salvar como PDF". O PDF sai sempre claro e
  sem os botões, com o nome do bebê e o período. Os dias aparecem como "sex 20/11" (sem "hoje/ontem"), porque o PDF
  pode ser lido em outro dia.
- As anotações livres entram aqui, numa seção própria (fase 17).

**Ajuste pedido em 22/11 (feito):** **Enviar imagem.** Um botão ao lado de "Salvar em PDF" gera a imagem do
relatório (do período escolhido, sempre clara) e abre o compartilhar do celular, para mandar direto no WhatsApp. Sem
servidor e sem mexer na planilha. Como o WhatsApp reduz imagens compridas até ficarem ilegíveis, um relatório longo
vira **2 ou 3 imagens** (marcadas "1 de 3", "2 de 3"…), cada uma com o nome e o período; uma tabela que continua
repete os nomes das colunas. No computador, as imagens são baixadas. É a imagem para o médico ou para quem cuida
junto; a imagem para o grupo da família é outra, sem dados de saúde (fase 13).

**Você vai precisar:** nada.

**Como testar:**
- [ ] Relatório → 7 dias → **Enviar imagem** → WhatsApp: as imagens chegam legíveis sem zoom, com o nome, o período e
      as seções. (Se o celular disser "Imagem pronta, toque de novo", é só tocar de novo.)
- [ ] Histórico → **Relatório para a consulta** → 3 dias: conferir os totais de um dia com o Histórico.
- [ ] Trocar para 7 e 14 dias: a tabela cresce e o gráfico começa no dia da primeira medição de temperatura.
- [ ] **Salvar em PDF** no celular, escolher "Salvar como PDF" e abrir o arquivo. (No iPhone, se o app instalado não
      abrir a impressão, me avise: aí faço pelo Safari.)
- [ ] No tema escuro, a tela continua legível e o PDF sai claro.

---

## Fase 13 — Família participando (placar e ranking) · prioridade alta

**Por quê:** compartilhar só os números da rotina não diz muito para a família. Mostrar quem ajudou gera
engajamento: avós, tios e quem mais cuida passam a registrar também, e o relatório ganha sentido para o grupo.

**O que muda:**
- **Quem é quem, pelo apelido:** "Pai" e "Mãe" são os pais; qualquer outro apelido (ex. "Vó Ana", "Tia Bia") é da
  família. Para alguém da família participar, ele abre o link de acesso e escolhe o próprio apelido. Não há nada novo
  para configurar.
- **Pontos só da rotina:** cada registro de alimentação, sono, fralda e banho vale ponto. Remédio, febre e vacina
  **não** contam (para nunca incentivar uma dose a mais nem registro repetido).
- **Placar do período** (mesmos períodos do Relatório): quanto da rotina foi registrado pela Mãe, pelo Pai e pela
  família (em %). O **ranking** é só da família, sem Pai e Mãe.
- **Imagem para o grupo da família:** o placar, o ranking e números leves (mamadeiras, fraldas, sonos), **sem
  temperatura nem remédios**, pronta para mandar no WhatsApp pelo compartilhar do celular.
- Vale também para os registros antigos: a coluna "quem" já existe em todos.

**Decidido no quiz (22/11):**
- **Tela própria:** no topo do Histórico, abaixo do Relatório, o cartão **Família participando** abre o placar
  (Hoje, 3, 7 ou 14 dias; começa em 7) com o botão **Enviar para a família**.
- **Corrigido:** o ponto fica com quem registrou primeiro (ex.: a Vó registra o sono e o Pai marca o fim: ponto da Vó).
  Desfeito ou apagado não conta.
- **Visual da imagem:** barra Mãe/Pai/Família em %, pódio com medalhas para os 3 primeiros da família (empate divide
  a posição), o resto em lista, números leves e "Valeu, família!".
- **Pai e Mãe com variações:** Pai, Papai, Mãe, Mae, Mamãe, Mamae, sem diferença de maiúscula ou acento. Registro sem
  apelido fica fora do placar.

**Você vai precisar:** mandar o link de acesso para quem da família for participar (Ajustes → Compartilhar link de
acesso). Atenção: o link dá acesso a tudo, inclusive aos remédios; envie só para quem cuida do bebê.

**Como testar:**
- [ ] No período de 7 dias, as porcentagens de Mãe, Pai e família somam 100% e batem com o Histórico.
- [ ] Um parente com apelido próprio registra uma fralda: aparece no ranking da família; Pai e Mãe nunca aparecem lá.
- [ ] Registrar um remédio não muda nenhum ponto.
- [ ] Histórico → **Família participando** → **Enviar para a família** → WhatsApp: a imagem chega legível e não
      mostra temperatura nem remédios.

---

## Fase 14 — Peso e altura · prioridade alta

**O que muda:** um tipo **Medidas** (peso, altura, perímetro da cabeça, todos opcionais), com a evolução num gráfico, e as medidas do período entram no Relatório.
Sem comparar com curvas de crescimento: isso fica com o pediatra.

**Decidido no quiz (22/11):**
- **Peso em kg** (ex. 7,35; aceita até 3 casas). Se vier em gramas por engano (ex. 7350), o app avisa antes de gravar.
- **Gráficos no Histórico:** filtrando por Medidas, aparece "Evolução" no topo, com um gráfico para peso, altura e
  cabeça. A tela inicial só tem a linha de Medidas na faixa de baixo (peso, altura e a diferença de peso).
- **Diferença desde a medida anterior** com o mesmo valor preenchido (ex. "+250 g em 12 dias"), no Histórico, na
  tela inicial e no Relatório.
- **Relatório:** seção **Medidas** com as do período e, antes delas, a última anterior ao período, marcada "(antes do
  período)". Sai também na imagem e no PDF. (Medidas não entram na tabela "Dia a dia", porque têm a seção própria.)

**Você vai precisar:** nada.

**Como testar:**
- [ ] Registrar duas medidas em dias diferentes (pode usar "Outro dia"): o gráfico mostra as duas.
- [ ] Registrar só o peso: altura fica em branco sem erro.
- [ ] Histórico → filtro **Medidas**: aparecem os gráficos e, em cada registro, a diferença desde a anterior.
- [ ] Relatório de 7 dias com uma medida no período: a seção Medidas mostra também a anterior.

---

## Fase 15 — Aviso de vacina · prioridade alta

**O que muda:** ao registrar uma vacina, dá para anotar a **data da próxima dose** (como está na caderneta). Perto da
data, ela aparece no botão de Vacinas e no card PRÓXIMO. O app não calcula o calendário sozinho, para não arriscar
orientação errada.

**Decidido no quiz (22/11):**
- **15 dias antes**, o botão de Vacinas mostra a próxima dose (ex. "Pentavalente · 3ª dose em 5 dias").
- **No dia**, ela entra em destaque no topo das linhas de baixo do card PRÓXIMO ("Hoje · Vacina hoje · …"); o card
  continua mostrando a rotina.
- **Atrasada:** se a data passar sem registrar, o botão fica em destaque ("atrasada · desde 28/11") por até 60 dias.
- **Some sozinha** quando a vacina com o mesmo nome é registrada (sem diferença de acento ou maiúscula). Ao tocar em
  Vacinas com uma próxima dose perto, o nome e a dose seguinte já vêm preenchidos, para os nomes baterem.
- **Também no Google Agenda:** lembrete de dia inteiro na agenda "Rotina do bebê" ("💉 Pentavalente · 3ª dose"), com
  aviso na véspera às 9h. Corrigiu ou apagou a data, ou registrou a vacina: o lembrete muda ou some.

**Você vai precisar** (passo a passo no `SETUP.md`, "Histórico de mudanças no Code.gs", fase 15):
- no computador, colar o `Code.gs` novo, rodar **sincronizarAgenda** uma vez e republicar o Web App
  (Implantar → Gerenciar implantações → lápis → Nova versão). Não pede autorização nova.
- no celular da sua esposa, ligar o aviso dos eventos de dia inteiro da agenda "Rotina do bebê" (o do seu já vem
  ligado em cada lembrete).

**Como testar:**
- [ ] Em Ajustes → Este celular, depois de "Sincronizar agora": "Web App: versão 6".
- [ ] Registrar uma vacina com próxima dose daqui a 2 dias: aparece no botão e, no dia, no card PRÓXIMO.
- [ ] O lembrete de dia inteiro aparece no Google Agenda, na data anotada.
- [ ] Registrar a vacina seguinte (o nome já vem preenchido): o aviso some do botão e o lembrete some da agenda.
- [ ] Vacinas antigas continuam iguais.

---

## Fase 16 — Consultas e retornos · prioridade média

**O que muda:** um tipo **Consulta** com data, hora, local e motivo (ex. retorno com o pediatra). Consultas futuras
aparecem nas linhas "Depois" do card PRÓXIMO quando estiverem perto, e no card PRÓXIMO no dia.

**Decidido no quiz (22/11):**
- Botão **Consultas** na faixa de baixo (depois de Vacinas). Toque → **Marcar consulta**: Hoje, Amanhã ou Outro dia
  (qualquer data à frente), hora, motivo, local e **Anotações** (texto livre).
- **7 dias antes**, a consulta entra nas linhas de baixo do card PRÓXIMO; **no dia**, em destaque. O card continua
  com a rotina.
- **Google Agenda:** evento de 1 hora na hora da consulta ("🩺 Retorno com o pediatra · Clínica"), com aviso na
  véspera e 2 horas antes no seu celular. Mudou ou apagou: o lembrete muda ou some.
- **Depois da consulta:** por 3 dias, o botão diz "Anote o que o médico disse" e, ao tocar, abre essa consulta para
  anotar. Salvar sem anotar também vale: o app para de pedir.
- As marcadas ficam no Histórico → filtro Consultas, no cartão **Marcadas**; depois da hora, vão para a lista.

**Você vai precisar** (passo a passo no `SETUP.md`, "Histórico de mudanças no Code.gs", fase 16): colar o
`Code.gs` novo, rodar **sincronizarAgenda** uma vez e republicar o Web App. Não pede autorização nova.

**Como testar:**
- [ ] Em Ajustes → Este celular, depois de "Sincronizar agora": "Web App: versão 7".
- [ ] Marcar uma consulta para amanhã: aparece em "Depois" no card PRÓXIMO e no Google Agenda.
- [ ] Mudar a hora da consulta: o lembrete muda na agenda.
- [ ] Depois da hora, ela vai para o Histórico e o botão pede a anotação; anotar faz o pedido sumir.

---

## Fase 17 — Anotações livres · prioridade baixa

**O que muda:** um tipo **Anotação** para sintomas e acontecimentos ("vomitou após mamar", "manchinha no braço",
"primeira vez que comeu pera"), com texto livre. Aparece no Histórico, com filtro, e entra no relatório da fase 12.

**Decidido no quiz (22/11):**
- Botão **Anotações** na faixa de baixo (o último). **Nova anotação**: texto livre e um tipo opcional, **Sintoma**,
  **Marco** ou **Outro** (sem escolher, fica Outro). Sintomas aparecem em destaque no Histórico.
- **Relatório:** seção **Anotações** com todas as do período, por dia e hora, com o tipo (também no PDF e na imagem).
- **Família:** a tela e a imagem do grupo ganham **Marcos** (só os marcos do período; sintomas e outras nunca
  entram). Anotação não dá ponto no placar.

**Você vai precisar:** nada (não mexe no Code.gs).

**Como testar:**
- [ ] Registrar uma anotação de ontem às 22h: aparece no lugar certo do Histórico.
- [ ] O filtro "Anotações" mostra só as anotações.
- [ ] Uma anotação de Sintoma e uma de Marco no período: as duas no Relatório; só o marco na imagem da família.

---

## Fase 18 — Relatório para a pediatra: resumo primeiro, 30 e 60 dias · prioridade alta

**Por quê:** na consulta, a pediatra quer em 1 minuto "o que aconteceu desde a última vez", e não a tabela de cada
dia. O relatório de hoje é bom para conferir, mas ruim para apresentar.

**O que muda (proposta):**
- **Períodos:** "Desde a última consulta" (padrão, usando a última consulta registrada), 7, 30 e 60 dias.
- **Topo, "Em resumo"**, como se a gente falasse na consulta, com a comparação com o período anterior (↑ ↓):
  - **Identificação:** nome, **idade** (ex. "5 meses e 12 dias"; precisa da data de nascimento em Ajustes → Bebê).
  - **Crescimento:** peso, altura e cabeça atuais e quanto mudou desde a medida anterior (ex. "+700 g em 27 dias,
    ~26 g por dia"). Sem curvas de crescimento.
  - **Alimentação:** leite por dia (média e faixa), mamadeiras por dia, refeições e frutas por dia, e o que começou no
    período (ex. "refeição desde 23/10").
  - **Sono:** total por dia, noite (hora de dormir e de acordar, quantas vezes acordou de madrugada) e cochilos.
  - **Fraldas:** trocas por dia, cocôs por dia e o **maior intervalo sem cocô** (sinal de intestino preso).
  - **Intercorrências:** episódios de febre (datas, máxima, quanto durou), remédios usados (quantas doses de cada) e
    sintomas anotados.
  - **Vacinas:** as do período e a próxima dose anotada. **Marcos** do período.
  - **Dúvidas para a consulta:** um tipo novo de anotação, **Pergunta**, que vai para o topo do relatório.
- **Gráficos por semana** (para 30 e 60 dias): leite por dia, sono por dia, fraldas e cocôs, peso. Uma linha por
  gráfico, pequenos e lado a lado.
- **Detalhes no fim, recolhidos:** a tabela de hoje (dia a dia até 14 dias; semana a semana em 30 e 60 dias), as
  medições de temperatura e as doses.
- A imagem para o WhatsApp e o PDF começam pelo resumo (a primeira imagem é o resumo inteiro).

**Decidido no quiz (22/11):**
- Abre em **"Desde a consulta"** (a última consulta antes de hoje; sem consulta registrada, 30 dias). Também 7, 30 e
  60 dias.
- O "Em resumo" tem os quatro grupos: crescimento e alimentação; sono e fraldas; intercorrências e vacinas; dúvidas
  e marcos.
- **Comparação:** seta só quando mudou 10% ou mais (ex. "900 mL por dia ↑ antes 780 mL"). Ela também só aparece se o
  período anterior tem registros em pelo menos 70% dos dias (com poucos registros, a comparação enganaria).
- **PDF com tudo; imagem só com resumo e gráficos** (2 gráficos por linha, normalmente 2 ou 3 imagens).

**Como ficou (além do quiz):**
- **Ajustes → Bebê → Data de nascimento**: a idade aparece no topo do relatório e no Ajustes ("5 meses e 12 dias").
- **Anotações** ganharam o tipo **Pergunta**: as do período vão para "Dúvidas para a consulta", no topo.
- Gráficos de leite, sono e cocôs começam do zero, para uma variação pequena não parecer grande; o de peso não.
- Em "Detalhes", a tabela dia a dia mostra no máximo os últimos 14 dias (em 30 e 60 dias, a visão por semana são os
  gráficos). No PDF, os detalhes começam numa página nova.
- O placar da família ganhou períodos próprios: Hoje, 7 dias e 30 dias ("Rotina do mês").
- **Ajuste depois do teste (22/11):** remédio de todo dia (ex. vitamina) vira uma linha nos Detalhes ("1 vez por dia
  de 31/10 a 22/11 · 22 doses · entre 06:50 e 09:30"), com os dias fora do padrão (sem dose ou com dose a mais) e a
  lista completa recolhida em "Ver dose por dose". Dia da semana e data alinhados nas listas.

**Você vai precisar:** preencher a data de nascimento em Ajustes → Bebê.

**Como testar:**
- [ ] Ajustes → Bebê → preencher a data de nascimento: a idade aparece no topo do relatório.
- [ ] Relatório → "Desde a consulta": o período começa no dia da última consulta registrada.
- [ ] O resumo cabe numa tela do celular e bate com o Histórico (conferir leite e fraldas de 2 dias).
- [ ] 60 dias: os gráficos são por semana e a tabela de detalhes fica recolhida.
- [ ] Uma anotação do tipo Pergunta aparece no topo do relatório.

---

## Fase 19 — Aba Resumo (Histórico só com a lista) · prioridade alta

**Por quê:** hoje o Histórico abre com três cartões (Relatório, Família, Ritmo) antes da lista; quem quer ver "o que
foi registrado" precisa rolar, e quem quer ver "como está indo" não acha os gráficos de Medidas sem filtrar.

**O que muda (proposta):**
- Barra de baixo com **4 abas: Início · Histórico · Resumo · Ajustes**.
- **Resumo:** Ritmo dele (o cartão de hoje), Relatório para a consulta, Família participando e a evolução das
  Medidas, nessa ordem, cada um como um cartão que abre a tela dele.
- **Histórico:** só os filtros e a lista, que passa a começar no topo.

**Como ficou:** o cartão de Medidas se chama **Crescimento** (mostra o último peso e altura) e abre o Histórico
filtrado por Medidas, que já tem os gráficos de evolução. Relatório e Família voltam para o Resumo ("‹ Resumo").

**Você vai precisar:** nada.

**Como testar:**
- [ ] Histórico abre direto na lista de hoje.
- [ ] Resumo → cada cartão abre a tela certa e o "‹ Resumo" volta para o Resumo.

---

## Fase 20 — Tela inicial: o que importa agora em primeiro lugar · prioridade média

**O que muda (proposta):**
- **Estado atual no card PRÓXIMO:** com o bebê dormindo, o card mostra "Dormindo há 35 min" com o botão **Acordou**
  (a previsão do leite vai para as linhas de baixo).
- **Faixa ordenada por urgência:** o que tem aviso (vacina perto, consulta hoje, remédio na hora, febre recente) sobe
  para o topo; Febre e Tylenol sem uso nos últimos 3 dias ficam juntos numa linha compacta ("Febre e remédio só se
  precisar"), que abre os dois.
- **Textos que cabem:** a faixa mostra uma informação por linha, sem cortar no meio; o botão de Alimentação deixa de
  repetir o "próximo leite" (já está no card) e mostra o total do dia (ex. "830 mL hoje").
- **Card PRÓXIMO mais curto:** "costuma ser a cada ~3h 40min nesse horário" vira "a cada ~3h40".

**Como ficou:**
- O card mostra **"Agora · Dormindo há 35 min · desde 20:45"** e o botão **Acordou**; a previsão do leite fica na
  linha de baixo. Se houver um atraso (ex. remédio de horário fixo), o atraso continua no card. Sono esquecido aberto
  há mais de 14h não toma o card (fica o aviso no botão Sono).
- Faixa: alerta primeiro, depois aviso, depois o resto, mantendo a ordem de Ajustes → Tela inicial entre iguais.
  Lembrete de configuração (ex. "Defina o máximo em 24h") não conta como urgência.
- **"Se precisar"**: Febre, Tylenol e remédios "só se precisar" sem registro nos últimos 3 dias viram botões numa
  linha só. Com uso recente ou com algo a avisar, voltam a ter linha própria.
- Botão de Alimentação: "Hoje: 750 mL · 5 mamadeiras" no lugar do "Próximo leite". Sono: "~1h30 acordado de manhã".

**Você vai precisar:** nada.

**Como testar:**
- [ ] Com um sono em andamento, o card mostra "Dormindo" e o botão Acordou marca o despertar.
- [ ] Com uma vacina em 5 dias e sem febre na semana, Vacinas fica no topo da faixa e Febre/Tylenol numa linha só.

---

## Fase 21 — Gamificação: conquistas, meta da semana e marcos · prioridade média

**Por quê:** o placar da fase 13 mostra quem ajudou; dá para ir além sem nunca premiar remédio, febre ou registro
repetido, e de um jeito que também melhora os dados do relatório.

**Ideias (decidido em 22/11: as quatro entram):**
- **Conquistas de quem cuida** (medalhas no placar e na imagem do grupo): "Plantão da madrugada" (registro entre 0h e
  5h), "Mestre das fraldas" (50 trocas), "Primeiro banho dado", "Semana inteira" (registrou em 7 dias seguidos),
  "Estreia" (primeiro registro de um parente). Só rotina conta, como no placar.
- **Meta da semana da família:** uma barra "dias com a rotina completa" (ex. 5+ mamadas, sono da noite com hora de
  acordar e fraldas registradas). Ao completar 7/7: "Semana completa!". Premia registro completo, que é o que deixa
  previsões e relatório melhores.
- **Aniversários e marcos do bebê:** "Hoje faz 6 meses!" no topo da tela inicial (precisa da data de nascimento) e
  uma **linha do tempo dos marcos** (primeira papinha, rolou sozinho…) que vira imagem para o grupo.
- **Retrospectiva do mês:** no dia 1, uma imagem para a família com os destaques do mês (noite mais longa, recorde de
  leite, marcos, quem mais ajudou).

**Regras que não mudam:** remédio, febre e vacina nunca dão ponto nem medalha; nada de notificação cobrando; quem
não quiser pode esconder (Ajustes → Tela inicial).

**Você vai precisar:** nada (a data de nascimento vem da fase 18).

---

## Notas técnicas (para quem for implementar)

- Fase 1: guardar o id do último registro feito no aparelho e usar `store.apagarEvento(id)`; no despertar do sono,
  desfazer = `editarEvento` de volta para os dados anteriores.
- Fase 2 (feita): `js/tipos/remedio.js`; definições em `config.remedios` (JSON), tipo `remedio_<id>`, plano na aba
  `planos` com o mesmo tipo.
- Fase 3 (feita): tipo interno `ajuste` em `js/tipos/ajuste.js` (sem botão, fora do Histórico e do Resumo);
  `dados` = { chave, antes, depois }. Sem mudança no `store.js` nem no `Code.gs`.
- Fase 4: muda o `Code.gs` (retrocompatível): ação nova `lote` no `doPost` (vários itens num pedido, mesma regra de
  `adicionarSemRepetir_`) e parâmetro opcional `desde` no `doGet` (só linhas com `criado_em` depois dele; sem ele,
  devolve tudo como hoje). `garantirAbas_` não precisa rodar em todo GET. No `store.js`, só funções internas mudam
  (a API pública fica igual); o cache local junta o incremental e uma carga completa periódica corrige qualquer
  diferença. Atualizar o `SETUP.md`. (Absorve a antiga fase "App leve depois de muitos meses".)
- Fase 5: modo novo `diario` em `js/tipos/remedio.js` (com `horaRef` opcional). Tratamento concluído = plano com
  todas as doses registradas → fora de `visiveis` em `montarTipos`. Layout da tela inicial no `app.js`/`app.css`
  (rotina em grade grande, remédios em faixa compacta).
- Fase 6: só `app.js`/`app.css` (telas); tudo continua passando por `registrarAjuste`. Blocos de Ajustes são
  `<details>` com o estado aberto guardado em memória (o redesenho não fecha o que está aberto).
- Fase 7 (feita): `dados.itens` (leite | fruta | refeicao) e `dados.ml` na alimentação; `SCHEMA_VERSION` 2, com
  `migrar` que deduz itens/mL do texto dos registros versão 1 (só leitura). Campos genéricos novos na folha:
  `multiplas`, `casas`, `mostrarSe(dados)` e `atalhos(ctx, dados)`.
- Fase 8 (feita): `ritmoSono`/`preverSono` e `ritmoLeite`/`preverLeite` em `regras.js` (medianas por faixa do dia,
  últimos 14 dias inteiros, com testes); `ritmoDoSono(ctx)` e `ritmoDoLeite(ctx)` nos tipos (cache por contexto).
  Itens com `previsao: true` nunca têm `alerta`.
- Fase 9 (feita): `sw.js` (modelo; `scripts/montar-site.sh` preenche a versão e a lista de `v/<sha>/`). Página: internet
  primeiro com prazo de 4 s; `v/<sha>/`: cópia; `versao.json` e a planilha nunca passam pela cópia. Só registra fora do
  modo "dev". Testar com `node tests/servidor.mjs _site 8090` (configuração "site-montado" no `.claude/launch.json`).
- Fase 10 (feita): `Code.gs` versão 5 (retrocompatível). Depois de gravar (pedido simples ou lote),
  `atualizarAgenda_` refaz os lembretes dos tipos cujo plano entrou (`adicionado`; reenvio da fila não mexe) ou de
  todos, se mudou `config.remedios`/`amoxicilina_dose_ml`. Eventos do app têm as tags `rb_tipo`/`rb_horario`; só
  eventos futuros são tocados; a agenda fica em `AGENDA_ID` e o resultado em `AGENDA_STATUS` (propriedades do
  script), que a leitura devolve em `agenda` e o Ajustes mostra. Falha na agenda nunca impede a gravação.
  Editor: `sincronizarAgenda()` (autoriza e refaz tudo).
- Fase 11 (feita): `config.inicio_botoes` = JSON { ordem, ocultos } ('' = padrão); `lerBotoesInicio`,
  `aplicarBotoesInicio` e `textoBotoesInicio` em `regras.js` (com testes). No `app.js`, `botoesPadrao()` dá a ordem
  padrão (grandes e faixa) e a escolha é aplicada por cima. Sem mudança no `store.js` nem no `Code.gs`.
- Fase 20 (feita): `regras.emCurso?(ctx)` no contrato de tipo (o sono usa) e `cardEmCurso` no `app.js`;
  `organizarFaixa` (puro, com testes) em `regras.js` ordena a faixa e separa os "quietos" (`linhaSePrecisar`);
  `status.config` marca aviso que é só de configuração; `fmtDuracaoCurta`.
- Fase 19 (feita): vista `resumo` no `app.js` (`vistaResumo`); a barra tem 4 abas; `relatorio` e `familia` contam como
  aba Resumo. O Histórico perdeu os cartões (Relatório, Família, Ritmo).
- Fase 18 (feita): `js/resumo.js` (puro, com testes): `resumoPeriodo(ctx, tipos, inicio, fim)` (médias só com dias
  inteiros, `cobertura`), `blocosResumo(r, anterior)` (as linhas do "Em resumo", as mesmas na tela e na imagem),
  `seriesRelatorio` (por dia até 14 dias, por semana depois) e `comparar`. `montarRelatorio` devolve também
  `resumo`, `anterior`, `series` e `diasTabela`; `resolverPeriodo(ctx, 'consulta' | dias)`. Config nova
  `nascimento` (AAAA-MM-DD) e `idadeTexto` em `regras.js`. `graficoEvolucao` ganhou `desdeZero`. Sem mudança no
  Code.gs (a config aceita chaves novas).
- Fase 17 (feita): `js/tipos/anotacao.js` (dados: texto, categoria). `anotacoesEntre(ctx, inicio, fim, so?)` é usada
  pelo `montarRelatorio` (`anotacoes`, seção própria, fora do "Dia a dia") e pelo `montarPlacar` (`marcos`).
  Sem mudança no Code.gs.
- Fase 16 (feita): `js/tipos/consulta.js`. O contrato de tipo ganhou `agendavel` (formulário com Amanhã e datas
  futuras, sem o aviso de horário no futuro; no Histórico só depois da hora, antes disso no cartão "Marcadas"),
  `tituloNovo`, o campo `textolongo` e, em `proximos`, `alemDe24h` (o `montarAgenda` aceita além das 24h).
  Code.gs versão 7: `sincronizarConsultas_` com `eventosAtuais_(tipo)` (a resolução de `substitui_id`, agora
  para qualquer tipo); tag `rb_horario` = `ms|título`.
- Fase 15 (feita): campo novo `proxima` (AAAA-MM-DD) na vacina, com o tipo de campo genérico `data` no `app.js`
  (sem mudar `SCHEMA_VERSION`: campo opcional novo, as antigas continuam iguais). `pendentes`/`avisosVacina` em
  `js/tipos/vacina.js`; itens de `proximos` ganharam `destaque` e `diaInteiro`. Code.gs versão 6:
  `sincronizarVacinas_`/`vacinasPendentes_`/`vacinasAtuais_` (mesma regra do app, com a resolução de
  `substitui_id` copiada do `resolverEventos`), disparado por `adicionar_evento` de vacina e pelo
  `sincronizarAgenda`. Eventos com a tag `rb_tipo` = `vacina` e `rb_horario` = `data|nome`.
- Fase 14 (feita): `js/tipos/medidas.js` (dados: peso em kg, altura e cabeca em cm, observacao; sem mudar
  `SCHEMA_VERSION`, é tipo novo). `diferencas`/`textoDiferencas` comparam com a medida anterior que tem o mesmo
  valor. O contrato de tipo ganhou `evolucao?(ctx)`: séries que o `app.js` desenha no topo do Histórico filtrado com
  `graficoEvolucao` (`js/grafico.js`). `montarRelatorio` devolve `medidas` (período + a anterior, `antes: true`).
- Fase 13 (feita): `js/familia.js`: `papel(apelido)`, `porcentagens` (somam 100) e
  `montarPlacar(ctx, tipos, nDias)` (puros, com testes); só tipos com `rotina: true` contam. O `resolverEventos`
  ganhou `autor` (o `quem` da versão mais antiga da cadeia), e o ponto é do autor. `htmlPlacar` (tela) e
  `js/imagem-familia.js` (canvas). As funções de desenho comuns às duas imagens ficam em `js/desenho.js`; o
  compartilhar das duas é `compartilharImagens` no `app.js`.
- Fase 12 (feita): `js/relatorio.js`: `montarRelatorio(ctx, tipos, nDias)` (puro, com testes) usa o `resumoDia` e o
  `resumo` de cada tipo, então tipos novos entram sozinhos na tabela; `htmlRelatorio` e `graficoTemperatura` (SVG).
  Vista `relatorio` no `app.js` (aberta pelo Histórico); PDF = `window.print()` com `@media print` no `app.css`.
  Imagem: `js/imagem-relatorio.js` desenha em canvas (tema claro fixo) a partir do mesmo `montarRelatorio`; o gráfico
  é o SVG de `graficoTemperatura` virado imagem. `paginar` (puro, com teste) quebra em imagens de até 1600 px de altura.
  `compartilharRelatorio` no `app.js`: `navigator.share({ files })`; sem suporte, baixa; se o celular recusar por
  demora (NotAllowedError), guarda as imagens e o próximo toque compartilha na hora.

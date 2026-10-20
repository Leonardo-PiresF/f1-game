# Revisão dos overalls 2026 (F1 v3 e F2 v2)

Base: 17 corridas de F1 disputadas (até Singapura) e 25 corridas de F2 (12 etapas, até Baku). Revisão manual feita sobre a saída de `npm run overall -- 2026`.

## Critério usado

- **Piloto = 80% temporada inteira + 20% forma recente, com o carro descontado.** Talento não muda em dois meses; o que muda no curto prazo é o carro, e ele já está na nota da equipe. Começo ruim por adaptação ao regulamento conta contra o piloto.
- **Equipe = 70% forma recente (últimas 5 ou 6 etapas) + 30% temporada.**
- **Abandonos mecânicos não contam contra o piloto.** Só batidas e erros próprios pesam.
- **Escala de pilotos de 74 a 92.** Se o jogo precisar de mais contraste, estique a escala linearmente sem mudar a ordem.
- **Traços de personalidade ficam fora do overall.** Eles agem como eventos durante a corrida (ver seção própria), para o overall continuar sendo o nível "normal" do piloto.

### Fórmula do overall do piloto

| Atributo | Peso | O que mede |
| --- | --- | --- |
| Quali/volta rápida | 14% | Velocidade de uma volta, aproveitamento do Q3 |
| Ritmo de corrida | 20% | Velocidade sustentada em stint longo |
| Consistência | 16% | Repetir o nível sem erro, corrida após corrida |
| Largada | 6% | Reação, tração e primeira volta |
| Ultrapassagem | 9% | Completar manobras de ataque |
| Defesa | 7% | Segurar posição sem perder tempo |
| Roda a roda | 6% | Disputa lado a lado, espaço, curvas em dupla |
| Gestão de pneu | 9% | Estender stints, degradação, janela de pit |
| Chuva | 3% | Bônus/ônus que vale só em pista molhada (peso baixo no overall porque é raro) |
| Feedback/acerto | 4% | Acerto do carro; no jogo, pode acelerar o desenvolvimento da equipe |
| Inteligência de pista | 6% | Leitura de corrida, VSC/SC, gestão de energia, decisões no rádio |

Overall = soma (atributo × peso), arredondado.

### Fórmula do overall da equipe

Overall = 30% Motor + 30% Aero + 25% Chassi + 10% Estratégia + 5% Pit stop. Confiabilidade, Gestão de pilotos e Desenvolvimento ficam fora do overall e atuam como sistemas próprios no jogo.

## O que mudou da v2 para a v3

- **Antonelli 92, Leclerc 87, Russell 86, consistência de Hamilton 89** (seus ajustes). Hamilton continua 90 porque compensa em ritmo de corrida, pneu, chuva e inteligência de pista; a queda na consistência vem das últimas voltas de Q3 que não encaixaram (Quali 87).
- **Sete atributos novos:** largada, chuva, gestão de pneu, feedback/acerto, quali/volta rápida, inteligência de pista e roda a roda. "Ritmo" agora é só ritmo de corrida.
- **Tabela de dados de base corrigida:** as colunas analisadas no script original (força do carro, duelos, abandonos, posições ganhas), agora com abandono só por culpa própria e o erro identificado.
- **Traços de personalidade** com regras de efeito.
- **Equipes:** aero da Mercedes para 91 (carro equilibrado, pole em Mônaco) e dois atributos novos: Gestão de pilotos e Desenvolvimento.

## Pilotos de F1

| Piloto | Equipe | Overall | Quali/volta rápida | Ritmo de corrida | Consist. | Largada | Ultrap. | Defesa | Roda a roda | Gestão de pneu | Chuva | Feedback/acerto | Intelig. de pista | Overall do script | Variação |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Andrea Kimi Antonelli | Mercedes | **92** | 94 | 95 | 95 | 82 | 93 | 88 | 89 | 91 | 86 | 86 | 90 | 90 | +2 |
| Lewis Hamilton | Ferrari | **90** | 87 | 92 | 89 | 90 | 91 | 88 | 91 | 93 | 95 | 92 | 92 | 83 | +7 |
| Max Verstappen | Red Bull | **90** | 94 | 91 | 84 | 88 | 93 | 92 | 86 | 91 | 96 | 92 | 93 | 89 | +1 |
| Lando Norris | McLaren | **88** | 93 | 90 | 85 | 83 | 87 | 84 | 85 | 88 | 87 | 88 | 86 | 84 | +4 |
| Charles Leclerc | Ferrari | **87** | 95 | 90 | 80 | 87 | 87 | 89 | 87 | 86 | 84 | 87 | 85 | 83 | +4 |
| George Russell | Mercedes | **86** | 91 | 86 | 83 | 84 | 84 | 89 | 86 | 87 | 86 | 88 | 86 | 80 | +6 |
| Fernando Alonso | Aston Martin | **85** | 81 | 83 | 85 | 88 | 84 | 88 | 90 | 88 | 90 | 88 | 90 | 79 | +6 |
| Oscar Piastri | McLaren | **84** | 88 | 86 | 80 | 85 | 83 | 82 | 84 | 88 | 80 | 85 | 84 | 78 | +6 |
| Carlos Sainz | Williams | **83** | 83 | 83 | 81 | 84 | 82 | 84 | 85 | 85 | 84 | 88 | 86 | 81 | +2 |
| Pierre Gasly | Alpine F1 Team | **83** | 86 | 83 | 81 | 82 | 81 | 83 | 82 | 83 | 85 | 84 | 83 | 82 | +1 |
| Liam Lawson | RB F1 Team | **82** | 80 | 83 | 83 | 83 | 83 | 84 | 84 | 82 | 80 | 78 | 81 | 84 | -2 |
| Isack Hadjar | Red Bull | **82** | 84 | 83 | 79 | 82 | 84 | 81 | 82 | 81 | 80 | 79 | 80 | 73 | +9 |
| Nico Hülkenberg | Audi | **81** | 82 | 80 | 82 | 78 | 79 | 82 | 81 | 82 | 85 | 86 | 85 | 72 | +9 |
| Oliver Bearman | Haas F1 Team | **81** | 83 | 82 | 77 | 81 | 83 | 79 | 81 | 80 | 80 | 78 | 79 | 79 | +2 |
| Alexander Albon | Williams | **80** | 80 | 80 | 78 | 80 | 79 | 82 | 81 | 82 | 80 | 86 | 82 | 63 | +17 |
| Gabriel Bortoleto | Audi | **80** | 82 | 80 | 80 | 80 | 79 | 79 | 80 | 80 | 78 | 80 | 80 | 74 | +6 |
| Sergio Pérez | Cadillac F1 Team | **79** | 74 | 79 | 78 | 80 | 80 | 81 | 80 | 86 | 78 | 82 | 82 | 72 | +7 |
| Esteban Ocon | Haas F1 Team | **79** | 78 | 78 | 78 | 80 | 78 | 82 | 78 | 80 | 82 | 80 | 80 | 68 | +11 |
| Arvid Lindblad | RB F1 Team | **79** | 80 | 79 | 81 | 80 | 78 | 77 | 78 | 78 | 76 | 75 | 78 | 79 | 0 |
| Valtteri Bottas | Cadillac F1 Team | **78** | 80 | 77 | 77 | 74 | 74 | 76 | 76 | 80 | 78 | 85 | 80 | 64 | +14 |
| Yuki Tsunoda | RB F1 Team (reserva) | **77** | 79 | 77 | 75 | 78 | 78 | 76 | 77 | 76 | 77 | 75 | 76 | 69 | +8 |
| Franco Colapinto | Alpine F1 Team | **77** | 76 | 78 | 74 | 79 | 80 | 76 | 78 | 77 | 76 | 74 | 75 | 69 | +8 |
| Lance Stroll | Aston Martin | **74** | 72 | 74 | 71 | 82 | 75 | 74 | 74 | 76 | 84 | 74 | 74 | 57 | +17 |

Leituras rápidas da tabela:

- **Antonelli** tem a combinação mais completa (quali, ritmo e consistência acima de 93); o único ponto fraco é a largada (82: Austrália, Japão).
- **Hamilton** é o melhor em ritmo de corrida fora Antonelli, gestão de pneu e chuva; perde em quali (87) por errar a volta final do Q3.
- **Verstappen** tem os picos mais altos em quali, ultrapassagem, defesa, chuva e inteligência, mas a consistência mais baixa do top 6 (84) pelo começo de adaptação e pelos erros de Zandvoort e Silverstone. Roda a roda 86 porque a disputa dele é agressiva; o traço "sujo" cuida do resto.
- **Leclerc** é o melhor em uma volta (95), mas tem a pior consistência do top 6 (80).
- **Alonso** tem o maior roda a roda e inteligência de pista do grid fora o top 3; ritmo e quali já mostram a idade.
- **Stroll** tem a maior diferença entre chuva (84) e overall (74) do grid, e boas largadas (82).

## Dados de base (áreas analisadas no script original)

| Piloto | Força do carro | Duelo quali | Duelo corrida | Abandonos por culpa própria | Erros graves (lugar) | Posições ganhas (quali → chegada) |
| --- | --- | --- | --- | --- | --- | --- |
| Andrea Kimi Antonelli | 91 | 0,59 | 0,71 | 0 | 0 | -0,1 |
| Lewis Hamilton | 88 | 0,47 | 0,53 | 0 | 0 | +0,1 |
| Max Verstappen | 90 | 0,76 | 0,76 | 1 | 2 (Zandvoort, Silverstone) | +1,5 |
| Lando Norris | 88 | 0,65 | 0,56 | 0 | 1 (sprint de Singapura) | +0,2 |
| Charles Leclerc | 88 | 0,53 | 0,47 | 2 | 3 (Miami, Mônaco, Monza) | -0,4 |
| George Russell | 91 | 0,41 | 0,29 | 0 | 1 (sprint de Singapura) | -1,4 |
| Fernando Alonso | 76 | 0,88 | 0,83 | 0 | 0 | +3,8 |
| Oscar Piastri | 88 | 0,35 | 0,44 | 0 | 2 (Canadá, Baku) | -0,5 |
| Carlos Sainz | 77 | 0,71 | 0,65 | 0 | 1 (Zandvoort) | +1,7 |
| Pierre Gasly | 84 | 0,82 | 0,63 | 0 | 0 | +0,5 |
| Liam Lawson | 82 | 0,53 | 0,65 | 0 | 0 | +1,9 |
| Isack Hadjar | 90 | 0,29 | 0,21 | 1 | 1 (Miami) | +1,7 |
| Nico Hülkenberg | 79 | 0,47 | 0,53 | 0 | 0 | +2,2 |
| Oliver Bearman | 76 | 0,71 | 0,63 | 0 | 0 | +1,6 |
| Alexander Albon | 77 | 0,29 | 0,35 | 2 | 2 (Silverstone, Baku) | +1,3 |
| Gabriel Bortoleto | 79 | 0,53 | 0,47 | 0 | 0 | +0,6 |
| Sergio Pérez | 72 | 0,53 | 0,73 | 0 | 0 | +4,2 |
| Esteban Ocon | 76 | 0,29 | 0,38 | 0 | 0 | +2,1 |
| Arvid Lindblad | 82 | 0,47 | 0,35 | 0 | 0 | +1,4 |
| Valtteri Bottas | 72 | 0,47 | 0,27 | 0 | 1 (Baku) | +2,5 |
| Yuki Tsunoda | 82 | 0,00 | 0,33 | 0 | 0 | +3,0 |
| Franco Colapinto | 84 | 0,18 | 0,38 | 1 | 1 (Baku) | +1,7 |
| Lance Stroll | 76 | 0,12 | 0,17 | 1 | 1 (Mônaco) | +3,6 |
- **Força do carro** = overall da equipe nesta revisão (não mais pontos).
- **Duelos**: fração vencida contra o companheiro (F1.com, após Singapura). Verstappen soma Hadjar e Lawson; Lawson e Lindblad somam os períodos com Tsunoda.
- **Abandonos por culpa própria** e **erros graves** contam só acidentes e toques causados pelo piloto (inclui erros em que ele seguiu na prova).
- **Posições ganhas** = média de posições entre a quali e a chegada nas corridas em que foi classificado. Valores altos em Alonso, Pérez e Stroll vêm de largar do fundo por punição; por isso esse número não entra direto em Ultrapassagem.

## Traços de personalidade

Os traços não mudam o overall. Cada um tem um gatilho e um efeito temporário, para o piloto oscilar de vez em quando como na vida real. Os valores são um ponto de partida para balancear no jogo.

| Traço | Tipo | Gatilho | Efeito sugerido |
| --- | --- | --- | --- |
| Queda emocional | Negativo | Corrida/quali abaixo do esperado: atrás do companheiro, erro de estratégia da equipe, abandono | 35% de chance de -2 a -4 no overall até o fim da etapa seguinte; acumula se repetir |
| Erros graves | Negativo | Pilotando no limite (quali, ataque, defesa sob pressão) | Chance de batida/rodada 2× a média do grid; se acontecer, abandono ou perda grande de posições |
| Cabeça quente | Negativo | Ser ultrapassado, tocado ou prejudicado por um rival | 15% de chance de "explodir": manobra de risco contra esse rival, com chance de toque e punição |
| Atrito com a equipe | Negativo | Carro abaixo da expectativa por várias etapas | Moral da equipe cai; -1 em Feedback/acerto e chance de pedir saída no fim do contrato |
| Sujo no roda a roda | Misto | Disputa lado a lado | +3 em defesa/roda a roda, mas 2× chance de punição e de toque |
| Sujo com companheiro | Misto | Disputa contra o próprio companheiro | Mesmo efeito do "sujo", só contra o companheiro; pode ignorar ordens de equipe |
| Roda a roda limpo | Positivo | Disputa lado a lado | Metade da chance de punição; rivais limpos também evitam toque com ele |
| Estrategista | Positivo | Decisões de pit, VSC/SC, gestão de pneu | +3 em Estratégia da equipe quando é ele no carro; pode sugerir a parada certa |
| Mestre da chuva | Positivo | Pista molhada ou mista | +3 adicional em Chuva e menos chance de erro no molhado |
| Frio sob pressão | Positivo | Brigando por título, pódio ou vitória nas voltas finais | Ignora efeitos negativos de pressão; +1 em consistência nesses momentos |
| Evolução acelerada | Positivo | Ao longo da temporada (pilotos jovens) | +1 de overall a cada 6 etapas, até um teto definido |
| Líder técnico | Positivo | Fora da pista, entre etapas | Acelera o desenvolvimento do carro (+10% nas atualizações) |
| Gestor de pneus | Positivo | Stints longos | Degradação 10% menor; viabiliza estratégias de uma parada a menos |

### Traços por piloto

"Seu" = traço que você apontou; "Sugestão" = traço que eu acrescentei a partir da temporada e do histórico, para você aprovar ou cortar.

| Piloto | Traços | Origem e motivo |
| --- | --- | --- |
| Andrea Kimi Antonelli | Frio sob pressão, Evolução acelerada | Sugestão: aguentou a pressão de líder sem abandono e segue evoluindo aos 20 anos |
| Lewis Hamilton | Queda emocional, Roda a roda limpo, Mestre da chuva, Gestor de pneus | Seu (queda emocional, limpo). Sugestão: chuva (Sepang de 17º a 3º) e pneu (3 paradas em Barcelona, stints longos) |
| Max Verstappen | Cabeça quente, Sujo no roda a roda, Mestre da chuva | Seu (cabeça quente pela batida em Russell em 2025, sujo). Sugestão: chuva |
| Lando Norris | Queda emocional (leve) | Sugestão: costuma ser muito autocrítico após erros; se achar exagero, corte. O toque em Piastri no sprint de Singapura não basta para "sujo com companheiro" |
| Charles Leclerc | Erros graves, Sujo com companheiro | Seu: batidas por afobação (Miami, Mônaco, Q3 de Barcelona) e disputas duras com o companheiro |
| George Russell | Líder técnico | Sugestão: feedback forte e papel de liderança entre os pilotos |
| Oscar Piastri | Roda a roda limpo, Frio sob pressão | Seu (limpo, com interrogação). Sugestão: frio, perfil muito controlado |
| Fernando Alonso | Atrito com a equipe, Roda a roda limpo, Estrategista | Seu (atrito, limpo). Sugestão: estrategista, leitura de corrida acima da média |
| Carlos Sainz | Roda a roda limpo, Estrategista | Seu (limpo, com interrogação). Sugestão: estrategista, conhecido por participar das decisões de estratégia. Ressalva: o toque em Albon em Zandvoort pesa contra o "limpo" |
| Pierre Gasly | Nenhum | Temporada sem padrão claro de comportamento |
| Isack Hadjar | Queda emocional | Sugestão: perfil emotivo; pode cortar se preferir |
| Liam Lawson | Sujo no roda a roda | Sugestão: disputas agressivas e trocas de farpas com rivais nos últimos anos |
| Oliver Bearman | Evolução acelerada | Sugestão: jovem em evolução |
| Nico Hülkenberg | Líder técnico | Sugestão: experiência e feedback valorizados na Audi |
| Gabriel Bortoleto | Evolução acelerada | Sugestão: jovem em evolução |
| Alexander Albon | Roda a roda limpo, Líder técnico | Sugestão: perfil limpo e técnico; a batida em Bearman em Silverstone foi exceção |
| Arvid Lindblad | Evolução acelerada | Sugestão: estreante com poucos erros |
| Esteban Ocon | Sujo com companheiro | Sugestão: histórico de atrito com companheiros (Gasly, Alonso) |
| Sergio Pérez | Gestor de pneus, Queda emocional | Sugestão: pneu é a marca dele; a queda emocional vem da fase final na Red Bull |
| Franco Colapinto | Erros graves | Sugestão: Baku e incidentes sob bandeira amarela |
| Valtteri Bottas | Roda a roda limpo | Sugestão: perfil limpo |
| Yuki Tsunoda | Cabeça quente | Sugestão: explosões frequentes no rádio |
| Lance Stroll | Erros graves | Seu: falta de qualidade, não afobação (a chuva boa já está no atributo 84) |

Uma observação sobre Verstappen: "cabeça quente" e "sujo" juntos podem pesar demais se os dois dispararem na mesma disputa. Sugiro que, quando um disparar, o outro fique bloqueado naquela disputa.

## Justificativa por piloto

- **Antonelli 92.** Melhor da temporada: zero abandonos, 14 pódios, 8 vitórias, 10-7 na quali e 12-5 nas corridas sobre Russell. Monza (de 19º a 1º) justifica Ultrapassagem 93.
- **Hamilton 90.** Segundo melhor da temporada: vitória em Barcelona, 6 pódios, pontos em 16 de 17 GPs e 16,3 pts/GP na primeira metade com um carro fraco de reta e estratégias ruins. Ritmo de corrida próximo ou igual ao de Leclerc mesmo quando chega atrás. Consistência 89 e Quali 87 pelas voltas finais de Q3 e pelos erros da segunda metade.
- **Verstappen 90.** Pico mais alto do grid hoje, mas começo abaixo por adaptação ao regulamento e erros próprios (Consistência 84). A fase atual tem ajuda de um carro comparável à Mercedes.
- **Norris 88.** Venceu e fez pole sempre que o carro deixou; 11-6 sobre Piastri, quebras que não foram culpa dele.
- **Leclerc 87.** Melhor volta única do grid (Quali 95), primeira metade com erros bobos e mau jogo de equipe, segunda metade melhor.
- **Russell 86.** 5 poles, 3 vitórias, defesa de elite (Baku), mas perdeu o duelo para Antonelli e caiu na segunda metade, parte por azar e parte por erro.
- **Alonso 85.** 15-2 sobre Stroll, pontos com o pior carro, inteligência e roda a roda de elite; quali e ritmo já sentem a idade.
- **Piastri 84.** Ano ruim (6-11 para Norris, travada em Baku), mas o piloto de 2025 não sumiu.
- **Sainz 83 e Gasly 83.** Sainz: 12-5 sobre Albon no pior carro do meio do grid. Gasly: pole em Monza e 14-3 sobre Colapinto, mas sumiu na segunda metade.
- **Lawson 82 e Hadjar 82.** Lawson: 12 corridas nos pontos, mas contra um estreante. Hadjar: dois pódios; o 73 do script vinha da comparação com Verstappen.
- **Hülkenberg 81, Bearman 81, Albon 80, Bortoleto 80.** Duelo da Audi empatado; Bearman 12-5 sobre Ocon; Albon perdeu para Sainz, mas as quebras não são culpa dele.
- **Pérez 79, Ocon 79, Lindblad 79, Bottas 78.** Pérez levou o duelo de corrida na Cadillac (11-4) e é o melhor gestor de pneu do fundo; Ocon 5-12 para Bearman; Lindblad estreante sólido; Bottas com quase todos os abandonos por freio e hidráulica.
- **Tsunoda 77, Colapinto 77, Stroll 74.** Tsunoda só 3 corridas; Colapinto 3-14 para Gasly na quali; Stroll 2-15 para Alonso, mas sem a punição pelas quebras do carro.

## Equipes de F1

| Equipe | Motor | Overall | Motor | Aero | Chassi | Estratégia | Pit stop | Confiabilidade | Gestão de pilotos | Desenvolvimento | Overall do script | Variação |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Mercedes | Mercedes | **91** | 95 | 91 | 90 | 88 | 87 | 82 | 92 | 82 | 91 | 0 |
| Red Bull | Red Bull Ford | **90** | 94 | 89 | 88 | 89 | 90 | 80 | 78 | 92 | 86 | +4 |
| Ferrari | Ferrari | **88** | 86 | 92 | 90 | 82 | 86 | 86 | 65 | 85 | 86 | +2 |
| McLaren | Mercedes | **88** | 92 | 86 | 88 | 86 | 88 | 75 | 74 | 85 | 86 | +2 |
| Alpine F1 Team | Mercedes | **84** | 92 | 80 | 81 | 80 | 80 | 84 | 80 | 93 | 76 | +8 |
| RB F1 Team | Red Bull Ford | **82** | 94 | 75 | 76 | 84 | 82 | 88 | 85 | 70 | 78 | +4 |
| Audi | Audi | **79** | 79 | 78 | 81 | 78 | 78 | 74 | 82 | 84 | 71 | +8 |
| Williams | Mercedes | **77** | 92 | 69 | 68 | 77 | 78 | 80 | 80 | 70 | 72 | +5 |
| Aston Martin | Honda | **76** | 73 | 78 | 77 | 75 | 76 | 55 | 76 | 86 | 68 | +8 |
| Haas F1 Team | Ferrari | **76** | 84 | 71 | 71 | 75 | 76 | 80 | 76 | 62 | 72 | +4 |
| Cadillac F1 Team | Ferrari | **72** | 84 | 65 | 67 | 72 | 72 | 62 | 80 | 80 | 67 | +5 |

Novos atributos de equipe (fora do overall):

- **Confiabilidade:** chance de quebra por corrida.
- **Gestão de pilotos:** clareza das regras entre os dois pilotos. Alta = ordens obedecidas, menos toques entre companheiros, menos queda de moral. Baixa = mais disputas internas, mais chance de "sujo com companheiro" disparar e de ordens ignoradas.
- **Desenvolvimento:** velocidade com que o carro evolui durante a temporada. No jogo, define o ganho por atualização.

Estratégia, pit stop e gestão de pilotos são estimativas qualitativas; não há dado medido para elas.

### Justificativa por equipe

- **Mercedes 91.** Pacote mais completo e equilibrado (aero 91, pole em Mônaco, onde motor pesa pouco) e 11 vitórias. Gestão de pilotos 92: regras claras, como a troca de posição entre Russell e Antonelli em Zandvoort sem atrito. Desenvolvimento 82 porque o ritmo caiu nas últimas etapas.
- **Red Bull 90.** Hoje à frente na quali e com velocidade de reta comparável à Mercedes; motor 94 pelo melhor motor de combustão do grid. Desenvolvimento 92 (maior virada da temporada entre as grandes). Gestão 78: equipe montada em torno de Verstappen, com o segundo carro sempre longe.
- **Ferrari 88.** Provavelmente o melhor carro em curva (aero 92), mas perde nas retas (motor 86). Estratégia 82 e gestão de pilotos 65: erros de pit, decisões tardias e convivência ruim entre os pilotos na pista.
- **McLaren 88.** Ritmo de corrida forte, déficit de reta por arrasto. Gestão 74: regras existem, mas geram atrito (recusa ao pedido de Norris na Hungria, toque entre os dois no sprint de Singapura). Confiabilidade 75.
- **Alpine 84.** Maior evolução do ano (1,03 s), por isso Desenvolvimento 93.
- **Racing Bulls 82.** Carro estagnado (Desenvolvimento 70), mas melhor gestão de corrida do meio do grid e muito confiável.
- **Audi 79.** Chassi bom, motor fraco; evoluindo.
- **Williams 77.** Carro atrasado e acima do peso, salvo pelo motor Mercedes; o pacote de Baku não funcionou.
- **Aston Martin 76.** Honda fraco, mas o pacote da Hungria funcionou (Desenvolvimento 86). Confiabilidade 55, a pior do grid.
- **Haas 76.** Única equipe que andou para trás no ano (Desenvolvimento 62).
- **Cadillac 72.** Mais lenta do grid; evolui num ritmo parecido com o das equipes antigas.

## Sugestões para o script (`npm run overall`)

1. **Classificar o motivo de cada abandono** (acidente próprio, colisão causada por outro, mecânico) e só descontar no primeiro caso.
2. **Ponderar o duelo pela força do companheiro**: duelo ajustado = duelo bruto × (overall do companheiro / 85), em duas ou três iterações.
3. **Trocar "posições ganhas" por posições ganhas só de quem largou entre 1º e 15º sem punição.**
4. **Medir força do carro por ritmo**: diferença percentual da melhor volta de quali para a pole, com 70% de peso para as últimas 5 ou 6 etapas.
5. **Separar motor por fabricante** e dar a clientes 2 a 4 pontos a menos que a equipe de fábrica.
6. **Pesar o piloto 80% temporada e 20% últimas 5 ou 6 etapas.**
7. **Atributos sem dado automático** (chuva, feedback, inteligência, traços) ficam como valores manuais num arquivo separado, para o script não sobrescrever.

## Pilotos de F2

### Critério da F2

- **Mesma fórmula e mesmos 11 atributos da F1.** O overall sai da mesma conta de pesos.
- **Escala única com a F1.** Um piloto de F2 com o mesmo overall de um de F1 renderia igual no mesmo carro. Por isso o topo da F2 fica em 79, abaixo do meio do grid da F1 (Lindblad, que veio da F2 em 2025, está em 79; Stroll, o último da F1, em 74). Se o jogo tratar as categorias separadamente, some 3 em todos os atributos da F2 e a ordem não muda.
- **Na F2 o carro é igual para todos** (Dallara F2 2024, motor Mecachrome, pneus Pirelli). Pontos e duelo com o companheiro dizem muito mais do que na F1, então a ordem do script estava quase certa. O que mudou foram os atributos, a escala e a leitura de cada caso.
- **Mesmo peso entre temporada e forma recente: 80% e 20%.** Minì cai pouco no overall porque a primeira metade dele foi a melhor do grid; a queda aparece em Quali (72).

| Piloto | Equipe | Overall | Quali/volta rápida | Ritmo de corrida | Consist. | Largada | Ultrap. | Defesa | Roda a roda | Gestão de pneu | Chuva | Feedback/acerto | Intelig. de pista | Overall do script | Variação |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Rafael Câmara | Invicta Racing | **79** | 83 | 79 | 81 | 75 | 76 | 77 | 76 | 78 | 75 | 77 | 77 | 81 | -2 |
| Nikola Tsolov | Campos Racing | **78** | 76 | 81 | 76 | 81 | 81 | 78 | 80 | 79 | 77 | 75 | 77 | 80 | -2 |
| Alex Dunne | Rodin Motorsport | **78** | 80 | 79 | 79 | 76 | 77 | 78 | 77 | 77 | 74 | 76 | 77 | 80 | -2 |
| Gabriele Minì | MP Motorsport | **77** | 72 | 78 | 79 | 76 | 76 | 76 | 76 | 78 | 79 | 76 | 77 | 79 | -2 |
| Dino Beganovic | DAMS Lucas Oil | **76** | 79 | 76 | 74 | 75 | 75 | 76 | 74 | 75 | 75 | 75 | 74 | 77 | -1 |
| Noel León | Campos Racing | **75** | 76 | 76 | 74 | 77 | 77 | 75 | 76 | 75 | 74 | 73 | 73 | 77 | -2 |
| Kush Maini | ART Grand Prix | **73** | 78 | 73 | 71 | 74 | 73 | 74 | 73 | 72 | 72 | 74 | 73 | 74 | -1 |
| Joshua Dürksen | Invicta Racing | **73** | 74 | 74 | 69 | 77 | 77 | 74 | 74 | 73 | 72 | 73 | 72 | 73 | 0 |
| Laurens van Hoepen | Trident | **73** | 75 | 74 | 71 | 74 | 74 | 74 | 73 | 73 | 72 | 72 | 72 | 74 | -1 |
| Martinius Stenshorne | Rodin Motorsport | **73** | 78 | 75 | 69 | 74 | 74 | 73 | 71 | 73 | 72 | 73 | 69 | 75 | -2 |
| Ritomo Miyata | Hitech | **72** | 71 | 73 | 71 | 73 | 73 | 72 | 72 | 74 | 72 | 75 | 74 | 73 | -1 |
| Tasanapol Inthraphuvasak | ART Grand Prix | **72** | 74 | 73 | 70 | 72 | 72 | 72 | 71 | 72 | 70 | 71 | 71 | 72 | 0 |
| Rafael Villagómez | Van Amersfoort Racing | **70** | 69 | 70 | 67 | 71 | 70 | 70 | 69 | 72 | 69 | 70 | 70 | 69 | +1 |
| John Bennett | Trident | **70** | 70 | 70 | 67 | 71 | 71 | 70 | 69 | 70 | 69 | 70 | 69 | 68 | +2 |
| Roman Bilinski | DAMS Lucas Oil | **69** | 70 | 69 | 69 | 70 | 68 | 69 | 68 | 69 | 68 | 69 | 68 | 69 | 0 |
| Oliver Goethe | MP Motorsport | **69** | 71 | 69 | 66 | 70 | 70 | 69 | 67 | 69 | 69 | 69 | 67 | 68 | +1 |
| Sebastián Montoya | Prema Racing | **68** | 69 | 69 | 66 | 70 | 69 | 69 | 68 | 69 | 68 | 69 | 68 | 68 | 0 |
| Colton Herta | Hitech | **68** | 63 | 69 | 63 | 70 | 71 | 70 | 70 | 70 | 69 | 75 | 72 | 67 | +1 |
| Emerson Fittipaldi Jr. | AIX Racing | **68** | 67 | 68 | 66 | 69 | 69 | 68 | 68 | 68 | 67 | 68 | 67 | 68 | 0 |
| Mari Boya | Prema Racing | **67** | 68 | 67 | 66 | 69 | 67 | 67 | 67 | 67 | 67 | 68 | 67 | 67 | 0 |
| Nico Varrone | Van Amersfoort Racing | **66** | 69 | 66 | 64 | 69 | 67 | 66 | 66 | 66 | 66 | 67 | 65 | 66 | 0 |
| Cian Shields | AIX Racing | **65** | 65 | 65 | 63 | 67 | 65 | 65 | 65 | 65 | 65 | 65 | 64 | 65 | 0 |
| Hiyu Yamakoshi | Van Amersfoort Racing | **63** | 64 | 63 | 63 | 65 | 63 | 63 | 63 | 63 | 62 | 62 | 62 | 63 | 0 |

Leituras rápidas da tabela:

- **Câmara** tem a melhor quali (83: 5 poles em 13) e a melhor consistência (81: pontuou nas 12 etapas). Ataque e largada são medianos para o topo: converteu só 2 poles em vitória.
- **Tsolov** é o oposto: quali mediana (76, nenhuma pole) e o melhor do grid em largada, ultrapassagem, ritmo de corrida e roda a roda. Ganha corrida largando atrás.
- **Dunne** é o mais equilibrado: nenhum atributo abaixo de 74.
- **Minì** tem a pior quali do top 10 (72: fora do top 10 cinco vezes), mas ritmo, pneu e consistência de candidato; chuva 79 pela vitória em Miami no molhado.
- **Stenshorne** é rápido (quali 78), mas tem a pior inteligência e consistência do pelotão de cima pelas punições.
- **Herta** tem a maior diferença do grid entre quali (63) e feedback/inteligência (75 e 72): a experiência de IndyCar aparece no acerto e na leitura de corrida, mas não na volta lançada com pneu novo.

### Dados de base da F2

| Piloto | Pts | Vitórias (feature + sprint) | Pódios | Poles | Pts/etapa 1ª → 2ª metade | Pontos vs companheiro | Erros e punições notáveis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Rafael Câmara | 207 | 3 + 0 | 7 | 5 | 13,7 → 20,8 | 207 x 90 (Dürksen) | Batida em Mônaco saindo da pole; toques em Inthraphuvasak (Spielberg) e Goethe (Madri) |
| Nikola Tsolov | 200 | 4 + 2 | 9 | 0 | 17,7 → 15,7 | 200 x 133 (León) | Toque na largada em Miami; batida no sprint de Madri; erro no sprint de Baku |
| Alex Dunne | 189 | 1 + 0 | 9 | 1 | 13,3 → 18,2 | 189 x 107 (Stenshorne) | Perdeu a vitória do feature 2 de Baku por cruzar a linha do pit |
| Gabriele Minì | 163 | 1 + 1 | 9 | 0 | 18,0 → 9,2 | 163 x 37 (Goethe) | Erro na última volta do sprint de Silverstone |
| Dino Beganovic | 137 | 1 + 1 | 7 | 2 | 8,8 → 14,0 | 137 x 36 (Bilinski) | Nenhum relevante; abandonos por quebra |
| Noel León | 133 | 1 + 2 | 5 | 1 | 10,3 → 11,8 | 133 x 200 (Tsolov) | Desclassificado em Spa (rádio na bandeira vermelha); punições por VSC e limite de pista |
| Kush Maini | 90 | 0 + 1 | 3 | 2 | 7,2 → 7,8 | 90 x 71 (Inthraphuvasak) | Toque em Varrone (Madri) |
| Joshua Dürksen | 90 | 1 + 3 | 4 | 0 | 3,8 → 11,2 | 90 x 207 (Câmara) | Queima de largada (Melbourne); bandeira amarela (Barcelona); toque em Bennett (Baku) |
| Laurens van Hoepen | 90 | 0 | 5 | 1 | 7,8 → 7,2 | 90 x 38 (Bennett) | Batida saindo da pole em Montreal |
| Martinius Stenshorne | 107 | 1 + 0 | 4 | 1 | 8,0 → 9,8 | 107 x 189 (Dunne) | O mais punido: toques, jogar rivais para fora (Silverstone, Monza), parada obrigatória não feita (Spielberg) |
| Ritomo Miyata | 70 | 0 + 1 | 2 | 0 | 5,0 → 6,7 | 70 x 26 (Herta) | Toque em Goethe (Mônaco) |
| Tasanapol Inthraphuvasak | 71 | 0 | 1 | 0 | 3,8 → 8,0 | 71 x 90 (Maini) | Batida na quali de Montreal; toque em Miami |
| Rafael Villagómez | 42 | 0 | 3 | 0 | 1,0 → 6,0 | 42 x 15 (Varrone) | Limite de pista (Barcelona) |
| John Bennett | 38 | 0 + 1 | 2 | 0 | 2,8 → 3,5 | 38 x 90 (van Hoepen) | Vários abandonos em toques |
| Roman Bilinski | 36 | 0 | 1 | 0 | 2,7 → 3,3 | 36 x 137 (Beganovic) | Limite de pista (Barcelona) |
| Oliver Goethe | 37 | 0 | 2 | 0 | 4,7 → 1,5 | 37 x 163 (Minì) | Toques em Minì e Miyata (Baku); vários abandonos em colisões |
| Sebastián Montoya | 30 | 0 | 1 | 0 | 4,7 → 0,3 | 30 x 21 (Boya) | Toque em Herta (Monza); pit speeding (Melbourne) |
| Colton Herta | 26 | 0 | 0 | 0 | 3,3 → 1,0 | 26 x 70 (Miyata) | Ultrapassagem sob VSC (Mônaco); limite de pista (Budapeste); atrapalhar na quali (Baku) |
| Emerson Fittipaldi Jr. | 28 | 0 | 1 | 0 | 1,7 → 3,0 | 28 x 10 (Shields) | Acidentes em Montreal e Spa |
| Mari Boya | 21 | 0 | 0 | 0 | 1,7 → 1,8 | 21 x 30 (Montoya) | Pit speeding (Silverstone) |
| Nico Varrone | 15 | 0 | 0 | 0 | 2,3 → 0,2 | 15 x 42 (Villagómez) | Toques em Miami e Silverstone |
| Cian Shields | 10 | 0 | 0 | 0 | 1,7 → 0,0 | 10 x 28 (Fittipaldi Jr.) | Limite de pista; acidentes em Miami e Spa |
| Hiyu Yamakoshi | 2 | 0 | 0 | 0 | só Baku | 2 x 42 (Villagómez) | Só correu Baku |

Médias por etapa: etapas 1 a 6 e 7 a 12 (Baku teve uma corrida a mais). Fonte: resultados de cada etapa na Wikipedia; totais conferidos com a classificação oficial após Baku.

### Traços da F2

Mesmas regras de traço da F1. Na F2 quase todos são sugestão minha, para você aprovar ou cortar.

| Piloto | Traços | Motivo |
| --- | --- | --- |
| Rafael Câmara | Evolução acelerada | Melhorou muito da primeira para a segunda metade; vai para a F1 |
| Nikola Tsolov | Evolução acelerada, Erros graves | Achou ritmo de quali no meio do ano; abandonos por toque e batida (Miami, Madri, Baku) |
| Alex Dunne | Frio sob pressão | Melhor reta final do grid, com 71 pontos nas duas últimas etapas brigando pelo título |
| Gabriele Minì | Queda emocional | Perdeu a liderança e não se recuperou; quali piorou junto com os resultados |
| Martinius Stenshorne | Sujo no roda a roda | Punições por jogar rivais para fora (Câmara em Silverstone, Varrone em Monza) e por toques |
| Noel León | Nenhum | Erros de procedimento já estão em Inteligência de pista (73) |
| Joshua Dürksen | Nenhum | Irregular, mas sem padrão de comportamento |
| Ritomo Miyata | Líder técnico | Piloto mais experiente do grid e destaque da Hitech |
| Colton Herta | Líder técnico | Experiência de IndyCar valorizada pela Cadillac |
| Rafael Villagómez | Gestor de pneus | Pódio em Silverstone com estratégia alternativa de pneu duro |
| Oliver Goethe | Erros graves | Vários toques e abandonos em colisões, punido em Baku |
| Demais | Nenhum | Sem padrão claro na temporada |

### Justificativa por piloto

- **Câmara 79.** Melhor quali, mais consistente e melhor segunda metade (20,8 pts/etapa). Perde em conversão de pole e tem alguns toques.
- **Tsolov 78.** Mais vitórias (6), melhor em corrida e largada, mas zero poles e mais abandonos por erro do que Câmara.
- **Dunne 78.** Só uma vitória, mas 9 pódios e a melhor reta final; ganhou do companheiro com folga (189 x 107).
- **Minì 77.** A primeira metade foi a melhor do grid; a segunda, uma das piores do top 10. A queda está concentrada em quali.
- **Beganovic 76.** Duas poles e reta final forte; abandonos por quebra no começo não contam contra ele.
- **León 75.** Bom em sprint e em ataque, mas erros de procedimento e 133 x 200 para Tsolov com o mesmo carro.
- **Maini, Dürksen, van Hoepen e Stenshorne 73.** Maini e Stenshorne rápidos em quali; Dürksen rei dos sprints, mas irregular; van Hoepen regular sem vitória; Stenshorne o mais punido.
- **Miyata e Inthraphuvasak 72.** Miyata salvou a Hitech; Inthraphuvasak cresceu na segunda metade.
- **Villagómez e Bennett 70.** Villagómez acordou em Silverstone; Bennett venceu um sprint e foi 4º em Monza.
- **Bilinski e Goethe 69.** Bilinski regular no fim da zona de pontos; Goethe começou bem e sumiu.
- **Montoya, Herta e Fittipaldi Jr. 68.** Montoya parou de pontuar depois de Spielberg; Herta perdeu para Miyata e teve a pior quali do grid; Fittipaldi viveu de Madri.
- **Boya 67, Varrone 66, Shields 65, Yamakoshi 63.** Fundo do grid; Yamakoshi só correu Baku.

### Equipes da F2

O carro é igual para todos, então a equipe de F2 não tem Motor, Aero e Chassi. No lugar entra **Acerto**: a capacidade de deixar o carro rápido em cada pista, que é onde as equipes de F2 se diferenciam. O critério de peso é o mesmo da F1: 70% forma recente e 30% temporada.

Overall da equipe de F2 = 55% Acerto + 30% Estratégia + 15% Pit stop. Confiabilidade e Desenvolvimento ficam fora do overall, como na F1.

| Equipe | Overall | Acerto | Estratégia | Pit stop | Confiabilidade | Desenvolvimento | Pts | Pts/etapa 1ª → 2ª metade |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Invicta Racing | **79** | 81 | 77 | 77 | 80 | 84 | 297 | 17,5 → 32,0 |
| Campos Racing | **79** | 80 | 78 | 77 | 80 | 75 | 333 | 28,0 → 27,5 |
| Rodin Motorsport | **78** | 80 | 75 | 75 | 74 | 82 | 296 | 21,3 → 28,0 |
| DAMS Lucas Oil | **76** | 77 | 75 | 75 | 70 | 80 | 173 | 11,5 → 17,3 |
| MP Motorsport | **75** | 74 | 76 | 76 | 78 | 62 | 200 | 22,7 → 10,7 |
| ART Grand Prix | **75** | 76 | 74 | 74 | 77 | 80 | 161 | 11,0 → 15,8 |
| Trident | **74** | 74 | 73 | 74 | 77 | 72 | 128 | 10,7 → 10,7 |
| Hitech | **73** | 72 | 73 | 74 | 76 | 70 | 96 | 8,3 → 7,7 |
| Van Amersfoort Racing | **72** | 71 | 74 | 72 | 75 | 78 | 59 | 3,3 → 6,5 |
| Prema Racing | **71** | 70 | 71 | 73 | 73 | 60 | 51 | 6,3 → 2,2 |
| AIX Racing | **70** | 69 | 70 | 71 | 75 | 70 | 38 | 3,3 → 3,0 |

- **Acerto:** quanto do ritmo do carro a equipe extrai em cada pista. Peso maior no overall porque é o que separa as equipes num carro único.
- **Confiabilidade:** chance de quebra por corrida. Mesmo com o carro igual, preparação e manutenção variam.
- **Desenvolvimento:** quanto o acerto da equipe evolui ao longo do ano. Na F2 não há peças novas; é aprendizado da equipe com o carro e as pistas.
- **Gestão de pilotos ficou de fora:** na F2 quase não há ordem de equipe e cada piloto corre pelo próprio campeonato.

Como usar no jogo: na F2 a equipe deve pesar bem menos do que na F1. Sugestão: o overall da equipe mexe no máximo 2% a 3% no ritmo, contra algo perto de 8% a 10% na F1. Assim, um piloto forte numa equipe fraca ainda consegue vencer, como Miyata (Hitech) em Madri ou Villagómez (Van Amersfoort) no pódio em Silverstone.

Valores estimados a partir de pontos, poles, quebras e da evolução de cada equipe no ano; não há dado direto de acerto, estratégia ou pit stop.

### Justificativa por equipe da F2

- **Invicta 79.** Campeã de equipes de 2025 e a melhor da segunda metade (32 pts/etapa): dobradinha em Monza, 5 das 13 poles com Câmara. Desenvolvimento 84 pelo salto ao longo do ano.
- **Campos 79.** A mais constante: 9 vitórias com os dois pilotos e lidera o campeonato de equipes. Fica empatada com a Invicta porque não cresceu na segunda metade (Desenvolvimento 75).
- **Rodin 78.** Dobradinha em Montreal, as duas poles e a melhor etapa do ano em Baku. Confiabilidade 74 e Estratégia 75 por erros de operação: Stenshorne sem fazer a parada obrigatória em Spielberg e sem largar em Silverstone por problema técnico.
- **DAMS 76.** Carro rápido (2 poles, vitória em Madri, sprint de Baku), mas a pior confiabilidade do grid (70): Beganovic perdeu Melbourne e Montreal por quebra e abandonou em Spa.
- **MP 75.** Boa operação (estratégia e pit 76), mas o acerto caiu junto com a quali de Minì na segunda metade (Desenvolvimento 62).
- **ART 75.** Em alta: duas poles de Maini, primeira vitória no ano em Barcelona, pódios de Maini e Inthraphuvasak na segunda metade.
- **Trident 74.** Estável no meio: pole em Montreal, vitória no sprint de Spielberg, sem vitória em feature.
- **Hitech 73.** O acerto não ajudou Herta; Miyata salvou o ano com Madri.
- **Van Amersfoort 72.** Carro fraco, mas estratégia acima do nível dela (74): o pódio de Villagómez em Silverstone veio de estratégia alternativa.
- **Prema 71.** A equipe que mais caiu (6,3 para 2,2 pts/etapa). Desenvolvimento 60.
- **AIX 70.** Fundo do grid; o fim de semana de Madri foi exceção.

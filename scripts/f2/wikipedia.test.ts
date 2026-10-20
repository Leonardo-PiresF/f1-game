import { describe, expect, it } from 'vitest';
import { lerClassificacao, lerInscritos } from './wikipedia.ts';

// Recorte reduzido do formato real da página da Wikipedia.
const WIKITEXT = `== Entries ==
Texto de introdução.<ref>{{Cite web |title=Fonte}}</ref>

{| class="wikitable" style="font-size: 85%"
! Team
! No.
! Driver
! Rounds
|-
| rowspan="2" nowrap| {{flagicon|GBR}} [[Hitech Grand Prix|Hitech]]
| 3
| nowrap|{{flagicon|JPN}} [[Ritomo Miyata]]
|1–12
|-
| 4
|{{flagicon|USA}} [[Colton Herta]]
|1–12{{efn|[[Colton Herta]] withdrew.<ref>{{cite web|title=Nota}}</ref>}}
|-
| rowspan="3" nowrap="" | {{flagicon|NLD}} [[Van Amersfoort Racing]]
|rowspan="2"| 22
|{{flagicon|ARG}} [[Nico Varrone]]
|1–11
|-
|{{flagicon|JPN}} [[Hiyu Yamakoshi]]
|12
|-
| 23
|{{Flagicon|MEX}} [[Rafael Villagómez]]
|1–12
|-
! colspan="4" |Source:<ref>Lista oficial</ref>
|}

=== Drivers' Championship standings ===
{|
| style="vertical-align:top" |
{| class="wikitable" style="font-size: 85%;"
! rowspan="2" |{{Tooltip|Pos.|Position}}
! rowspan="2" |Driver
! colspan="2" |[[2026 Melbourne Formula 2 round|ALB]]
! rowspan="2" |Points
|-
!SR
!FR
|-
! 1
| align="left" |{{flagicon|BRA}} [[Rafael Câmara]]
| style="background:#CFCFFF;" | 11
| style="background:#FFDF9F;" | 3<span style="font-weight:bold;"><sup>F</sup></span>
! 207
|-
! 2
| align="left" |{{flagicon|JPN}} [[Hiyu Yamakoshi]]
|
| style="background:#EFCFFF;" | Ret
! 2
|-
| colspan="4" |Sources:
|}
|}
== Notes ==`;

describe('lerInscritos', () => {
  const inscritos = lerInscritos(WIKITEXT);

  it('expande rowspan de equipe e de número', () => {
    expect(inscritos.map((i) => [i.equipe, i.numero, i.piloto])).toEqual([
      ['Hitech', 3, 'Ritomo Miyata'],
      ['Hitech', 4, 'Colton Herta'],
      ['Van Amersfoort Racing', 22, 'Nico Varrone'],
      ['Van Amersfoort Racing', 22, 'Hiyu Yamakoshi'],
      ['Van Amersfoort Racing', 23, 'Rafael Villagómez'],
    ]);
  });

  it('tira notas das células e lê bandeiras e links', () => {
    expect(inscritos[1]).toMatchObject({ rodadas: '1–12', nacionalidade: 'USA', paisEquipe: 'GBR' });
    expect(inscritos[4]).toMatchObject({ idPiloto: 'rafael_villagomez', nacionalidade: 'MEX' });
    expect(inscritos[0]!.wikipedia).toBe('Ritomo Miyata');
  });
});

describe('lerClassificacao', () => {
  it('lê posição, resultados sem marcações e pontos, ignorando o rodapé', () => {
    expect(lerClassificacao(WIKITEXT)).toEqual([
      { posicao: 1, piloto: 'Rafael Câmara', idPiloto: 'rafael_camara', nacionalidade: 'BRA', resultados: ['11', '3'], pontos: 207 },
      { posicao: 2, piloto: 'Hiyu Yamakoshi', idPiloto: 'hiyu_yamakoshi', nacionalidade: 'JPN', resultados: ['', 'Ret'], pontos: 2 },
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import type { DadosF1 } from '../f1/jolpica.ts';
import { calcularF1, calcularF2 } from './calcular.ts';

const piloto = (id: string, equipeId: string, pontos: number) => ({
  id, nome: id, nascimento: '2000-01-01', nacionalidade: 'X', equipeId, posicao: 1, pontos, vitorias: 0,
});

// Duas equipes, duas corridas. "a1" bate o companheiro em tudo; "b1" e "b2" empatam.
const dados: DadosF1 = {
  ano: 2026,
  rodadasDisputadas: 2,
  pilotos: [piloto('a1', 'a', 40), piloto('a2', 'a', 20), piloto('b1', 'b', 5), piloto('b2', 'b', 5)],
  equipes: [
    { id: 'a', nome: 'A', nacionalidade: 'X', posicao: 1, pontos: 60, vitorias: 2 },
    { id: 'b', nome: 'B', nacionalidade: 'X', posicao: 2, pontos: 10, vitorias: 0 },
  ],
  calendario: [],
  resultados: [1, 2].flatMap((rodada) => [
    { rodada, pilotoId: 'a1', equipeId: 'a', largada: 1, chegada: 1, status: 'Finished', pontos: 20 },
    { rodada, pilotoId: 'a2', equipeId: 'a', largada: 2, chegada: 2, status: 'Finished', pontos: 10 },
    { rodada, pilotoId: 'b1', equipeId: 'b', largada: rodada === 1 ? 3 : 4, chegada: rodada === 1 ? 3 : 4, status: 'Finished', pontos: 2.5 },
    { rodada, pilotoId: 'b2', equipeId: 'b', largada: rodada === 1 ? 4 : 3, chegada: rodada === 1 ? 4 : 3, status: 'Finished', pontos: 2.5 },
  ]),
  classificatorios: [1, 2].flatMap((rodada) => [
    { rodada, pilotoId: 'a1', posicao: 1 },
    { rodada, pilotoId: 'a2', posicao: 2 },
    { rodada, pilotoId: 'b1', posicao: rodada === 1 ? 3 : 4 },
    { rodada, pilotoId: 'b2', posicao: rodada === 1 ? 4 : 3 },
  ]),
};

describe('calcularF1', () => {
  const { pilotos, equipes } = calcularF1(dados);
  const overall = (id: string) => pilotos.find((p) => p.id === id)!.overall;

  it('quem bate o companheiro tem overall maior', () => {
    expect(overall('a1')).toBeGreaterThan(overall('a2'));
  });

  it('companheiros empatados ficam com o mesmo overall', () => {
    expect(overall('b1')).toBe(overall('b2'));
  });

  it('a equipe com mais pontos tem overall maior e todas as notas ficam entre 40 e 99', () => {
    const [a, b] = equipes;
    expect(a!.overall).toBeGreaterThan(b!.overall);
    for (const n of [...pilotos.map((p) => p.overall), ...equipes.flatMap((e) => Object.values(e.areas))]) {
      expect(n).toBeGreaterThanOrEqual(40);
      expect(n).toBeLessThanOrEqual(99);
    }
  });
});

describe('calcularF2', () => {
  it('mais pontos dá overall maior, e corridas não disputadas não contam como abandono', () => {
    const [lider, ultimo] = calcularF2(
      [
        { posicao: 1, piloto: 'L', idPiloto: 'l', resultados: ['1', '2', ''], pontos: 43 },
        { posicao: 2, piloto: 'U', idPiloto: 'u', resultados: ['Ret', '9', ''], pontos: 0 },
      ],
      new Map(),
    );
    expect(lider!.overall).toBeGreaterThan(ultimo!.overall);
    expect(lider!.base.abandonos).toBe(0);
    expect(ultimo!.base.abandonos).toBe(0.5);
  });
});

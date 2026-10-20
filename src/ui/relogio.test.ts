import { describe, expect, it } from 'vitest';
import temporada from '../data/temporada-2026.json';
import { montarGrid, simularCorrida, type PilotoNaCorrida } from '../engine/corrida';
import { buscarPista } from '../engine/pistas';
import type { Equipe } from '../engine/types';
import { duracao, formatarTempo, torreNoTempo } from './relogio';
import { criarTracado, pontoNaVolta } from './tracado';

const corrida = simularCorrida({
  pista: buscarPista('interlagos'),
  categoria: 'F1',
  pilotos: montarGrid(temporada.pilotos as unknown as (PilotoNaCorrida & { papel: string })[], 'F1'),
  equipes: temporada.equipes as unknown as Equipe[],
  semente: 42,
});

describe('torreNoTempo', () => {
  it('na largada segue o grid', () => {
    expect(torreNoTempo(corrida, 0).map((l) => l.pilotoId)).toEqual(corrida.grid.map((g) => g.pilotoId));
  });

  it('no fim bate com o resultado oficial', () => {
    const torre = torreNoTempo(corrida, duracao(corrida));
    expect(torre.map((l) => l.pilotoId)).toEqual(corrida.resultado.map((r) => r.pilotoId));
    for (const r of corrida.resultado) {
      const linha = torre.find((l) => l.pilotoId === r.pilotoId)!;
      if (r.status === 'abandonou') expect(linha.diferenca).toBe('ABD');
      else if (r.voltas < corrida.voltas) expect(linha.diferenca).toMatch(/volta/);
    }
  });
});

describe('tracado', () => {
  it('começa no primeiro ponto de controle e fecha a volta', () => {
    const t = criarTracado(buscarPista('monza').tracado);
    expect(pontoNaVolta(t, 0)).toEqual([30, 85]);
    expect(pontoNaVolta(t, 1)).toEqual([30, 85]);
    expect(pontoNaVolta(t, -0.25)).toEqual(pontoNaVolta(t, 0.75));
  });
});

describe('formatarTempo', () => {
  it('formata minutos e horas', () => {
    expect(formatarTempo(73.5)).toBe('1:13.500');
    expect(formatarTempo(5339.321)).toBe('1:28:59.321');
  });
});

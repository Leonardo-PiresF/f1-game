import { describe, expect, it } from 'vitest';
import temporada from '../data/temporada-2026.json';
import { montarGrid, simularCorrida, type PilotoNaCorrida } from '../engine/corrida';
import { buscarPista } from '../engine/pistas';
import type { Equipe } from '../engine/types';
import { duracao, formatarTempo, montarLinhasDoTempo, tempoNaDistancia, torreNoTempo } from './relogio';
import { criarTracado, pontoNaVolta } from './tracado';

const pista = buscarPista('interlagos');
const corrida = simularCorrida({
  pista,
  categoria: 'F1',
  pilotos: montarGrid(temporada.pilotos as unknown as (PilotoNaCorrida & { papel: string })[], 'F1'),
  equipes: temporada.equipes as unknown as Equipe[],
  semente: 42,
});
const linhas = montarLinhasDoTempo(corrida, pista);
const torre = (t: number) => torreNoTempo(corrida, linhas, t);

describe('torreNoTempo', () => {
  it('na largada segue o grid', () => {
    expect(torre(0).map((l) => l.pilotoId)).toEqual(corrida.grid.map((g) => g.pilotoId));
  });

  it('no fim bate com o resultado oficial', () => {
    const fim = torre(duracao(corrida));
    expect(fim.map((l) => l.pilotoId)).toEqual(corrida.resultado.map((r) => r.pilotoId));
    for (const r of corrida.resultado) {
      const linha = fim.find((l) => l.pilotoId === r.pilotoId)!;
      if (r.status === 'abandonou') expect(linha.intervalo).toBe('ABD');
      else if (r.voltas < corrida.voltas) expect(linha.paraLider).toMatch(/volta/);
      else if (r.posicao > 1) expect(linha.paraLider).toBe(`+${(corrida.tempos[r.pilotoId]![r.voltas]! - corrida.tempos[corrida.resultado[0]!.pilotoId]![r.voltas]!).toFixed(1)}`);
    }
  });

  it('mede a diferença no meio da volta, não só na linha', () => {
    const t = (corrida.tempos[corrida.grid[0]!.pilotoId]![10]! + corrida.tempos[corrida.grid[0]!.pilotoId]![11]!) / 2;
    const [a, b] = torre(t);
    const esperado = t - tempoNaDistancia(linhas.get(a!.pilotoId)!, b!.distancia)!;
    expect(b!.intervalo).toBe(`+${esperado.toFixed(1)}`);
    expect(b!.distancia % 1).toBeGreaterThan(0);
  });

  it('mostra o carro no box durante a parada', () => {
    const [id, paradas] = Object.entries(corrida.paradas).find(([, p]) => p.length > 0)!;
    const tempoFimDaVolta = corrida.tempos[id]![paradas[0]!.volta]!;
    const linha = torre(tempoFimDaVolta - paradas[0]!.parada / 2).find((l) => l.pilotoId === id)!;
    expect(linha.noBox).toBe(true);
  });
});

describe('tracado', () => {
  it('fecha a volta e aceita frações negativas', () => {
    const t = criarTracado(buscarPista('monza').tracado);
    const [x0, y0] = pontoNaVolta(t, 0);
    const [x1, y1] = pontoNaVolta(t, 1);
    expect(x1).toBeCloseTo(x0);
    expect(y1).toBeCloseTo(y0);
    expect(pontoNaVolta(t, -0.25)).toEqual(pontoNaVolta(t, 0.75));
  });
});

describe('formatarTempo', () => {
  it('formata minutos e horas', () => {
    expect(formatarTempo(73.5)).toBe('1:13.500');
    expect(formatarTempo(5339.321)).toBe('1:28:59.321');
  });
});

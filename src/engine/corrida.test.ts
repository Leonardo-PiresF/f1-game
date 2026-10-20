import { describe, expect, it } from 'vitest';
import temporada from '../data/temporada-2026.json';
import { montarGrid, PONTOS, simularCorrida, sobrenome, type PilotoNaCorrida } from './corrida';
import { buscarPista, PISTAS } from './pistas';
import type { Categoria, Equipe } from './types';

const pilotos = temporada.pilotos as unknown as (PilotoNaCorrida & { papel: string })[];
const equipes = temporada.equipes as unknown as Equipe[];
const correr = (semente: number, categoria: Categoria = 'F1', pistaId = 'interlagos', clima?: 'seco' | 'molhado') =>
  simularCorrida({ pista: buscarPista(pistaId), categoria, pilotos: montarGrid(pilotos, categoria), equipes, semente, clima });

describe('simularCorrida', () => {
  it('é determinística pela semente', () => {
    expect(correr(5)).toEqual(correr(5));
    expect(correr(5).resultado).not.toEqual(correr(6).resultado);
  });

  it('monta grids de 22 carros, dois por equipe, sem reservas', () => {
    for (const cat of ['F1', 'F2'] as const) {
      const grid = montarGrid(pilotos, cat);
      expect(grid).toHaveLength(22);
      expect(grid.some((p) => p.papel !== 'titular')).toBe(false);
    }
  });

  it('classifica todo mundo e distribui os pontos', () => {
    for (const pista of PISTAS) {
      for (const cat of ['F1', 'F2'] as const) {
        const c = correr(11, cat, pista.id);
        expect(c.resultado).toHaveLength(22);
        expect(c.resultado.map((r) => r.posicao)).toEqual([...Array(22).keys()].map((i) => i + 1));
        const chegaram = c.resultado.filter((r) => r.status === 'chegou');
        const esperado = PONTOS.slice(0, chegaram.length).reduce((s, p) => s + p, 0);
        expect(c.resultado.reduce((s, r) => s + r.pontos, 0)).toBe(esperado);
        expect(chegaram[0]!.voltas).toBe(c.voltas);
      }
    }
  });

  it('mantém os tempos em ordem e só o vencedor completa a distância antes dos outros', () => {
    const c = correr(3);
    for (const tempos of Object.values(c.tempos)) {
      for (let i = 1; i < tempos.length; i++) expect(tempos[i]!).toBeGreaterThan(tempos[i - 1]!);
    }
    const vencedor = c.resultado[0]!;
    const fimVencedor = c.tempos[vencedor.pilotoId]![c.voltas]!;
    for (const r of c.resultado.filter((r) => r.status === 'chegou')) {
      expect(c.tempos[r.pilotoId]![r.voltas]!).toBeGreaterThanOrEqual(fimVencedor);
    }
  });

  it('no seco, quem termina usa pelo menos dois compostos', () => {
    for (let s = 1; s <= 10; s++) {
      const c = correr(s, 'F1', 'monza', 'seco');
      for (const r of c.resultado.filter((r) => r.status === 'chegou')) {
        const usados = new Set(c.estados.map((e) => e.find((x) => x.pilotoId === r.pilotoId)!.pneu));
        expect(usados.size, r.pilotoId).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('o melhor conjunto pontua muito mais que o pior', () => {
    let antonelli = 0;
    let stroll = 0;
    for (let s = 1; s <= 40; s++) {
      for (const r of correr(s, 'F1', 'silverstone', 'seco').resultado) {
        if (r.pilotoId === 'antonelli') antonelli += r.pontos;
        if (r.pilotoId === 'stroll') stroll += r.pontos;
      }
    }
    expect(antonelli).toBeGreaterThan(stroll * 5);
    expect(antonelli / 40).toBeLessThan(25);
  });

  it('na chuva, o atributo de chuva pesa', () => {
    let seco = 0;
    let molhado = 0;
    for (let s = 1; s <= 40; s++) {
      const pontos = (clima: 'seco' | 'molhado') => correr(s, 'F1', 'interlagos', clima).resultado.find((r) => r.pilotoId === 'hamilton')!.pontos;
      seco += pontos('seco');
      molhado += pontos('molhado');
    }
    expect(molhado).toBeGreaterThan(seco);
  });
});

describe('sobrenome', () => {
  it('ignora sufixos como Jr.', () => {
    expect(sobrenome('Emerson Fittipaldi Jr.')).toBe('Fittipaldi');
    expect(sobrenome('Max Verstappen')).toBe('Verstappen');
  });
});

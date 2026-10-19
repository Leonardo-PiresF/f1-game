import { describe, expect, it } from 'vitest';
import { criarRng, inteiroEntre } from './rng';

describe('criarRng', () => {
  it('repete a mesma sequência para a mesma semente', () => {
    const a = criarRng(42);
    const b = criarRng(42);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('gera sequências diferentes para sementes diferentes', () => {
    expect(criarRng(1)()).not.toBe(criarRng(2)());
  });

  it('fica sempre entre 0 (inclusive) e 1 (exclusive)', () => {
    const rng = criarRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('inteiroEntre', () => {
  it('respeita os limites, incluindo as pontas', () => {
    const rng = criarRng(3);
    const vistos = new Set<number>();
    for (let i = 0; i < 500; i++) vistos.add(inteiroEntre(rng, 1, 3));
    expect([...vistos].sort()).toEqual([1, 2, 3]);
  });
});

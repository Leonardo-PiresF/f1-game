import { describe, expect, it } from 'vitest';
import { buscarPista } from './pistas';
import { melhoresEstrategias, sortearPneus } from './pneus';
import { criarRng } from './rng';

describe('pneus', () => {
  it('cada fim de semana sorteia um comportamento diferente', () => {
    const pista = buscarPista('interlagos');
    const a = sortearPneus(pista, criarRng(1));
    expect(sortearPneus(pista, criarRng(1))).toEqual(a);
    expect(sortearPneus(pista, criarRng(2))).not.toEqual(a);
  });

  it('às vezes o macio dura mais ou o duro não funciona', () => {
    const pista = buscarPista('monza');
    const notas = new Set<string>();
    for (let s = 1; s <= 200; s++) {
      const p = sortearPneus(pista, criarRng(s));
      for (const k of ['macio', 'medio', 'duro'] as const) if (p[k].nota) notas.add(`${k}:${p[k].nota}`);
    }
    expect(notas.size).toBeGreaterThanOrEqual(4);
  });

  it('as estratégias usam pelo menos dois compostos e vêm ordenadas', () => {
    const pista = buscarPista('silverstone');
    const opcoes = melhoresEstrategias(sortearPneus(pista, criarRng(3)), pista.voltas, pista.perdaBox, 1);
    for (const o of opcoes) expect(new Set(o.compostos).size).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < opcoes.length; i++) expect(opcoes[i]!.custo).toBeGreaterThanOrEqual(opcoes[i - 1]!.custo);
  });
});

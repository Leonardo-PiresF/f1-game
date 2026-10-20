import { describe, expect, it } from 'vitest';
import { aparenciaDe, contornar, CONTORNO, desenhar, LADO_RETRATO, retangulos, spriteCarro, spriteRetrato, TAMANHO_CARRO } from './pixel';

describe('pixel art', () => {
  it('contorna o desenho e junta pixels iguais', () => {
    const g = contornar(desenhar(['AA', '.A'], { A: '#fff' }));
    expect(g.length).toBe(4);
    expect(g[0]![1]).toBe(CONTORNO);
    expect(g[0]![0]).toBeNull();
    expect(retangulos(desenhar(['AAB'], { A: '#fff', B: '#000' }))).toEqual([
      { x: 0, y: 0, w: 2, cor: '#fff' },
      { x: 2, y: 0, w: 1, cor: '#000' },
    ]);
  });

  it('carro usa a cor da equipe e a T-cam amarela no segundo piloto', () => {
    const primeiro = spriteCarro('ferrari', '#ffffff', false).flat();
    const segundo = spriteCarro('ferrari', '#ffffff', true).flat();
    expect(spriteCarro('ferrari', '#fff', false).length).toBe(TAMANHO_CARRO.altura);
    expect(primeiro).toContain('#e8002d');
    expect(primeiro).not.toContain('#f5c400');
    expect(segundo).toContain('#f5c400');
  });

  it('retrato é estável por piloto e tem o tamanho certo', () => {
    expect(aparenciaDe('rafael_camara', 'BRA')).toEqual(aparenciaDe('rafael_camara', 'BRA'));
    expect(aparenciaDe('hamilton').cabelo).toBe('trancas');
    const g = spriteRetrato(aparenciaDe('hamilton'), 'ferrari');
    expect(g.length).toBe(LADO_RETRATO);
    expect(g[0]!.length).toBe(LADO_RETRATO);
  });
});

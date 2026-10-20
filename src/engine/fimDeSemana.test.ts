import { describe, expect, it } from 'vitest';
import temporada from '../data/temporada-2026.json';
import { aplicarPunicoesDeGrid } from './classificacao';
import { criarCampeonato, proximaRodada, registrarRodada, tabelaEquipes, tabelaPilotos, trocasDeMotor } from './campeonato';
import { montarGrid, pontosPorDistancia, PONTOS, simularCorrida, type PilotoNaCorrida } from './corrida';
import { simularFimDeSemana } from './fimDeSemana';
import { buscarPista, PISTAS } from './pistas';
import { criarRng } from './rng';
import type { Categoria, Equipe } from './types';

const todos = temporada.pilotos as unknown as (PilotoNaCorrida & { papel: string })[];
const equipes = temporada.equipes as unknown as Equipe[];
const grid = (c: Categoria) => montarGrid(todos, c);
const fds = (semente: number, categoria: Categoria = 'F1', pistaId = 'interlagos', sprint = false, clima?: 'seco' | 'molhado') =>
  simularFimDeSemana({ pista: buscarPista(pistaId), categoria, pilotos: grid(categoria), equipes, semente, sprint, clima });

describe('fim de semana', () => {
  it('é determinístico e segue o formato de cada categoria', () => {
    expect(fds(3)).toEqual(fds(3));
    expect(fds(3).sessoes).toEqual(['TL1', 'TL2', 'TL3', 'Q', 'CORRIDA']);
    expect(fds(3, 'F1', 'miami', true).sessoes).toEqual(['TL1', 'SQ', 'SPRINT', 'Q', 'CORRIDA']);
    expect(fds(3, 'F2', 'monaco').sessoes).toEqual(['TL1', 'Q', 'SPRINT', 'CORRIDA']);
  });

  it('classificação: Q1 com todos, Q2 com 16, Q3 com 10', () => {
    const q = fds(5).quali;
    expect(q.sessoes.map((s) => s.participantes.length)).toEqual([22, 16, 10]);
    expect(q.grid.map((l) => l.posicao)).toEqual([...Array(22).keys()].map((i) => i + 1));
    expect(q.grid.slice(0, 10).every((l) => l.ultimaSessao === 'Q3')).toBe(true);
    for (const s of q.sessoes) {
      for (const t of s.tentativas) {
        if (t.abortada || t.batida) expect(t.tempo).toBeNull();
        expect(t.inicioLancada).toBeGreaterThan(t.saida);
      }
    }
  });

  it('a sprint da F2 inverte os 10 primeiros da classificação', () => {
    const f = fds(9, 'F2', 'monaco');
    const ordem = f.quali.grid.map((l) => l.pilotoId);
    expect(f.gridSprint!.map((l) => l.pilotoId)).toEqual([...ordem.slice(0, 10).reverse(), ...ordem.slice(10)]);
    expect(f.gridCorrida.map((l) => l.pilotoId)).toEqual(ordem);
  });

  it('treinos ensinam: fim de semana normal conhece mais os pneus que o sprint', () => {
    let normal = 0;
    let sprint = 0;
    for (let s = 1; s <= 10; s++) {
      const media = (c: Record<string, number>) => Object.values(c).reduce((a, b) => a + b, 0) / Object.values(c).length;
      normal += media(fds(s, 'F1', 'silverstone', false, 'seco').conhecimento);
      sprint += media(fds(s, 'F1', 'silverstone', true, 'seco').conhecimento);
    }
    expect(normal).toBeGreaterThan(sprint);
  });

  it('punição de grid empurra o piloto para trás', () => {
    const g = fds(2).quali.grid;
    const primeiro = g[0]!.pilotoId;
    const punido = aplicarPunicoesDeGrid(g, { [primeiro]: 10 });
    expect(punido.findIndex((l) => l.pilotoId === primeiro)).toBe(10);
    expect(aplicarPunicoesDeGrid(g, { [primeiro]: 20 }).at(-1)!.pilotoId).toBe(primeiro);
  });
});

describe('regras de corrida', () => {
  it('na chuva usa pneus de chuva ou intermediários', () => {
    const c = simularCorrida({ pista: buscarPista('spa'), categoria: 'F1', pilotos: grid('F1'), equipes, semente: 4, condicao: { agua0: 0.6, tendencia: 0 } });
    for (const r of c.resultado) expect(['intermediario', 'chuva']).toContain(r.pneus[0]);
  });

  it('quando a pista seca, todos acabam no pneu liso', () => {
    const c = simularCorrida({ pista: buscarPista('spa'), categoria: 'F1', pilotos: grid('F1'), equipes, semente: 4, condicao: { agua0: 0.5, tendencia: -0.03 } });
    for (const r of c.resultado.filter((x) => x.status === 'chegou')) expect(['macio', 'medio', 'duro']).toContain(r.pneus.at(-1));
  });

  it('pontos reduzidos quando a corrida não completa a distância', () => {
    expect(pontosPorDistancia(PONTOS, 1, 50)).toEqual([]);
    expect(pontosPorDistancia(PONTOS, 10, 50)).toEqual([6, 4, 3, 2, 1]);
    expect(pontosPorDistancia(PONTOS, 20, 50)[0]).toBe(13);
    expect(pontosPorDistancia(PONTOS, 30, 50)[0]).toBe(19);
    expect(pontosPorDistancia(PONTOS, 50, 50)).toBe(PONTOS);
  });
});

describe('campeonato', () => {
  it('soma os pontos etapa por etapa e pune quem passa do limite de motores', () => {
    let c = criarCampeonato(2026, PISTAS);
    const rng = criarRng(1);
    let punicoes = 0;
    let pontos = 0;
    while (proximaRodada(c)) {
      const r = proximaRodada(c)!;
      const m = trocasDeMotor(c, grid('F1'), equipes, rng);
      punicoes += Object.keys(m.punicoes).length;
      const f1 = simularFimDeSemana({ pista: buscarPista(r.pistaId), categoria: 'F1', pilotos: grid('F1'), equipes, semente: r.numero, sprint: r.sprint, punicoesDeGrid: m.punicoes });
      pontos += f1.corrida.resultado.reduce((s, x) => s + x.pontos, 0) + (f1.sprintCorrida?.resultado.reduce((s, x) => s + x.pontos, 0) ?? 0);
      c = registrarRodada(c, r.numero, f1, undefined, m.motores, m.trocas);
    }
    expect(c.resultados).toHaveLength(PISTAS.length);
    expect(tabelaPilotos(c, 'F1').reduce((s, l) => s + l.pontos, 0)).toBe(pontos);
    expect(tabelaEquipes(c, 'F1').reduce((s, l) => s + l.pontos, 0)).toBe(pontos);
    expect(punicoes).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from 'vitest';
import manual2026 from '../../dados/manual/2026.json' with { type: 'json' };
import { overallEquipe, overallPiloto, type Equipe } from '../../src/engine/types.ts';
import type { PilotoCalculado } from './calcular.ts';
import { aplicarEquipes, aplicarPilotos, type DadosManuais } from './manual.ts';

const manual = manual2026 as DadosManuais;

describe('revisão manual de 2026', () => {
  it('reproduz os overalls da revisão do Leonardo', () => {
    const notas = (ids: string[]) => ids.map((id) => overallPiloto(manual.pilotos[id]!));
    expect(notas(['antonelli', 'hamilton', 'max_verstappen', 'lawson', 'stroll'])).toEqual([92, 90, 90, 82, 74]);
    expect(notas(['rafael_camara', 'hiyu_yamakoshi'])).toEqual([79, 63]);
    expect(overallEquipe({ categoria: 'F1', areas: manual.equipesF1.mercedes! })).toBe(91);
    expect(overallEquipe({ categoria: 'F2', areas: manual.equipesF2.invicta_racing! })).toBe(79);
  });

  it('substitui atributos e traços de quem está na revisão e mantém o resto', () => {
    const calculado = (id: string): PilotoCalculado => ({
      id, nome: id, categoria: 'F1', equipeId: 'x', papel: 'titular', tracos: [], base: {},
      atributos: { quali: 1, ritmoCorrida: 1, consistencia: 1, largada: 1, ultrapassagem: 1, defesa: 1, rodaARoda: 1, gestaoPneu: 1, chuva: 1, feedback: 1, inteligencia: 1 },
    });
    const [ham, novo] = aplicarPilotos([calculado('hamilton'), calculado('novato')], manual);
    expect(ham!.origem).toBe('manual');
    expect(ham!.final.tracos.map((t) => t.id)).toContain('mestre_chuva');
    expect(novo!.origem).toBe('calculado');
  });

  it('separa as áreas do overall dos sistemas da equipe', () => {
    const equipe: Equipe = {
      id: 'mercedes', nome: 'Mercedes', categoria: 'F1',
      areas: { motor: 1, aerodinamica: 1, chassi: 1, estrategia: 1, pitStop: 1 }, sistemas: { confiabilidade: 1, desenvolvimento: 1 },
    };
    const { final } = aplicarEquipes([equipe], manual)[0]!;
    expect(final.areas).toEqual({ motor: 95, aerodinamica: 91, chassi: 90, estrategia: 88, pitStop: 87 });
    expect(final.sistemas).toEqual({ confiabilidade: 82, desenvolvimento: 82, gestaoPilotos: 92 });
  });
});

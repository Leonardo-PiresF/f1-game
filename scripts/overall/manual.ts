// Valores revisados à mão (dados/manual/<ano>.json) substituem os calculados.
import type { AreasEquipeF1, AreasEquipeF2, AtributosPiloto, Equipe, SistemasEquipe, TracoPiloto } from '../../src/engine/types.ts';
import type { PilotoCalculado } from './calcular.ts';

export interface DadosManuais {
  fonte: string;
  pilotos: Record<string, { atributos: AtributosPiloto; tracos: TracoPiloto[] }>;
  equipesF1: Record<string, AreasEquipeF1 & SistemasEquipe>;
  equipesF2: Record<string, AreasEquipeF2 & SistemasEquipe>;
}

export type Origem = 'manual' | 'calculado';

export function aplicarPilotos(calculados: PilotoCalculado[], manual: DadosManuais) {
  return calculados.map((p) => {
    const m = manual.pilotos[p.id];
    return { calculado: p, final: m ? { ...p, atributos: m.atributos, tracos: m.tracos } : p, origem: (m ? 'manual' : 'calculado') as Origem };
  });
}

export function aplicarEquipes(calculadas: Equipe[], manual: DadosManuais) {
  return calculadas.map((e) => {
    const m = e.categoria === 'F1' ? manual.equipesF1[e.id] : manual.equipesF2[e.id];
    if (!m) return { calculado: e, final: e, origem: 'calculado' as Origem };
    const { confiabilidade, desenvolvimento, gestaoPilotos, ...resto } = m;
    const areas =
      e.categoria === 'F1'
        ? (({ motor, aerodinamica, chassi, estrategia, pitStop }) => ({ motor, aerodinamica, chassi, estrategia, pitStop }))(resto as AreasEquipeF1)
        : (({ acerto, estrategia, pitStop }) => ({ acerto, estrategia, pitStop }))(resto as AreasEquipeF2);
    const sistemas: SistemasEquipe = { confiabilidade, desenvolvimento, ...(gestaoPilotos !== undefined && { gestaoPilotos }) };
    return { calculado: e, final: { ...e, areas, sistemas }, origem: 'manual' as Origem };
  });
}

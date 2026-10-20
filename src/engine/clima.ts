// Tempo do fim de semana. Cada sessão tem a pista com mais ou menos água (0 seco, 1 encharcado),
// e numa corrida a água muda volta a volta: a pista seca, a chuva aperta ou passa uma pancada.
import type { Pista } from './types.ts';
import type { Rng } from './rng.ts';

export type Clima = 'seco' | 'molhado';

export interface Condicao {
  agua0: number;
  tendencia: number; // água a mais (ou a menos) por volta
  pancada?: { de: number; ate: number; pico: number }; // chuva passageira, em voltas
}

export const SECO: Condicao = { agua0: 0, tendencia: 0 };

export function aguaNaVolta(c: Condicao, volta: number): number {
  let agua = c.agua0 + c.tendencia * volta;
  const p = c.pancada;
  if (p && volta >= p.de) {
    const pancada = volta <= p.ate ? p.pico * Math.min(1, (volta - p.de + 1) / 2) : Math.max(0, p.pico - 0.05 * (volta - p.ate));
    agua = Math.max(agua, pancada);
  }
  return Math.round(Math.min(1, Math.max(0, agua)) * 1000) / 1000;
}

export const estaMolhado = (agua: number) => agua >= 0.27;

// Sorteia o tempo de cada sessão, em ordem. Chuva numa sessão aumenta a chance de chuva na próxima.
export function sortearClima<S extends string>(pista: Pista, sessoes: { id: S; voltas: number }[], rng: Rng, forcado?: Clima): Record<S, Condicao> {
  const p = pista.perfil.chanceChuva;
  const saida = {} as Record<S, Condicao>;
  let choveuAntes = false;
  for (const s of sessoes) {
    const chove: boolean = forcado ? forcado === 'molhado' : rng() < (choveuAntes ? 0.5 : p * 0.8);
    choveuAntes = chove;
    if (chove) {
      const agua0 = forcado === 'molhado' ? 0.45 + rng() * 0.45 : 0.3 + rng() * 0.6;
      const r = rng();
      // A maioria das chuvas passa e a pista vai secando; às vezes aperta.
      const tendencia = r < 0.6 ? -(0.006 + rng() * 0.02) : r < 0.85 ? (rng() - 0.5) * 0.004 : 0.004 + rng() * 0.01;
      saida[s.id] = { agua0, tendencia };
    } else if (!forcado && s.voltas > 10 && rng() < p * 0.3) {
      const de = Math.round(s.voltas * (0.2 + rng() * 0.6));
      saida[s.id] = { agua0: 0, tendencia: 0, pancada: { de, ate: de + 2 + Math.floor(rng() * 10), pico: 0.3 + rng() * 0.6 } };
    } else {
      saida[s.id] = SECO;
    }
  }
  return saida;
}

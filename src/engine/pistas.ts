// Pistas do calendário, geradas por `npm run pistas` a partir do traçado real.
import dados from '../data/pistas.json' with { type: 'json' };
import type { Pista } from './types.ts';

export const PISTAS: Pista[] = dados.pistas as unknown as Pista[];

export function buscarPista(id: string): Pista {
  const pista = PISTAS.find((p) => p.id === id);
  if (!pista) throw new Error(`Pista desconhecida: ${id}`);
  return pista;
}

// Dados da temporada usados pelas telas.
import temporada from '../data/temporada-2026.json';
import { montarGrid, sobrenome, type PilotoNaCorrida } from '../engine/corrida';
import type { Categoria, Equipe } from '../engine/types';

export const PILOTOS = temporada.pilotos as unknown as (PilotoNaCorrida & { papel: string })[];
export const EQUIPES = temporada.equipes as unknown as Equipe[];
export const PILOTO = new Map(PILOTOS.map((p) => [p.id, p]));
export const EQUIPE = new Map(EQUIPES.map((e) => [e.id, e]));
export const GRID: Record<Categoria, PilotoNaCorrida[]> = { F1: montarGrid(PILOTOS, 'F1'), F2: montarGrid(PILOTOS, 'F2') };

export const nomePiloto = (id: string) => PILOTO.get(id)?.nome ?? id;
export const nomeEquipe = (id: string) => EQUIPE.get(id)?.nome ?? id;

export const sigla = (nome: string) =>
  sobrenome(nome)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .slice(0, 3)
    .toUpperCase();

export const siglaPiloto = (id: string) => sigla(nomePiloto(id));

// Cada fim de semana sorteia uma semente nova de 32 bits, para nada se repetir.
// O motor continua determinístico por semente, o que permite testes e saves.
export const novaSemente = () => crypto.getRandomValues(new Uint32Array(1))[0]!;

// O segundo piloto de cada equipe ganha borda escura no mapa, para diferenciar.
export function segundosPilotos(ids: string[]): Set<string> {
  const vistos = new Set<string>();
  const segundos = new Set<string>();
  for (const id of ids) {
    const eq = PILOTO.get(id)?.equipeId ?? '';
    if (vistos.has(eq)) segundos.add(id);
    vistos.add(eq);
  }
  return segundos;
}

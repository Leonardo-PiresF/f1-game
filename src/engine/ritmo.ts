// Contas de ritmo compartilhadas por treinos, classificação e corrida.
import type { AreasEquipeF1, AreasEquipeF2, Categoria, Equipe, Piloto, Pista, TracoId } from './types.ts';
import type { Rng } from './rng.ts';

export const SEGUNDOS_POR_PONTO = 0.07; // diferença de ritmo por ponto de nota

export const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function gauss(rng: Rng): number {
  const u = 1 - rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function intensidade(p: Piloto, id: TracoId): number {
  return p.tracos.find((t) => t.id === id)?.intensidade ?? (p.tracos.some((t) => t.id === id) ? 1 : 0);
}

export function sobrenome(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter((p) => !/^(jr\.?|júnior|junior|filho|neto)$/i.test(p));
  return partes[partes.length - 1] ?? nome;
}

// Nota do carro nesta pista: pistas de reta valorizam motor, pistas de curva valorizam aerodinâmica.
export function notaCarro(equipe: Equipe, pista: Pista): number {
  if (equipe.categoria === 'F2') return (equipe.areas as AreasEquipeF2).acerto;
  const a = equipe.areas as AreasEquipeF1;
  const pesoMotor = 30 * (0.5 + pista.perfil.velocidade);
  const pesoAero = 30 * (0.5 + pista.perfil.curvas);
  const pesoChassi = 25;
  return (a.motor * pesoMotor + a.aerodinamica * pesoAero + a.chassi * pesoChassi) / (pesoMotor + pesoAero + pesoChassi);
}

// Na chuva o atributo de chuva pesa mais que o ritmo de seco.
export function notaMolhado(p: Piloto, base: number): number {
  return base * 0.4 + (p.atributos.chuva + 3 * intensidade(p, 'mestre_chuva')) * 0.6;
}

// Quanto a chuva pesa na nota, de 0 (seco) a 1 (pista bem molhada).
export const pesoDaChuva = (agua: number) => limitar(agua / 0.5, 0, 1);

// No F1 o carro pesa quase tanto quanto o piloto; na F2 o carro é igual para todos.
export function combinar(categoria: Categoria, piloto: number, carro: number): number {
  return categoria === 'F1' ? 0.55 * piloto + 0.45 * carro : 0.8 * piloto + 0.2 * carro;
}

// Quanto o piloto ajuda a acertar o carro (feedback e liderança técnica).
export const fatorFeedback = (p: Piloto) => limitar(0.85 + (p.atributos.feedback - 80) * 0.01 + 0.1 * intensidade(p, 'lider_tecnico'), 0.6, 1.15);

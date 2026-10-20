// Treinos livres. Servem para duas coisas, como na F1 de verdade:
// 1. acertar o carro: cada volta no seco diminui o tempo perdido por um acerto ruim;
// 2. entender os pneus: quanto mais voltas, melhor a equipe sabe o desgaste e o ritmo de cada composto,
//    e menos erra a estratégia de corrida.
// Treino na chuva ensina pouco sobre o seco, e o fim de semana sprint só tem um treino.
import type { Equipe, Piloto } from './types.ts';
import type { Rng } from './rng.ts';
import { compostoIdeal, pegarJogo, type Composto, type JogosDePneus } from './pneus.ts';
import { fatorFeedback, gauss, limitar } from './ritmo.ts';

export interface LinhaTreino {
  pilotoId: string;
  melhorVolta: number | null;
  voltas: number;
  composto: Composto; // da melhor volta
  problema?: string;
}

export interface SessaoTreino {
  nome: string;
  agua: number;
  linhas: LinhaTreino[]; // ordenadas pela melhor volta
}

export interface CarroNoTreino {
  piloto: Piloto;
  equipe: Equipe;
  ritmo: (agua: number) => number; // volta rápida com pneu novo e pouco combustível, sem a perda de acerto
  confiabilidade: number;
  jogos: JogosDePneus;
}

// Estado do aprendizado ao longo do fim de semana.
export interface Aprendizado {
  voltasSecas: Record<string, number>; // por equipe
  voltasPiloto: Record<string, number>; // por piloto, no seco
}

export const aprendizadoVazio = (): Aprendizado => ({ voltasSecas: {}, voltasPiloto: {} });

// Conhecimento dos pneus pela equipe, de 0 a 1. Três treinos secos completos dão perto de 0,8.
export function conhecimentoDaEquipe(ap: Aprendizado, equipe: Equipe): number {
  const voltas = ap.voltasSecas[equipe.id] ?? 0;
  const engenharia = 0.8 + (equipe.areas.estrategia - 80) * 0.01;
  return limitar(1 - Math.exp(-voltas * 0.012 * engenharia), 0, 0.95);
}

// Segundos por volta perdidos pelo acerto, com o que o piloto já rodou no seco.
export function perdaDeAcerto(ap: Aprendizado, piloto: Piloto, base: number): number {
  const voltas = ap.voltasPiloto[piloto.id] ?? 0;
  return base * Math.exp(-voltas * 0.025 * fatorFeedback(piloto));
}

// Cada carro começa o fim de semana com um acerto mais ou menos distante do ideal.
export const sortearAcertoInicial = (rng: Rng) => 0.35 + rng() * 0.4;

export function simularTreino(nome: string, carros: CarroNoTreino[], agua: number, ap: Aprendizado, acertoBase: Record<string, number>, rng: Rng): SessaoTreino {
  const seco = compostoIdeal(agua) === 'seco';
  const linhas: LinhaTreino[] = [];
  for (const c of carros) {
    let voltas = Math.round(seco ? 22 + rng() * 12 : 6 + rng() * 12);
    let problema: string | undefined;
    if (rng() < (100 - c.confiabilidade) * 0.004) {
      voltas = Math.round(voltas * rng() * 0.5);
      problema = 'Problema no carro';
    } else if (rng() < (seco ? 0.02 : 0.06)) {
      voltas = Math.round(voltas * (0.3 + rng() * 0.5));
      problema = 'Rodou e bateu';
    }
    // Volta rápida: programa de cada equipe (combustível e pneu) embaralha a tabela.
    const ideal = compostoIdeal(agua);
    const composto: Composto = ideal === 'seco' ? (rng() < 0.75 ? 'macio' : 'medio') : ideal;
    if (seco) pegarJogo(c.jogos, composto, Math.min(voltas, 8));
    const programa = Math.abs(gauss(rng)) * 0.45 + (composto === 'medio' ? 0.4 : 0);
    const acerto = perdaDeAcerto(ap, c.piloto, acertoBase[c.piloto.id] ?? 0.5);
    const melhorVolta = voltas >= 3 ? c.ritmo(agua) + acerto + 0.3 + programa : null;
    linhas.push({ pilotoId: c.piloto.id, melhorVolta, voltas, composto, problema });
    if (seco) {
      ap.voltasSecas[c.equipe.id] = (ap.voltasSecas[c.equipe.id] ?? 0) + voltas;
      ap.voltasPiloto[c.piloto.id] = (ap.voltasPiloto[c.piloto.id] ?? 0) + voltas;
    } else {
      // Na chuva aprende-se pouco sobre o acerto de seco.
      ap.voltasPiloto[c.piloto.id] = (ap.voltasPiloto[c.piloto.id] ?? 0) + voltas * 0.2;
    }
  }
  linhas.sort((a, b) => (a.melhorVolta ?? Infinity) - (b.melhorVolta ?? Infinity));
  return { nome, agua, linhas };
}

// Voltas de corrida (a sprint, por exemplo) também ensinam.
export function aprenderComCorrida(ap: Aprendizado, voltasPorPiloto: { pilotoId: string; equipeId: string; voltas: number }[]) {
  for (const v of voltasPorPiloto) {
    ap.voltasSecas[v.equipeId] = (ap.voltasSecas[v.equipeId] ?? 0) + v.voltas;
    ap.voltasPiloto[v.pilotoId] = (ap.voltasPiloto[v.pilotoId] ?? 0) + v.voltas;
  }
}


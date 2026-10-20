// Comportamento dos pneus. Cada fim de semana sorteia como cada composto reage àquela pista
// (temperatura, granulação, desgaste), então a ordem "macio > médio > duro" nem sempre vale.
// As estratégias são escolhidas a partir desse comportamento.
import type { Pista } from './types.ts';
import type { Rng } from './rng.ts';

export type Composto = 'macio' | 'medio' | 'duro' | 'chuva';
export type CompostoSeco = Exclude<Composto, 'chuva'>;
export const COMPOSTOS_SECOS: CompostoSeco[] = ['macio', 'medio', 'duro'];

export interface ComportamentoPneu {
  ritmo: number; // segundos a mais por volta que o macio novo de referência
  desgaste: number; // segundos perdidos por volta de uso
  vida: number; // voltas até o pneu "acabar" (depois disso a perda dispara)
  nota?: string; // o que aconteceu de diferente neste fim de semana
}

export type PneusDoFimDeSemana = Record<Composto, ComportamentoPneu>;

const BASE: Record<Composto, ComportamentoPneu> = {
  macio: { ritmo: 0, desgaste: 0.065, vida: 20 },
  medio: { ritmo: 0.45, desgaste: 0.04, vida: 32 },
  duro: { ritmo: 0.8, desgaste: 0.026, vida: 45 },
  chuva: { ritmo: 0, desgaste: 0.03, vida: 35 },
};

const CLIFF = 0.3; // segundos a mais por volta, por volta além da vida

function gauss(rng: Rng): number {
  const u = 1 - rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function sortearPneus(pista: Pista, rng: Rng): PneusDoFimDeSemana {
  const pneus = {} as PneusDoFimDeSemana;
  for (const k of Object.keys(BASE) as Composto[]) {
    const b = BASE[k];
    const fator = pista.perfil.desgaste * Math.exp(0.3 * gauss(rng));
    pneus[k] = { ritmo: b.ritmo + gauss(rng) * 0.12, desgaste: b.desgaste * fator, vida: b.vida / fator };
  }
  const { macio, medio, duro } = pneus;
  // Surpresas do fim de semana. Pistas de pouco desgaste esfriam o duro com mais facilidade.
  const sorteio = rng();
  if (sorteio < 0.2) {
    macio.desgaste *= 2.2;
    macio.vida *= 0.45;
    macio.nota = 'Granulação forte: dura muito pouco';
  } else if (sorteio < 0.32) {
    macio.desgaste *= 0.6;
    macio.vida *= 1.5;
    macio.nota = 'Aguenta bem: rápido e durável';
  }
  if (rng() < 0.18 + Math.max(0, 1 - pista.perfil.desgaste) * 0.4) {
    duro.ritmo += 0.9 + rng() * 0.7;
    duro.nota = 'Não entra na temperatura ideal';
  }
  if (rng() < 0.15) {
    medio.ritmo -= 0.25 + rng() * 0.15;
    medio.desgaste *= 0.85;
    medio.vida /= 0.85;
    medio.nota = 'Janela perfeita: o melhor pneu da pista';
  }
  return pneus;
}

// Tempo perdido pelo pneu ao longo de um stint de `voltas` voltas.
export function custoStint(p: ComportamentoPneu, voltas: number, fatorPiloto: number): number {
  const desgaste = p.desgaste * fatorPiloto;
  const vida = p.vida / fatorPiloto;
  let custo = voltas * p.ritmo + (desgaste * voltas * (voltas - 1)) / 2;
  const alem = voltas - Math.ceil(vida);
  if (alem > 0) custo += (CLIFF * alem * (alem + 1)) / 2;
  return custo;
}

// Perda do pneu numa volta específica do stint (idade = voltas já feitas com ele).
export function perdaNaVolta(p: ComportamentoPneu, idade: number, fatorPiloto: number): number {
  const vida = p.vida / fatorPiloto;
  return p.ritmo + p.desgaste * fatorPiloto * idade + Math.max(0, idade - vida) * CLIFF;
}

export interface Estrategia {
  compostos: Composto[];
  paradas: number[]; // volta ao fim da qual para
  custo: number; // segundos perdidos com pneus e boxes
}

// Melhores estratégias de 1 e 2 paradas no seco (pelo menos dois compostos diferentes).
export function melhoresEstrategias(pneus: PneusDoFimDeSemana, voltas: number, perdaBox: number, fatorPiloto: number): Estrategia[] {
  const custo = (k: Composto, n: number) => custoStint(pneus[k], n, fatorPiloto);
  const lista: Estrategia[] = [];
  const minimo = 5;
  for (const a of COMPOSTOS_SECOS) {
    for (const b of COMPOSTOS_SECOS) {
      if (a !== b) {
        let melhor: Estrategia | null = null;
        for (let p = minimo; p <= voltas - minimo; p++) {
          const c = custo(a, p) + custo(b, voltas - p) + perdaBox;
          if (!melhor || c < melhor.custo) melhor = { compostos: [a, b], paradas: [p], custo: c };
        }
        if (melhor) lista.push(melhor);
      }
      for (const c of COMPOSTOS_SECOS) {
        if (a === b && b === c) continue;
        let melhor: Estrategia | null = null;
        for (let p1 = minimo; p1 <= voltas - 2 * minimo; p1++) {
          const ca = custo(a, p1);
          for (let p2 = p1 + minimo; p2 <= voltas - minimo; p2++) {
            const t = ca + custo(b, p2 - p1) + custo(c, voltas - p2) + 2 * perdaBox;
            if (!melhor || t < melhor.custo) melhor = { compostos: [a, b, c], paradas: [p1, p2], custo: t };
          }
        }
        if (melhor) lista.push(melhor);
      }
    }
  }
  return lista.sort((x, y) => x.custo - y.custo);
}

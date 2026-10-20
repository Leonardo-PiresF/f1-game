// Classificação. Na F1 são três sessões eliminatórias (Q1 corta 6, Q2 corta mais 6, Q3 decide
// as 10 primeiras posições); na F2 é uma sessão única. A pista melhora a cada sessão.
import type { Categoria } from './types.ts';
import type { Rng } from './rng.ts';

export interface ConcorrenteQuali {
  id: string;
  ritmo: number; // tempo esperado de uma volta lançada, em segundos
  sigma: number; // variação entre tentativas
  chanceErro: number; // chance de errar numa tentativa
}

export interface LinhaClassificacao {
  pilotoId: string;
  posicao: number;
  q1: number | null;
  q2: number | null;
  q3: number | null;
  ultimaSessao: 'Q1' | 'Q2' | 'Q3' | null; // até onde chegou; null na F2 (sessão única)
}

const MELHORA_DA_PISTA = [0, 0.25, 0.4]; // segundos ganhos por sessão
const TENTATIVAS = 2;

function gauss(rng: Rng): number {
  const u = 1 - rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function sessao(concorrentes: ConcorrenteQuali[], indice: number, rng: Rng): Map<string, number> {
  const tempos = new Map<string, number>();
  for (const c of concorrentes) {
    let melhor = Infinity;
    for (let i = 0; i < TENTATIVAS; i++) {
      let t = c.ritmo - MELHORA_DA_PISTA[indice]! + gauss(rng) * c.sigma;
      if (rng() < c.chanceErro) t += 1 + rng() * 1.5; // erro ou volta atrapalhada
      melhor = Math.min(melhor, t);
    }
    tempos.set(c.id, melhor);
  }
  return tempos;
}

export function classificar(concorrentes: ConcorrenteQuali[], categoria: Categoria, rng: Rng): LinhaClassificacao[] {
  const ordenar = (lista: ConcorrenteQuali[], tempos: Map<string, number>) => [...lista].sort((a, b) => tempos.get(a.id)! - tempos.get(b.id)!);

  if (categoria === 'F2') {
    const tempos = sessao(concorrentes, 0, rng);
    return ordenar(concorrentes, tempos).map((c, i) => ({ pilotoId: c.id, posicao: i + 1, q1: tempos.get(c.id)!, q2: null, q3: null, ultimaSessao: null }));
  }

  const n = concorrentes.length;
  const passamQ1 = Math.max(10, n - 6);
  const t1 = sessao(concorrentes, 0, rng);
  const ordemQ1 = ordenar(concorrentes, t1);
  const q2 = ordemQ1.slice(0, passamQ1);
  const t2 = sessao(q2, 1, rng);
  const ordemQ2 = ordenar(q2, t2);
  const q3 = ordemQ2.slice(0, 10);
  const t3 = sessao(q3, 2, rng);
  const ordemQ3 = ordenar(q3, t3);

  const grid = [...ordemQ3, ...ordemQ2.slice(10), ...ordemQ1.slice(passamQ1)];
  return grid.map((c, i) => ({
    pilotoId: c.id,
    posicao: i + 1,
    q1: t1.get(c.id)!,
    q2: t2.get(c.id) ?? null,
    q3: t3.get(c.id) ?? null,
    ultimaSessao: i < 10 ? 'Q3' : i < passamQ1 ? 'Q2' : 'Q1',
  }));
}

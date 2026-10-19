// Gerador pseudoaleatório com semente (mulberry32). A simulação usa sempre
// este gerador, nunca Math.random, para que o mesmo save dê o mesmo resultado.

export type Rng = () => number;

export function criarRng(semente: number): Rng {
  let estado = semente >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function inteiroEntre(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

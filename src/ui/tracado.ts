// Geometria do desenho da pista: suaviza os pontos de controle (Catmull-Rom fechado)
// e converte "fração da volta" em coordenada na tela.

export type Ponto = [number, number];

export interface Tracado {
  pontos: Ponto[];
  acumulado: number[]; // comprimento até cada ponto
  total: number;
  caminho: string; // atributo d do <path>
}

export function criarTracado(controle: Ponto[], amostrasPorTrecho = 16): Tracado {
  const n = controle.length;
  const pontos: Ponto[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = controle[(i - 1 + n) % n]!;
    const p1 = controle[i]!;
    const p2 = controle[(i + 1) % n]!;
    const p3 = controle[(i + 2) % n]!;
    for (let k = 0; k < amostrasPorTrecho; k++) {
      const t = k / amostrasPorTrecho;
      const t2 = t * t;
      const t3 = t2 * t;
      const coord = (j: 0 | 1) =>
        0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
      pontos.push([coord(0), coord(1)]);
    }
  }
  pontos.push(pontos[0]!);
  const acumulado = [0];
  for (let i = 1; i < pontos.length; i++) {
    const [ax, ay] = pontos[i - 1]!;
    const [bx, by] = pontos[i]!;
    acumulado.push(acumulado[i - 1]! + Math.hypot(bx - ax, by - ay));
  }
  const caminho = pontos.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ') + ' Z';
  return { pontos, acumulado, total: acumulado[acumulado.length - 1]!, caminho };
}

// Ponto da pista numa fração da volta (0 = linha de chegada). Aceita qualquer número.
export function pontoNaVolta(tracado: Tracado, fracao: number): Ponto {
  const f = ((fracao % 1) + 1) % 1;
  const alvo = f * tracado.total;
  const { acumulado, pontos } = tracado;
  let lo = 0;
  let hi = acumulado.length - 1;
  while (hi - lo > 1) {
    const meio = (lo + hi) >> 1;
    if (acumulado[meio]! <= alvo) lo = meio;
    else hi = meio;
  }
  const trecho = acumulado[hi]! - acumulado[lo]! || 1;
  const t = (alvo - acumulado[lo]!) / trecho;
  const [ax, ay] = pontos[lo]!;
  const [bx, by] = pontos[hi]!;
  return [ax + (bx - ax) * t, ay + (by - ay) * t];
}

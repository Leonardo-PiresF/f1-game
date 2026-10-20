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

function dentro(pontos: Ponto[], [x, y]: Ponto): boolean {
  let d = false;
  for (let i = 0, j = pontos.length - 1; i < pontos.length; j = i++) {
    const [xi, yi] = pontos[i]!;
    const [xj, yj] = pontos[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) d = !d;
  }
  return d;
}

// Ponto deslocado para o lado da pista, perpendicular ao sentido da volta. Valores positivos
// vão para o lado de fora do traçado na reta dos boxes.
export function ladoDeFora(tracado: Tracado): 1 | -1 {
  const [x, y] = pontoNaVolta(tracado, 0);
  const [nx, ny] = normal(tracado, 0);
  return dentro(tracado.pontos, [x + nx * 2, y + ny * 2]) ? -1 : 1;
}

function normal(tracado: Tracado, fracao: number): Ponto {
  const [ax, ay] = pontoNaVolta(tracado, fracao - 0.002);
  const [bx, by] = pontoNaVolta(tracado, fracao + 0.002);
  const tam = Math.hypot(bx - ax, by - ay) || 1;
  return [-(by - ay) / tam, (bx - ax) / tam];
}

export function pontoDeslocado(tracado: Tracado, fracao: number, deslocamento: number): Ponto {
  const [x, y] = pontoNaVolta(tracado, fracao);
  const [nx, ny] = normal(tracado, fracao);
  return [x + nx * deslocamento, y + ny * deslocamento];
}

export interface Box {
  entrada: number;
  saida: number;
}

const AFASTAMENTO_BOX = 4;

// Comprimento do pit lane em fração da volta (da entrada, passando pela linha, até a saída).
const extensaoBox = (box: Box) => (box.saida - box.entrada + 1) % 1;

// Ponto no pit lane: sai da pista na entrada, corre paralelo e volta na saída.
export function pontoNoBox(tracado: Tracado, box: Box, fracao: number, lado: 1 | -1): Ponto {
  const ext = extensaoBox(box);
  const andado = (((fracao - box.entrada) % 1) + 1) % 1;
  const rampa = Math.min(ext * 0.2, 0.012);
  const peso = Math.max(0, Math.min(1, andado / rampa, (ext - andado) / rampa));
  return pontoDeslocado(tracado, fracao, lado * AFASTAMENTO_BOX * peso);
}

export function caminhoDoBox(tracado: Tracado, box: Box, lado: 1 | -1): string {
  const ext = extensaoBox(box);
  const passos = 60;
  const pontos: Ponto[] = [];
  for (let i = 0; i <= passos; i++) pontos.push(pontoNoBox(tracado, box, box.entrada + (ext * i) / passos, lado));
  return pontos.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
}

// Trecho da pista entre duas frações (pode passar pela linha de chegada).
export function caminhoDoTrecho(tracado: Tracado, inicio: number, fim: number): string {
  const ext = (fim - inicio + 1) % 1;
  const passos = Math.max(4, Math.ceil(ext * 300));
  const pontos: Ponto[] = [];
  for (let i = 0; i <= passos; i++) pontos.push(pontoNaVolta(tracado, inicio + (ext * i) / passos));
  return pontos.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
}

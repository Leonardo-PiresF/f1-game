// Geometria dos traçados: projeção de lon/lat para metros, reamostragem por distância,
// normalização para a tela e detecção das retas usadas como zonas de ultrapassagem.

export type Ponto = [number, number];

// Projeção equirretangular em torno do centro do traçado; y cresce para o sul (como na tela).
export function projetar(lonlat: [number, number][]): Ponto[] {
  const lat0 = lonlat.reduce((s, p) => s + p[1], 0) / lonlat.length;
  const kx = 111320 * Math.cos((lat0 * Math.PI) / 180);
  const ky = 110540;
  const pontos = lonlat.map(([lon, lat]): Ponto => [lon * kx, -lat * ky]);
  // Garante que o traçado é fechado sem repetir o primeiro ponto.
  const [a, b] = [pontos[0]!, pontos[pontos.length - 1]!];
  if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1) pontos.pop();
  return pontos;
}

// Pontos igualmente espaçados ao longo da volta, começando na linha de chegada.
export function reamostrar(pontos: Ponto[], quantidade: number): { pontos: Ponto[]; comprimento: number } {
  const fechado = [...pontos, pontos[0]!];
  const acumulado = [0];
  for (let i = 1; i < fechado.length; i++) {
    acumulado.push(acumulado[i - 1]! + Math.hypot(fechado[i]![0] - fechado[i - 1]![0], fechado[i]![1] - fechado[i - 1]![1]));
  }
  const comprimento = acumulado[acumulado.length - 1]!;
  const saida: Ponto[] = [];
  let j = 0;
  for (let k = 0; k < quantidade; k++) {
    const alvo = (k / quantidade) * comprimento;
    while (acumulado[j + 1]! < alvo) j++;
    const t = (alvo - acumulado[j]!) / (acumulado[j + 1]! - acumulado[j]! || 1);
    const [ax, ay] = fechado[j]!;
    const [bx, by] = fechado[j + 1]!;
    saida.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
  }
  return { pontos: saida, comprimento };
}

// Encaixa o traçado numa caixa de 0 a 100 no lado maior, mantendo a proporção.
export function normalizarTracado(pontos: Ponto[]): Ponto[] {
  const xs = pontos.map((p) => p[0]);
  const ys = pontos.map((p) => p[1]);
  const [x0, y0] = [Math.min(...xs), Math.min(...ys)];
  const escala = 100 / Math.max(Math.max(...xs) - x0, Math.max(...ys) - y0);
  return pontos.map(([x, y]): Ponto => [Math.round((x - x0) * escala * 100) / 100, Math.round((y - y0) * escala * 100) / 100]);
}

export interface Zona {
  inicio: number; // fração da volta
  fim: number;
}

// Retas: trechos longos em que a direção quase não muda. As três maiores viram zonas,
// começando um pouco depois da saída da curva e terminando antes da freada.
export function detectarZonas(pontos: Ponto[], comprimento: number, maximo = 3): Zona[] {
  const n = pontos.length;
  const passo = comprimento / n;
  const rumo = (i: number) => {
    const a = pontos[i % n]!;
    const b = pontos[(i + 1) % n]!;
    return Math.atan2(b[1] - a[1], b[0] - a[0]);
  };
  const reto = Array.from({ length: n }, (_, i) => {
    let d = Math.abs(rumo(i + 1) - rumo(i));
    if (d > Math.PI) d = 2 * Math.PI - d;
    return d < (2.5 * Math.PI) / 180;
  });
  // Começa a varrer num ponto de curva para não partir uma reta no meio.
  const partida = reto.indexOf(false);
  if (partida < 0) return [];
  const trechos: { inicio: number; tamanho: number }[] = [];
  let atual: { inicio: number; tamanho: number } | null = null;
  for (let k = 1; k <= n; k++) {
    const i = (partida + k) % n;
    if (reto[i]) {
      if (!atual) atual = { inicio: i, tamanho: 0 };
      atual.tamanho++;
    } else if (atual) {
      trechos.push(atual);
      atual = null;
    }
  }
  if (atual) trechos.push(atual);
  const minimo = 400 / passo;
  return trechos
    .filter((t) => t.tamanho >= minimo)
    .sort((a, b) => b.tamanho - a.tamanho)
    .slice(0, maximo)
    .map((t) => {
      const inicio = ((t.inicio + 60 / passo) % n) / n;
      const fim = ((t.inicio + t.tamanho - 100 / passo) % n) / n;
      return { inicio: Math.round(inicio * 1000) / 1000, fim: Math.round(fim * 1000) / 1000 };
    })
    .sort((a, b) => a.inicio - b.inicio);
}

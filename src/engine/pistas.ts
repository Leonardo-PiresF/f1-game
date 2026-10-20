// Pistas disponíveis para corrida. O traçado é um desenho aproximado feito à mão
// (pontos de controle suavizados na tela), não uma réplica exata do circuito.
import type { Pista } from './types';

export const PISTAS: Pista[] = [
  {
    id: 'interlagos',
    nome: 'Interlagos',
    pais: 'Brasil',
    perfil: { velocidade: 0.6, curvas: 0.55, ultrapassagem: 0.65, desgaste: 1, chanceChuva: 0.3 },
    voltas: 71,
    tempoVolta: 73,
    perdaBox: 21,
    tracado: [
      [62, 14], [48, 12], [38, 14], [34, 20], [38, 25], [33, 31], [26, 42], [18, 58], [14, 68], [18, 74],
      [28, 72], [40, 66], [48, 58], [46, 50], [52, 44], [60, 46], [62, 54], [56, 60], [58, 68], [66, 66],
      [72, 58], [78, 66], [80, 76], [88, 72], [92, 58], [90, 40], [84, 26], [74, 16],
    ],
  },
  {
    id: 'monza',
    nome: 'Monza',
    pais: 'Itália',
    perfil: { velocidade: 0.9, curvas: 0.3, ultrapassagem: 0.6, desgaste: 0.85, chanceChuva: 0.15 },
    voltas: 53,
    tempoVolta: 83,
    perdaBox: 24,
    tracado: [
      [30, 85], [55, 86], [66, 86], [69, 83], [72, 86], [80, 84], [88, 74], [90, 60], [88, 48], [91, 44],
      [88, 40], [84, 30], [80, 22], [72, 20], [60, 24], [46, 30], [36, 34], [33, 40], [30, 38], [26, 44],
      [20, 56], [14, 68], [13, 80], [18, 86],
    ],
  },
  {
    id: 'silverstone',
    nome: 'Silverstone',
    pais: 'Reino Unido',
    perfil: { velocidade: 0.65, curvas: 0.75, ultrapassagem: 0.5, desgaste: 1.25, chanceChuva: 0.35 },
    voltas: 52,
    tempoVolta: 91,
    perdaBox: 20,
    tracado: [
      [40, 82], [55, 84], [62, 80], [66, 72], [60, 66], [64, 60], [72, 52], [80, 42], [82, 34], [76, 30],
      [70, 32], [62, 28], [56, 22], [48, 14], [36, 12], [30, 18], [24, 16], [20, 22], [14, 34], [10, 50],
      [12, 60], [18, 64], [22, 72], [20, 78], [28, 82],
    ],
  },
];

export function buscarPista(id: string): Pista {
  const pista = PISTAS.find((p) => p.id === id);
  if (!pista) throw new Error(`Pista desconhecida: ${id}`);
  return pista;
}

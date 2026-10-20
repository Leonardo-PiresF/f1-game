// Cores das equipes no mapa e na torre. Só cores, sem logos.
import type { Composto } from '../engine/corrida';

const CORES: Record<string, string> = {
  mercedes: '#27f4d2',
  ferrari: '#e8002d',
  mclaren: '#ff8000',
  red_bull: '#3671c6',
  rb: '#6692ff',
  alpine: '#ff87bc',
  haas: '#b6babd',
  audi: '#a3a3a3',
  williams: '#64c4ff',
  aston_martin: '#229971',
  cadillac: '#c8a951',
  invicta_racing: '#e8b4f8',
  hitech: '#d0d0d0',
  campos_racing: '#ff6b35',
  dams_lucas_oil: '#2b7fff',
  mp_motorsport: '#ff4fa3',
  prema_racing: '#e10600',
  rodin_motorsport: '#00b2a9',
  art_grand_prix: '#9aa0a6',
  aix_racing: '#7a4dff',
  van_amersfoort_racing: '#1fbf4a',
  trident: '#f2c200',
};

export const corEquipe = (id: string) => CORES[id] ?? '#888888';

// Pintura dos carros em pixel art: cor principal (a da equipe), uma secundária e um detalhe.
// São só combinações de cores inspiradas nos carros, sem patrocinadores nem logos.
export interface Pintura {
  principal: string;
  secundaria: string;
  detalhe: string;
}

const PINTURAS: Record<string, Omit<Pintura, 'principal'>> = {
  mercedes: { secundaria: '#1b1d22', detalhe: '#c7ccd1' },
  ferrari: { secundaria: '#9b0019', detalhe: '#f5f5f5' },
  mclaren: { secundaria: '#1c2230', detalhe: '#47c7fc' },
  red_bull: { secundaria: '#1b2a4a', detalhe: '#e8002d' },
  rb: { secundaria: '#f2f2f2', detalhe: '#e8002d' },
  alpine: { secundaria: '#0a5fbf', detalhe: '#f2f2f2' },
  haas: { secundaria: '#1b1d22', detalhe: '#e8002d' },
  audi: { secundaria: '#2c2f33', detalhe: '#e8002d' },
  williams: { secundaria: '#0b2a5b', detalhe: '#f2f2f2' },
  aston_martin: { secundaria: '#0f4d3a', detalhe: '#cedc00' },
  cadillac: { secundaria: '#1b1d22', detalhe: '#f2f2f2' },
};

export function pinturaEquipe(id: string): Pintura {
  const principal = corEquipe(id);
  const p = PINTURAS[id];
  return p ? { principal, ...p } : { principal, secundaria: escurecer(principal, 0.45), detalhe: '#f2f2f2' };
}

// Mistura uma cor hexadecimal com preto (fator > 0) ou com branco (fator < 0).
export function escurecer(hex: string, fator: number): string {
  const n = parseInt(hex.slice(1), 16);
  const canais = [n >> 16, (n >> 8) & 255, n & 255].map((c) => Math.round(fator >= 0 ? c * (1 - fator) : c + (255 - c) * -fator));
  return `#${canais.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

export const PNEUS: Record<Composto, { sigla: string; nome: string; cor: string }> = {
  macio: { sigla: 'S', nome: 'Macio', cor: '#e10600' },
  medio: { sigla: 'M', nome: 'Médio', cor: '#f5c400' },
  duro: { sigla: 'H', nome: 'Duro', cor: '#f0f0f0' },
  intermediario: { sigla: 'I', nome: 'Intermediário', cor: '#43b02a' },
  chuva: { sigla: 'W', nome: 'Chuva', cor: '#2b7fff' },
};

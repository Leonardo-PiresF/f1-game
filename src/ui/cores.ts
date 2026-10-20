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

export const PNEUS: Record<Composto, { sigla: string; nome: string; cor: string }> = {
  macio: { sigla: 'S', nome: 'Macio', cor: '#e10600' },
  medio: { sigla: 'M', nome: 'Médio', cor: '#f5c400' },
  duro: { sigla: 'H', nome: 'Duro', cor: '#f0f0f0' },
  chuva: { sigla: 'W', nome: 'Chuva', cor: '#2b7fff' },
};

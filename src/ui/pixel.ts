// Pixel art feito em código: cada desenho é uma grade de cores, sem imagens externas.
// Os carros usam a pintura da equipe; os retratos são caricaturas montadas por camadas
// (pele, cabelo, barba, macacão), sem fotos.
import { escurecer, pinturaEquipe } from './cores';

export type Grade = (string | null)[][];

export const CONTORNO = '#0d0f13';

// Converte um desenho em texto numa grade, trocando cada letra pela sua cor ('.' é vazio).
export function desenhar(linhas: string[], cores: Record<string, string>): Grade {
  return linhas.map((l) => [...l].map((c) => (c === '.' ? null : (cores[c] ?? null))));
}

// Acrescenta uma borda de 1 pixel em volta do que está pintado (aumenta a grade em 1 de cada lado).
export function contornar(grade: Grade, cor = CONTORNO): Grade {
  const altura = grade.length + 2;
  const largura = (grade[0]?.length ?? 0) + 2;
  const em = (x: number, y: number) => grade[y - 1]?.[x - 1] ?? null;
  const nova: Grade = [];
  for (let y = 0; y < altura; y++) {
    const linha: (string | null)[] = [];
    for (let x = 0; x < largura; x++) {
      const c = em(x, y);
      if (c) linha.push(c);
      else linha.push(em(x - 1, y) || em(x + 1, y) || em(x, y - 1) || em(x, y + 1) ? cor : null);
    }
    nova.push(linha);
  }
  return nova;
}

export interface Retangulo {
  x: number;
  y: number;
  w: number;
  cor: string;
}

// Junta pixels vizinhos da mesma cor numa linha, para o SVG ficar leve.
export function retangulos(grade: Grade): Retangulo[] {
  const lista: Retangulo[] = [];
  grade.forEach((linha, y) => {
    let x = 0;
    while (x < linha.length) {
      const cor = linha[x];
      if (!cor) {
        x++;
        continue;
      }
      let w = 1;
      while (linha[x + w] === cor) w++;
      lista.push({ x, y, w, cor });
      x += w;
    }
  });
  return lista;
}

function hash(texto: string): number {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

// ---------- Carro visto de cima (bico para cima) ----------

const CARRO = [
  'ASSSSSSSA',
  '.SSSSSSS.',
  '....P....',
  '....P....',
  'KK..P..KK',
  'KK.PPP.KK',
  'KK.PDP.KK',
  'KK.PPP.KK',
  '...PPP...',
  '..PPHPP..',
  '.PPHCHPP.',
  '.PPPTPPP.',
  '.DPPPPPD.',
  '.SPPPPPS.',
  '.SPPPPPS.',
  '..SPPPS..',
  'KK.PPP.KK',
  'KK.SSS.KK',
  'KK.SSS.KK',
  'KK..S..KK',
  '.DDDDDDD.',
  '.SSSSSSS.',
];

export const TAMANHO_CARRO = { largura: CARRO[0]!.length + 2, altura: CARRO.length + 2 };

// O segundo piloto de cada equipe leva a câmera de bordo (T-cam) amarela, como na F1 real.
export function spriteCarro(equipeId: string, capacete: string, segundoPiloto: boolean): Grade {
  const p = pinturaEquipe(equipeId);
  return contornar(
    desenhar(CARRO, {
      P: p.principal,
      S: p.secundaria,
      D: p.detalhe,
      A: p.detalhe,
      K: '#17191e',
      H: '#2b2f36',
      C: capacete,
      T: segundoPiloto ? '#f5c400' : '#17191e',
    }),
  );
}

// ---------- Retrato do piloto ----------

export type Cabelo = 'raspado' | 'curto' | 'topete' | 'ondulado' | 'longo' | 'trancas' | 'careca';
export type Barba = 'nenhuma' | 'rala' | 'cheia';

export interface Aparencia {
  pele: number; // 0 (mais clara) a 5 (mais escura)
  cabelo: Cabelo;
  corCabelo: string;
  barba: Barba;
  capacete: string; // cor principal do capacete (desenho pessoal, genérico)
}

export const PELES = ['#f3cfae', '#e6b893', '#cf9a6e', '#ae774e', '#83532f', '#5e3a22'];
export const CABELOS = {
  preto: '#1d1a19',
  castanhoEscuro: '#3b2619',
  castanho: '#5e3d24',
  castanhoClaro: '#8a5f3a',
  loiro: '#c9a15a',
  ruivo: '#9c4a22',
};
const CAPACETES = ['#f2f2f2', '#f5c400', '#e10600', '#2b7fff', '#ff8000', '#7a4dff', '#1fbf4a', '#ff4fa3', '#27f4d2', '#1b1d22', '#c8a951', '#64c4ff'];

// Caricaturas dos pilotos da F1 2026: só traços gerais (tom de pele, cabelo, barba).
const APARENCIAS: Record<string, Partial<Aparencia>> = {
  antonelli: { pele: 1, cabelo: 'topete', corCabelo: CABELOS.castanhoEscuro, barba: 'nenhuma' },
  russell: { pele: 0, cabelo: 'curto', corCabelo: CABELOS.castanho, barba: 'nenhuma' },
  hamilton: { pele: 4, cabelo: 'trancas', corCabelo: CABELOS.preto, barba: 'rala' },
  max_verstappen: { pele: 0, cabelo: 'curto', corCabelo: CABELOS.castanhoClaro, barba: 'rala' },
  leclerc: { pele: 0, cabelo: 'ondulado', corCabelo: CABELOS.castanhoEscuro, barba: 'nenhuma' },
  norris: { pele: 0, cabelo: 'ondulado', corCabelo: CABELOS.castanho, barba: 'rala' },
  piastri: { pele: 0, cabelo: 'curto', corCabelo: CABELOS.castanhoEscuro, barba: 'nenhuma' },
  hadjar: { pele: 2, cabelo: 'curto', corCabelo: CABELOS.preto, barba: 'nenhuma' },
  lawson: { pele: 0, cabelo: 'topete', corCabelo: CABELOS.castanhoEscuro, barba: 'nenhuma' },
  gasly: { pele: 1, cabelo: 'curto', corCabelo: CABELOS.castanhoEscuro, barba: 'rala' },
  arvid_lindblad: { pele: 2, cabelo: 'curto', corCabelo: CABELOS.preto, barba: 'nenhuma' },
  colapinto: { pele: 1, cabelo: 'ondulado', corCabelo: CABELOS.castanhoEscuro, barba: 'nenhuma' },
  bearman: { pele: 0, cabelo: 'curto', corCabelo: CABELOS.castanhoClaro, barba: 'nenhuma' },
  hulkenberg: { pele: 0, cabelo: 'curto', corCabelo: CABELOS.loiro, barba: 'rala' },
  bortoleto: { pele: 1, cabelo: 'curto', corCabelo: CABELOS.castanhoEscuro, barba: 'nenhuma' },
  ocon: { pele: 0, cabelo: 'raspado', corCabelo: CABELOS.castanhoEscuro, barba: 'nenhuma' },
  alonso: { pele: 1, cabelo: 'curto', corCabelo: CABELOS.preto, barba: 'rala' },
  sainz: { pele: 1, cabelo: 'ondulado', corCabelo: CABELOS.castanhoEscuro, barba: 'rala' },
  albon: { pele: 2, cabelo: 'curto', corCabelo: CABELOS.preto, barba: 'nenhuma' },
  tsunoda: { pele: 1, cabelo: 'curto', corCabelo: CABELOS.preto, barba: 'nenhuma' },
  stroll: { pele: 0, cabelo: 'curto', corCabelo: CABELOS.castanho, barba: 'nenhuma' },
  bottas: { pele: 0, cabelo: 'longo', corCabelo: CABELOS.loiro, barba: 'rala' },
  perez: { pele: 2, cabelo: 'curto', corCabelo: CABELOS.preto, barba: 'rala' },
};

// Tom de pele mais provável por nacionalidade, para os pilotos sem caricatura própria.
const PELE_POR_PAIS: Record<string, number[]> = {
  IND: [3, 3],
  THA: [2, 2],
  JPN: [1, 1],
  MEX: [2, 2],
  COL: [1, 2],
  BRA: [0, 2],
  PAR: [1, 2],
  ARG: [0, 1],
  ESP: [0, 1],
  ITA: [0, 1],
  USA: [0, 1],
};

export function aparenciaDe(pilotoId: string, nacionalidade = ''): Aparencia {
  const h = hash(pilotoId);
  const [min = 0, max = 0] = PELE_POR_PAIS[nacionalidade] ?? [];
  const estilos: Cabelo[] = ['curto', 'curto', 'topete', 'ondulado', 'raspado', 'curto'];
  const cores = [CABELOS.castanhoEscuro, CABELOS.castanho, CABELOS.preto, CABELOS.castanhoClaro, CABELOS.loiro, CABELOS.castanhoEscuro];
  const base: Aparencia = {
    pele: min + (h % (max - min + 1)),
    cabelo: estilos[(h >>> 3) % estilos.length]!,
    corCabelo: max >= 2 ? CABELOS.preto : cores[(h >>> 7) % cores.length]!,
    barba: (h >>> 11) % 5 === 0 ? 'rala' : 'nenhuma',
    capacete: CAPACETES[(h >>> 15) % CAPACETES.length]!,
  };
  return { ...base, ...APARENCIAS[pilotoId] };
}

export const LADO_RETRATO = 18;

// Monta o busto 16x16 por camadas e depois põe o contorno (fica 18x18).
export function spriteRetrato(a: Aparencia, equipeId: string): Grade {
  const n = 16;
  const g: Grade = Array.from({ length: n }, () => Array<string | null>(n).fill(null));
  const pintar = (x: number, y: number, cor: string) => {
    if (x >= 0 && x < n && y >= 0 && y < n) g[y]![x] = cor;
  };
  const faixa = (y: number, x0: number, x1: number, cor: string) => {
    for (let x = x0; x <= x1; x++) pintar(x, y, cor);
  };
  const pele = PELES[a.pele] ?? PELES[0]!;
  const sombra = escurecer(pele, 0.18);
  const cabelo = a.corCabelo;
  const brilho = escurecer(cabelo, -0.25);
  const p = pinturaEquipe(equipeId);

  // Cabelo atrás da cabeça (longo e tranças caem até os ombros).
  if (a.cabelo === 'longo' || a.cabelo === 'trancas') {
    for (let y = 4; y <= (a.cabelo === 'trancas' ? 12 : 11); y++) {
      faixa(y, 3, 4, cabelo);
      faixa(y, 11, 12, cabelo);
    }
  }

  // Macacão com gola e zíper.
  faixa(13, 2, 13, p.principal);
  faixa(14, 1, 14, p.principal);
  faixa(15, 1, 14, p.principal);
  faixa(13, 5, 10, p.secundaria);
  faixa(14, 6, 9, p.secundaria);
  pintar(7, 14, p.detalhe);
  pintar(8, 15, p.detalhe);
  pintar(3, 14, p.detalhe);
  pintar(12, 14, p.detalhe);

  // Pescoço, rosto e orelhas.
  faixa(11, 6, 9, sombra);
  faixa(12, 6, 9, sombra);
  faixa(3, 5, 10, pele);
  for (let y = 4; y <= 10; y++) faixa(y, 4, 11, pele);
  faixa(11, 5, 10, pele);
  for (let y = 4; y <= 10; y++) pintar(11, y, sombra);
  faixa(11, 10, 10, sombra);
  for (let y = 6; y <= 8; y++) {
    pintar(3, y, pele);
    pintar(12, y, sombra);
  }

  // Olhos, nariz e boca.
  faixa(6, 5, 6, cabelo);
  faixa(6, 9, 10, cabelo);
  pintar(6, 7, '#f7f7f7');
  pintar(5, 7, '#1a1a1a');
  pintar(9, 7, '#f7f7f7');
  pintar(10, 7, '#1a1a1a');
  pintar(8, 8, sombra);
  pintar(8, 9, sombra);
  faixa(10, 6, 9, escurecer(pele, 0.35));

  // Barba.
  if (a.barba !== 'nenhuma') {
    const cor = a.barba === 'cheia' ? cabelo : escurecer(pele, 0.3);
    for (let y = 8; y <= 10; y++) {
      pintar(4, y, cor);
      pintar(11, y, cor);
    }
    faixa(11, 5, 10, cor);
    faixa(10, 5, 5, cor);
    faixa(10, 10, 10, cor);
    if (a.barba === 'cheia') faixa(9, 6, 9, cor);
    else faixa(9, 6, 9, escurecer(pele, 0.12));
    faixa(10, 6, 9, escurecer(pele, 0.45));
  }

  // Cabelo por cima.
  switch (a.cabelo) {
    case 'careca':
      pintar(6, 3, escurecer(pele, -0.2));
      break;
    case 'raspado':
      faixa(2, 5, 10, cabelo);
      faixa(3, 4, 11, escurecer(cabelo, -0.35));
      break;
    case 'curto':
      faixa(1, 5, 10, cabelo);
      faixa(2, 4, 11, cabelo);
      faixa(3, 4, 11, cabelo);
      pintar(4, 4, cabelo);
      pintar(11, 4, cabelo);
      pintar(4, 5, cabelo);
      pintar(11, 5, cabelo);
      faixa(1, 6, 8, brilho);
      break;
    case 'topete':
      faixa(0, 6, 10, cabelo);
      faixa(1, 4, 11, cabelo);
      faixa(2, 4, 11, cabelo);
      faixa(3, 4, 6, cabelo);
      faixa(3, 9, 11, cabelo);
      pintar(4, 4, cabelo);
      pintar(11, 4, cabelo);
      pintar(4, 5, cabelo);
      pintar(11, 5, cabelo);
      faixa(0, 7, 9, brilho);
      break;
    case 'ondulado':
      faixa(0, 5, 10, cabelo);
      faixa(1, 3, 12, cabelo);
      faixa(2, 3, 12, cabelo);
      faixa(3, 3, 12, cabelo);
      faixa(4, 3, 5, cabelo);
      faixa(4, 8, 12, cabelo);
      pintar(3, 5, cabelo);
      pintar(12, 5, cabelo);
      pintar(11, 5, cabelo);
      faixa(1, 5, 7, brilho);
      pintar(10, 2, brilho);
      break;
    case 'longo':
      faixa(1, 5, 10, cabelo);
      faixa(2, 4, 11, cabelo);
      faixa(3, 4, 11, cabelo);
      pintar(4, 4, cabelo);
      pintar(11, 4, cabelo);
      faixa(1, 6, 8, brilho);
      break;
    case 'trancas':
      faixa(1, 5, 10, cabelo);
      faixa(2, 4, 11, cabelo);
      faixa(3, 4, 11, cabelo);
      for (let x = 4; x <= 11; x += 2) pintar(x, 2, brilho);
      for (let y = 5; y <= 12; y += 2) {
        pintar(3, y, brilho);
        pintar(12, y, brilho);
      }
      break;
  }

  return contornar(g);
}

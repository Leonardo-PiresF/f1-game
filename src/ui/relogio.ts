// Onde cada carro está num instante da corrida, a partir dos tempos de volta já simulados.
// Cada carro vira uma linha do tempo de trechos (andando ou parado), o que permite mostrar o
// pit lane e calcular a diferença entre os carros em qualquer ponto da pista, não só na linha.
import type { Corrida } from '../engine/corrida';
import type { Pista } from '../engine/types';

interface Trecho {
  t0: number;
  t1: number;
  d0: number; // distância em voltas
  d1: number;
}

export interface LinhaDoTempo {
  trechos: Trecho[];
  fim: 'chegou' | 'abandonou';
}

const BOX_PADRAO = { entrada: 0.975, saida: 0.03 };

export function montarLinhasDoTempo(corrida: Corrida, pista: Pista): Map<string, LinhaDoTempo> {
  const box = pista.box ?? BOX_PADRAO;
  const linhas = new Map<string, LinhaDoTempo>();
  for (const [id, tempos] of Object.entries(corrida.tempos)) {
    const trechos: Trecho[] = [];
    const paradas = new Map((corrida.paradas[id] ?? []).map((p) => [p.volta, p]));
    // Antes da largada o carro está parado no grid, um pouco atrás da linha.
    const primeira = (tempos[1] ?? tempos[0]! + corrida.tempoVolta) - tempos[0]!;
    trechos.push({ t0: -Infinity, t1: 0, d0: -tempos[0]! / primeira, d1: -tempos[0]! / primeira });
    trechos.push({ t0: 0, t1: tempos[0]!, d0: -tempos[0]! / primeira, d1: 0 });
    for (let l = 1; l < tempos.length; l++) {
      const t0 = tempos[l - 1]!;
      const t1 = tempos[l]!;
      const p = paradas.get(l);
      if (!p) {
        trechos.push({ t0, t1, d0: l - 1, d1: l });
        continue;
      }
      // Volta com parada: anda normal até a entrada do box, depois o pit lane e o carro parado.
      const normal = Math.max(1, t1 - t0 - p.perda);
      const tEntrada = t0 + normal * box.entrada;
      const tParada = t1 - p.parada;
      trechos.push({ t0, t1: tEntrada, d0: l - 1, d1: l - 1 + box.entrada });
      trechos.push({ t0: tEntrada, t1: tParada, d0: l - 1 + box.entrada, d1: l });
      trechos.push({ t0: tParada, t1, d0: l, d1: l });
    }
    const ultimo = tempos[tempos.length - 1]!;
    const ultimaVolta = tempos.length - 1;
    const abandono = corrida.abandonos[id];
    if (abandono) {
      trechos.push({ t0: ultimo, t1: abandono.tempo, d0: ultimaVolta, d1: abandono.distancia });
      trechos.push({ t0: abandono.tempo, t1: Infinity, d0: abandono.distancia, d1: abandono.distancia });
    } else {
      trechos.push({ t0: ultimo, t1: Infinity, d0: ultimaVolta, d1: ultimaVolta });
    }
    linhas.set(id, { trechos, fim: abandono ? 'abandonou' : 'chegou' });
  }
  return linhas;
}

function distanciaEm(linha: LinhaDoTempo, t: number): number {
  const { trechos } = linha;
  let lo = 0;
  let hi = trechos.length - 1;
  while (lo < hi) {
    const meio = (lo + hi + 1) >> 1;
    if (trechos[meio]!.t0 <= t) lo = meio;
    else hi = meio - 1;
  }
  const s = trechos[lo]!;
  if (!Number.isFinite(s.t1) || !Number.isFinite(s.t0) || s.t1 === s.t0) return s.d0;
  return s.d0 + ((t - s.t0) / (s.t1 - s.t0)) * (s.d1 - s.d0);
}

// Instante em que o carro passou por uma distância (o primeiro, se ficou parado nela).
export function tempoNaDistancia(linha: LinhaDoTempo, d: number): number | null {
  for (const s of linha.trechos) {
    if (d >= s.d0 && d <= s.d1 && Number.isFinite(s.t0)) {
      if (s.d1 === s.d0) return s.t0;
      return s.t0 + ((d - s.d0) / (s.d1 - s.d0)) * (s.t1 - s.t0);
    }
  }
  return null;
}

export interface PosicaoNoTempo {
  pilotoId: string;
  distancia: number; // voltas percorridas desde a largada (fração incluída)
  voltas: number; // voltas completas
  fora: boolean;
  terminou: boolean;
  noBox: boolean; // dentro do pit lane
}

export function duracao(corrida: Corrida): number {
  let fim = 0;
  for (const tempos of Object.values(corrida.tempos)) fim = Math.max(fim, tempos[tempos.length - 1]!);
  return fim + 3;
}

export function posicaoNoTempo(corrida: Corrida, pista: Pista, linha: LinhaDoTempo, pilotoId: string, t: number): PosicaoNoTempo {
  const box = pista.box ?? BOX_PADRAO;
  const tempos = corrida.tempos[pilotoId]!;
  const ultima = tempos.length - 1;
  const abandono = corrida.abandonos[pilotoId];
  const fora = !!abandono && t >= abandono.tempo;
  const terminou = !abandono && t >= tempos[ultima]!;
  const distancia = distanciaEm(linha, t);
  const voltas = Math.max(0, Math.min(ultima, Math.floor(distancia + 1e-9)));
  const fracao = distancia - Math.floor(distancia);
  const volta = Math.floor(distancia) + 1; // volta em andamento
  const paradas = corrida.paradas[pilotoId] ?? [];
  const noBox =
    !fora &&
    !terminou &&
    paradas.some((p) => (p.volta === volta && fracao >= box.entrada) || (p.volta === volta - 1 && fracao < box.saida) || (p.volta === volta - 1 && fracao === 0));
  return { pilotoId, distancia, voltas, fora, terminou, noBox };
}

export interface LinhaTorre extends PosicaoNoTempo {
  posicao: number;
  intervalo: string; // para o carro da frente
  paraLider: string;
}

// Quanto tempo depois do carro da frente o de trás passou pelo ponto onde está agora.
// Depois da bandeirada vale a diferença na linha de chegada.
function diferenca(atras: PosicaoNoTempo, linhaAtras: LinhaDoTempo, frente: PosicaoNoTempo, linhaFrente: LinhaDoTempo, t: number): string {
  const atraso = Math.floor(frente.distancia - atras.distancia);
  if (atraso >= 1) return `+${atraso} ${atraso === 1 ? 'volta' : 'voltas'}`;
  const quando = tempoNaDistancia(linhaFrente, atras.distancia);
  const agora = atras.terminou ? tempoNaDistancia(linhaAtras, atras.distancia) : t;
  if (quando === null || agora === null) return '';
  return `+${Math.max(0, agora - quando).toFixed(1)}`;
}

// Ordem da corrida no instante t, como numa torre de tempos, com as diferenças ao vivo.
export function torreNoTempo(corrida: Corrida, pista: Pista, linhas: Map<string, LinhaDoTempo>, t: number): LinhaTorre[] {
  const ordemFinal = new Map(corrida.resultado.map((r) => [r.pilotoId, r.posicao]));
  const posicoes = Object.keys(corrida.tempos).map((id) => posicaoNoTempo(corrida, pista, linhas.get(id)!, id, t));
  posicoes.sort((a, b) => {
    if (a.fora !== b.fora) return a.fora ? 1 : -1;
    if (a.fora && b.fora) return ordemFinal.get(a.pilotoId)! - ordemFinal.get(b.pilotoId)!;
    if (a.terminou && b.terminou) return ordemFinal.get(a.pilotoId)! - ordemFinal.get(b.pilotoId)!;
    return b.distancia - a.distancia;
  });
  const lider = posicoes[0]!;
  const largou = t > 0;
  return posicoes.map((p, i) => {
    const frente = posicoes[i - 1];
    let intervalo = '';
    let paraLider = '';
    if (p.fora) intervalo = paraLider = 'ABD';
    else if (i === 0) intervalo = paraLider = largou ? 'Líder' : '';
    else if (largou && frente) {
      const linhaAtras = linhas.get(p.pilotoId)!;
      const linhaFrente = linhas.get(frente.pilotoId)!;
      const linhaLider = linhas.get(lider.pilotoId)!;
      intervalo = frente.fora ? '' : diferenca(p, linhaAtras, frente, linhaFrente, t);
      paraLider = diferenca(p, linhaAtras, lider, linhaLider, t);
    }
    return { ...p, posicao: i + 1, intervalo, paraLider };
  });
}

export function formatarTempo(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  const ss = s.toFixed(3).padStart(6, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

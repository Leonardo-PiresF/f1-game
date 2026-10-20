// Onde cada carro está num instante da corrida, a partir dos tempos de volta já simulados.
import type { Corrida } from '../engine/corrida';

export interface PosicaoNoTempo {
  pilotoId: string;
  distancia: number; // voltas percorridas desde a largada (fração incluída)
  voltas: number; // voltas completas
  fora: boolean;
  terminou: boolean;
}

export function duracao(corrida: Corrida): number {
  let fim = 0;
  for (const tempos of Object.values(corrida.tempos)) fim = Math.max(fim, tempos[tempos.length - 1]!);
  return fim + 3;
}

export function posicaoNoTempo(corrida: Corrida, pilotoId: string, t: number): PosicaoNoTempo {
  const tempos = corrida.tempos[pilotoId]!;
  const abandono = corrida.abandonos[pilotoId];
  const ultima = tempos.length - 1;
  if (abandono && t >= abandono.tempo) {
    return { pilotoId, distancia: abandono.distancia, voltas: ultima, fora: true, terminou: false };
  }
  if (t >= tempos[ultima]!) {
    if (abandono) {
      const d = ultima + (t - tempos[ultima]!) / corrida.tempoVolta;
      return { pilotoId, distancia: d, voltas: ultima, fora: false, terminou: false };
    }
    return { pilotoId, distancia: ultima, voltas: ultima, fora: false, terminou: true };
  }
  if (t < tempos[0]! || ultima === 0) {
    const volta = (tempos[1] ?? tempos[0]! + corrida.tempoVolta) - tempos[0]!;
    return { pilotoId, distancia: (t - tempos[0]!) / volta, voltas: 0, fora: false, terminou: false };
  }
  let l = 0;
  while (l < ultima && tempos[l + 1]! <= t) l++;
  const d = l + (t - tempos[l]!) / (tempos[l + 1]! - tempos[l]!);
  return { pilotoId, distancia: d, voltas: l, fora: false, terminou: false };
}

export interface LinhaTorre extends PosicaoNoTempo {
  posicao: number;
  diferenca: string; // para o líder, na última passagem pela linha
}

// Ordem da corrida no instante t, como numa torre de tempos.
export function torreNoTempo(corrida: Corrida, t: number): LinhaTorre[] {
  const ordemFinal = new Map(corrida.resultado.map((r) => [r.pilotoId, r.posicao]));
  const linhas = Object.keys(corrida.tempos).map((id) => posicaoNoTempo(corrida, id, t));
  linhas.sort((a, b) => {
    if (a.fora !== b.fora) return a.fora ? 1 : -1;
    if (a.terminou && b.terminou) return ordemFinal.get(a.pilotoId)! - ordemFinal.get(b.pilotoId)!;
    return b.distancia - a.distancia;
  });
  const lider = linhas[0]!;
  const temposLider = corrida.tempos[lider.pilotoId]!;
  return linhas.map((l, i) => {
    let diferenca: string;
    if (l.fora) diferenca = 'ABD';
    else if (i === 0) diferenca = l.voltas === 0 ? '' : 'Líder';
    else if (l.voltas === 0) diferenca = '';
    else {
      // Como na torre de verdade: compara a última passagem pela linha com a do líder
      // na mesma volta; se o líder já tinha mais voltas naquele instante, é volta de atraso.
      const ti = corrida.tempos[l.pilotoId]![l.voltas]!;
      let voltasLider = 0;
      while (voltasLider + 1 < temposLider.length && temposLider[voltasLider + 1]! <= ti) voltasLider++;
      const atraso = voltasLider - l.voltas;
      if (atraso >= 1) diferenca = `+${atraso} ${atraso === 1 ? 'volta' : 'voltas'}`;
      else diferenca = `+${(ti - temposLider[l.voltas]!).toFixed(1)}`;
    }
    return { ...l, posicao: i + 1, diferenca };
  });
}

export function formatarTempo(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  const ss = s.toFixed(3).padStart(6, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

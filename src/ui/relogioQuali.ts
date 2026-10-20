// Linha do tempo de uma sessão de classificação: cada carro sai da garagem, faz a volta de saída,
// a volta lançada e a volta de entrada. Com isso o mapa mostra a sessão ao vivo.
import type { SessaoQuali, TentativaQuali } from '../engine/classificacao';
import type { Pista } from '../engine/types';
import { distanciaEm, noBoxEm, type LinhaDoTempo, type Trecho } from './relogio';

const BOX_PADRAO = { entrada: 0.975, saida: 0.03 };

export type EstadoNaQuali = 'garagem' | 'saida' | 'lancada' | 'entrada' | 'batida';

export interface LinhaQuali {
  pilotoId: string;
  distancia: number;
  noBox: boolean;
  fora: boolean;
  estado: EstadoNaQuali;
  melhor: number | null;
  emVolta: number | null; // segundos da volta lançada em andamento
  ultima: number | null; // última volta completada (para destacar a melhoria)
  posicao: number;
}

// Garagem de cada equipe ao longo do pit lane, em fração da volta (perto da linha de chegada).
function garagem(pista: Pista, indice: number, total: number): number {
  const box = pista.box ?? BOX_PADRAO;
  const ext = (box.saida - box.entrada + 1) % 1;
  const g = box.entrada + ext * (0.2 + (0.6 * indice) / Math.max(1, total - 1));
  return g >= 1 ? g - 1 : g > 0.5 ? g - 1 : g;
}

export function montarLinhasDaQuali(sessao: SessaoQuali, pista: Pista, equipeDe: Map<string, string>): Map<string, LinhaDoTempo> {
  const box = pista.box ?? BOX_PADRAO;
  const equipes = [...new Set([...equipeDe.values()])];
  const linhas = new Map<string, LinhaDoTempo>();
  for (const id of sessao.participantes) {
    const g = garagem(pista, equipes.indexOf(equipeDe.get(id) ?? ''), equipes.length);
    const trechos: Trecho[] = [];
    let k = 0;
    let t = -Infinity;
    const tentativas = sessao.tentativas.filter((x) => x.pilotoId === id);
    let fim: LinhaDoTempo['fim'] = 'chegou';
    for (const x of tentativas) {
      trechos.push({ t0: t, t1: x.saida, d0: k + g, d1: k + g, box: true });
      // Volta de saída: pit lane até a saída, depois pista até a linha.
      const tSaidaBox = x.saida + (x.inicioLancada - x.saida) * Math.min(0.3, Math.max(0.05, box.saida - g + 0.05));
      trechos.push({ t0: x.saida, t1: tSaidaBox, d0: k + g, d1: k + box.saida, box: true });
      trechos.push({ t0: tSaidaBox, t1: x.inicioLancada, d0: k + box.saida, d1: k + 1 });
      if (x.batida) {
        const parou = k + 1 + (x.fracaoBatida ?? 0.5);
        trechos.push({ t0: x.inicioLancada, t1: x.fimLancada, d0: k + 1, d1: parou });
        trechos.push({ t0: x.fimLancada, t1: Infinity, d0: parou, d1: parou });
        fim = 'abandonou';
        t = Infinity;
        break;
      }
      // Volta lançada (completa ou interrompida pela bandeira vermelha).
      const volta = (x.inicioLancada - x.saida) / 1.35; // a volta de saída leva cerca de 1,35 volta
      const feita = x.abortada ? Math.min(0.99, (x.fimLancada - x.inicioLancada) / volta) : 1;
      trechos.push({ t0: x.inicioLancada, t1: x.fimLancada, d0: k + 1, d1: k + 1 + feita });
      // Volta de entrada: pista até a entrada do box e pit lane até a garagem.
      const dPista = k + 2 + box.entrada - (k + 1 + feita);
      const dBox = 1 - box.entrada + g;
      const tEntradaBox = x.fimLancada + (x.fimEntrada - x.fimLancada) * (dPista / (dPista + dBox * 1.5));
      trechos.push({ t0: x.fimLancada, t1: tEntradaBox, d0: k + 1 + feita, d1: k + 2 + box.entrada });
      trechos.push({ t0: tEntradaBox, t1: x.fimEntrada, d0: k + 2 + box.entrada, d1: k + 3 + g, box: true });
      k += 3;
      t = x.fimEntrada;
    }
    if (t !== Infinity) trechos.push({ t0: t, t1: Infinity, d0: k + g, d1: k + g, box: true });
    linhas.set(id, { trechos, fim });
  }
  return linhas;
}

function estadoEm(tentativas: TentativaQuali[], t: number): { estado: EstadoNaQuali; atual?: TentativaQuali } {
  for (const x of tentativas) {
    if (x.batida && t >= x.fimLancada) return { estado: 'batida', atual: x };
    if (t < x.saida || t >= x.fimEntrada) continue;
    if (t < x.inicioLancada) return { estado: 'saida', atual: x };
    if (t < x.fimLancada) return { estado: 'lancada', atual: x };
    return { estado: 'entrada', atual: x };
  }
  return { estado: 'garagem' };
}

// Tabela da sessão no instante t: melhores voltas até ali.
export function torreDaQuali(sessao: SessaoQuali, linhas: Map<string, LinhaDoTempo>, t: number): LinhaQuali[] {
  const lista = sessao.participantes.map((id) => {
    const tentativas = sessao.tentativas.filter((x) => x.pilotoId === id);
    const feitas = tentativas.filter((x) => x.tempo !== null && x.fimLancada <= t);
    const melhor = feitas.length ? Math.min(...feitas.map((x) => x.tempo!)) : null;
    const { estado, atual } = estadoEm(tentativas, t);
    const linha = linhas.get(id)!;
    return {
      pilotoId: id,
      distancia: distanciaEm(linha, t),
      noBox: noBoxEm(linha, t),
      fora: estado === 'batida',
      estado,
      melhor,
      emVolta: estado === 'lancada' && atual ? t - atual.inicioLancada : null,
      ultima: feitas.at(-1)?.tempo ?? null,
      posicao: 0,
    };
  });
  lista.sort((a, b) => (a.melhor ?? Infinity) - (b.melhor ?? Infinity));
  return lista.map((l, i) => ({ ...l, posicao: i + 1 }));
}

// Relógio da sessão: para durante as bandeiras vermelhas.
export function relogioDaSessao(sessao: SessaoQuali, t: number): { restante: number; vermelha: boolean } {
  let pausado = 0;
  let vermelha = false;
  for (const v of sessao.vermelhas) {
    if (t >= v.ate) pausado += v.ate - v.de;
    else if (t >= v.de) {
      pausado += t - v.de;
      vermelha = true;
    }
  }
  return { restante: Math.max(0, sessao.duracao - (t - pausado)), vermelha };
}

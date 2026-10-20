// Simulação de uma corrida, volta a volta. É determinística: a mesma semente e os
// mesmos dados dão sempre a mesma corrida. A tela só anima o resultado.
import type { Categoria, Equipe, Piloto, Pista } from './types.ts';
import { criarRng, type Rng } from './rng.ts';
import { classificar, type LinhaClassificacao } from './classificacao.ts';
import { aguaNaVolta, estaMolhado, SECO, type Clima, type Condicao } from './clima.ts';
import {
  alocacaoInicial,
  COMPOSTOS_SECOS,
  compostoIdeal,
  ehMolhado,
  melhoresEstrategias,
  pegarJogo,
  perdaNaVolta,
  perdaPorAgua,
  planoRestante,
  sortearPneus,
  temJogoNovo,
  type Composto,
  type CompostoSeco,
  type Estrategia,
  type JogosDePneus,
  type PneusDoFimDeSemana,
} from './pneus.ts';
import { combinar, gauss, intensidade, limitar, notaCarro, notaMolhado, pesoDaChuva, SEGUNDOS_POR_PONTO, sobrenome } from './ritmo.ts';

export type { Composto } from './pneus.ts';
export type { Clima } from './clima.ts';
export { notaCarro, sobrenome } from './ritmo.ts';

export const PONTOS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
export const PONTOS_SPRINT = [8, 7, 6, 5, 4, 3, 2, 1];

// Corrida interrompida antes de 75% da distância: pontos reduzidos (regulamento desde 2022).
export function pontosPorDistancia(pontos: number[], completadas: number, previstas: number): number[] {
  if (completadas >= previstas) return pontos;
  const pct = completadas / previstas;
  if (completadas < 2) return [];
  if (pontos !== PONTOS) return pct < 0.5 ? pontos.map((p) => Math.floor(p / 2)) : pontos;
  if (pct <= 0.25) return [6, 4, 3, 2, 1];
  if (pct <= 0.5) return [13, 10, 8, 6, 5, 4, 3, 2, 1];
  if (pct <= 0.75) return [19, 14, 12, 9, 8, 6, 5, 3, 2, 1];
  return pontos;
}

export interface PilotoNaCorrida extends Piloto {
  equipeId: string;
}

export interface ParametrosCorrida {
  pista: Pista;
  categoria: Categoria;
  pilotos: PilotoNaCorrida[];
  equipes: Equipe[];
  semente: number;
  clima?: Clima; // usado quando não há `condicao`; sorteado pela chance de chuva quando ausente
  condicao?: Condicao;
  grid?: string[]; // ordem de largada; sem grid, a corrida faz uma classificação rápida antes
  voltas?: number;
  tipo?: 'principal' | 'sprint';
  pontos?: number[];
  paradaObrigatoria?: boolean; // regra dos dois compostos no seco (padrão: só na corrida principal)
  pneus?: PneusDoFimDeSemana; // comportamento real; sorteado quando ausente
  estimativas?: Record<string, PneusDoFimDeSemana>; // o que cada equipe sabe dos pneus
  acerto?: Record<string, number>; // segundos por volta perdidos pelo acerto (parque fechado)
  jogos?: Record<string, JogosDePneus>; // jogos de pneus que sobraram para cada piloto
}

export type TipoEvento =
  | 'ultrapassagem'
  | 'box'
  | 'box_lento'
  | 'undercut'
  | 'batida'
  | 'quebra'
  | 'toque'
  | 'punicao'
  | 'limites'
  | 'safety_car'
  | 'vsc'
  | 'vermelha'
  | 'relargada'
  | 'retardatarios'
  | 'chuva'
  | 'bandeirada';

export interface EventoCorrida {
  volta: number;
  tipo: TipoEvento;
  texto: string;
  pilotos: string[];
}

export interface EstadoPiloto {
  pilotoId: string;
  posicao: number;
  pneu: Composto;
  idadePneu: number;
  paradas: number;
  noBox: boolean; // parou nesta volta
  fora: boolean;
}

export interface ResultadoPiloto {
  pilotoId: string;
  equipeId: string;
  posicao: number;
  largada: number;
  status: 'chegou' | 'abandonou';
  motivo?: string;
  voltas: number;
  tempoTotal: number; // com punições
  punicao: number;
  pontos: number;
  paradas: number;
  melhorVolta: number;
  pneus: Composto[]; // compostos usados, na ordem
}

export interface Abandono {
  tempo: number; // instante da corrida em que parou
  distancia: number; // em voltas, a partir da linha de largada
}

export interface ParadaBox {
  volta: number; // a volta em que entrou no box (a parada fica no fim dela)
  perda: number; // segundos a mais nessa volta, incluindo o carro parado
  parada: number; // segundos com o carro parado
  vermelha?: boolean; // parado no pit lane durante a bandeira vermelha (não conta como parada)
}

export interface Neutralizacao {
  tipo: 'SC' | 'VSC' | 'VERMELHA';
  de: number; // primeira volta neutralizada
  ate: number; // última volta neutralizada
}

export interface Corrida {
  pistaId: string;
  categoria: Categoria;
  tipo: 'principal' | 'sprint';
  clima: Clima; // na largada
  agua: number[]; // água na pista em cada volta (índice 0 = largada)
  voltas: number; // voltas disputadas (menos que as previstas se a corrida foi encerrada)
  voltasPrevistas: number;
  tempoVolta: number;
  semente: number;
  pneus: PneusDoFimDeSemana;
  classificacao?: LinhaClassificacao[]; // só quando a própria corrida fez a classificação
  grid: { pilotoId: string; tempo: number }[];
  // Instante em que cada piloto cruza a linha ao fim de cada volta. O índice 0 é a
  // largada (os de trás cruzam a linha um pouco depois).
  tempos: Record<string, number[]>;
  paradas: Record<string, ParadaBox[]>;
  abandonos: Record<string, Abandono>;
  neutralizacoes: Neutralizacao[];
  estados: EstadoPiloto[][]; // por volta; índice 0 = grid
  eventos: EventoCorrida[];
  resultado: ResultadoPiloto[];
  voltaMaisRapida: { pilotoId: string; volta: number; tempo: number } | null;
  quebrasDeMotor: string[]; // pilotos que perderam a unidade de potência
}

interface Carro {
  p: PilotoNaCorrida;
  equipe: Equipe;
  notaSeco: number;
  notaChuva: number;
  formaDoDia: number; // segundos por volta, sorteado uma vez por fim de semana
  sigma: number;
  fatorPneu: number;
  estrategia: number;
  acerto: number;
  jogos: JogosDePneus;
  estimativa: PneusDoFimDeSemana;
  proximos: Composto[]; // pneus das próximas paradas planejadas
  paradasPlanejadas: number[]; // volta de cada parada planejada, na ordem
  pneu: Composto;
  usados: Composto[];
  idade: number;
  paradas: number;
  tempos: number[];
  box: ParadaBox[];
  fora: boolean;
  motivo?: string;
  punicao: number;
  limites: number;
  melhorVolta: number;
  agressivoAte: number;
  agressivoContra?: string;
  // estado da volta em andamento
  desejado: number;
  cum: number;
  pitando: boolean;
  atraso: number; // tempo perdido num toque, aplicado no fim da volta
  frenteNaParada?: string; // quem estava logo à frente quando parou (para detectar undercut)
  gapNaParada?: number;
}

interface Undercut {
  atacante: Carro;
  alvo: Carro;
  volta: number;
}

const GAP_MINIMO = 0.3; // segundos entre dois carros na mesma linha
const RITMO_SC = 1.4; // volta atrás do safety car, em relação à volta normal
const RITMO_VSC = 1.35;

// Chance por volta de passar dos limites de pista. Pistas de rua têm muro; Áustria e Catar são famosas.
const LIMITES_DE_PISTA: Record<string, number> = {
  red_bull_ring: 0.015,
  losail: 0.005,
  americas: 0.004,
  yas_marina: 0.003,
  monaco: 0.0003,
  baku: 0.0005,
  marina_bay: 0.0008,
  vegas: 0.0008,
  madring: 0.001,
};

const CAUSAS_DE_QUEBRA = ['Motor', 'Motor', 'Câmbio', 'Hidráulica', 'Elétrica', 'Freios', 'Suspensão'];

// Cada equipe escolhe entre as estratégias boas; quem tem estratégia pior erra mais na escolha e no momento.
function escolherEstrategia(opcoes: Estrategia[], estrategia: number, rng: Rng): Estrategia {
  const melhor = opcoes[0]!;
  const tolerancia = 2 + (100 - estrategia) / 5;
  const candidatas = opcoes.filter((o) => o.custo <= melhor.custo + tolerancia).slice(0, 5);
  const pesos = candidatas.map((o) => Math.exp(-(o.custo - melhor.custo) / 2));
  let r = rng() * pesos.reduce((s, p) => s + p, 0);
  for (let i = 0; i < candidatas.length; i++) {
    r -= pesos[i]!;
    if (r <= 0) return candidatas[i]!;
  }
  return melhor;
}

// Sem jogo novo de um composto, o stint começa com pneu usado: a estratégia leva isso em conta.
function custoComJogos(e: Estrategia, jogos: JogosDePneus, pneus: PneusDoFimDeSemana): number {
  const precisa: Partial<Record<Composto, number>> = {};
  let extra = 0;
  const limites = [0, ...e.paradas];
  e.compostos.forEach((k, i) => {
    precisa[k] = (precisa[k] ?? 0) + 1;
    const novos = jogos[k].filter((v) => v === 0).length;
    if (precisa[k]! > novos) {
      const voltas = (limites[i + 1] ?? limites[i]! + 20) - limites[i]!;
      extra += pneus[k].desgaste * 3 * voltas;
    }
  });
  return e.custo + extra;
}

export function simularCorrida(params: ParametrosCorrida): Corrida {
  const { pista, categoria, semente } = params;
  const tipo = params.tipo ?? 'principal';
  const rng = criarRng(semente);
  const condicao: Condicao =
    params.condicao ?? ((params.clima ?? (rng() < pista.perfil.chanceChuva ? 'molhado' : 'seco')) === 'molhado' ? { agua0: 0.45 + rng() * 0.45, tendencia: -0.008 } : SECO);
  const voltasPrevistas = params.voltas ?? (categoria === 'F1' ? pista.voltas : Math.round(pista.voltas * 0.57));
  const tempoVolta = pista.tempoVolta * (categoria === 'F1' ? 1 : 1.07);
  const pneus = params.pneus ?? sortearPneus(pista, rng);
  const paradaObrigatoria = params.paradaObrigatoria ?? tipo === 'principal';
  const tabelaPontos = params.pontos ?? (tipo === 'sprint' ? PONTOS_SPRINT : PONTOS);
  const zonas = pista.zonas?.length ?? 1;
  // Ar sujo: em pista travada, seguir de perto custa mais e é preciso ser bem mais rápido para tentar.
  const arSujo = 0.15 + 0.5 * (1 - pista.perfil.ultrapassagem);
  const chanceLimites = LIMITES_DE_PISTA[pista.id] ?? 0.0015;
  const equipes = new Map(params.equipes.map((e) => [e.id, e]));
  const eventos: EventoCorrida[] = [];
  const nomeDe = (c: Carro) => sobrenome(c.p.nome);
  const evento = (volta: number, tipo: TipoEvento, texto: string, carros: Carro[]) =>
    eventos.push({ volta, tipo, texto, pilotos: carros.map((c) => c.p.id) });
  // Bandeira vermelha por chuva: o tempo passa durante a pausa, e a água segue a curva adiante.
  let deslocamentoAgua = 0;
  const aguaDe = (volta: number) => aguaNaVolta(condicao, volta + deslocamentoAgua);
  const agua: number[] = [aguaDe(0)];
  const molhadoNaLargada = estaMolhado(agua[0]!);

  const carros: Carro[] = params.pilotos.map((p) => {
    const equipe = equipes.get(p.equipeId);
    if (!equipe) throw new Error(`Equipe desconhecida para ${p.id}: ${p.equipeId}`);
    const a = p.atributos;
    const carro = notaCarro(equipe, pista);
    return {
      p,
      equipe,
      notaSeco: combinar(categoria, a.ritmoCorrida, carro),
      notaChuva: combinar(categoria, notaMolhado(p, a.ritmoCorrida), carro),
      formaDoDia: gauss(rng) * (0.12 + (100 - a.consistencia) * 0.008),
      sigma: 0.12 + (100 - a.consistencia) * 0.012,
      fatorPneu: limitar(1 - (a.gestaoPneu - 85) * 0.012, 0.8, 1.2) * (1 - 0.1 * intensidade(p, 'gestor_pneus')),
      estrategia: equipe.areas.estrategia + 3 * intensidade(p, 'estrategista'),
      acerto: params.acerto?.[p.id] ?? 0,
      jogos: params.jogos?.[p.id] ?? alocacaoInicial(false),
      estimativa: params.estimativas?.[equipe.id] ?? pneus,
      proximos: [],
      paradasPlanejadas: [],
      pneu: 'medio',
      usados: [],
      idade: 0,
      paradas: 0,
      tempos: [],
      box: [],
      fora: false,
      punicao: 0,
      limites: 0,
      melhorVolta: Infinity,
      agressivoAte: 0,
      desejado: 0,
      cum: 0,
      pitando: false,
      atraso: 0,
    };
  });
  const porId = new Map(carros.map((c) => [c.p.id, c]));

  // Sem grid vindo de fora, uma classificação rápida (para testes e calibração).
  let classificacao: LinhaClassificacao[] | undefined;
  let ordemGrid: Carro[];
  let temposDeGrid: Map<string, number>;
  if (params.grid) {
    ordemGrid = params.grid.map((id) => porId.get(id)!).filter(Boolean);
    temposDeGrid = new Map();
  } else {
    const q = classificar(
      carros.map((c) => {
        const a = c.p.atributos;
        const seco = combinar(categoria, a.quali, notaCarro(c.equipe, pista));
        const chuva = combinar(categoria, notaMolhado(c.p, a.quali), notaCarro(c.equipe, pista));
        return {
          id: c.p.id,
          ritmo: (w: number) => {
            const m = pesoDaChuva(w);
            const ideal = compostoIdeal(w);
            return tempoVolta - 1.8 + 6 * w + (ideal === 'seco' ? 0 : perdaPorAgua(ideal, w)) - SEGUNDOS_POR_PONTO * (seco * (1 - m) + chuva * m - 85) + c.formaDoDia;
          },
          sigma: (0.08 + (100 - a.consistencia) * 0.005) * (molhadoNaLargada ? 1.8 : 1),
          chanceErro: 0.03 + 0.06 * intensidade(c.p, 'erros_graves') + (molhadoNaLargada ? 0.05 : 0),
          chanceBatida: 0,
        };
      }),
      categoria === 'F2' ? 'F2' : 'F1',
      { agua: [agua[0]!], tempoVolta, pneus },
      rng,
    );
    classificacao = q.grid;
    ordemGrid = q.grid.map((l) => porId.get(l.pilotoId)!);
    temposDeGrid = new Map(q.grid.map((l) => [l.pilotoId, l.q3 ?? l.q2 ?? l.q1 ?? Infinity]));
  }
  const ordemInicial = new Set(ordemGrid);
  for (const c of carros) if (!ordemInicial.has(c)) ordemGrid.push(c);

  const regraDosCompostos = (c: Carro): CompostoSeco | 'qualquer-outro' | null => {
    if (!paradaObrigatoria || c.usados.some(ehMolhado)) return null;
    const secos = new Set(c.usados.filter((k) => !ehMolhado(k)));
    return secos.size >= 2 ? null : 'qualquer-outro';
  };

  // Estratégia de pneus a partir do que cada equipe sabe deles.
  const cacheEstrategias = new Map<string, Estrategia[]>();
  ordemGrid.forEach((c, i) => {
    const ideal = compostoIdeal(agua[0]!);
    if (ideal !== 'seco') {
      c.pneu = ideal;
    } else {
      const chave = `${c.equipe.id}:${Math.round(c.fatorPneu * 50) / 50}`;
      const fator = Math.round(c.fatorPneu * 50) / 50;
      let opcoes = cacheEstrategias.get(chave);
      if (!opcoes) {
        if (paradaObrigatoria) {
          opcoes = melhoresEstrategias(c.estimativa, voltasPrevistas, pista.perdaBox, fator);
        } else {
          // Sem parada obrigatória (sprint): escolhe o pneu de largada e, se valer, uma parada.
          opcoes = COMPOSTOS_SECOS.flatMap((k) =>
            planoRestante(c.estimativa, voltasPrevistas, pista.perdaBox, fator, { composto: k, idade: 0 }, null)
              .slice(0, 2)
              .map((e) => ({ ...e, compostos: [k, ...e.compostos] })),
          ).sort((a, b) => a.custo - b.custo);
        }
        cacheEstrategias.set(chave, opcoes);
      }
      const reavaliadas = opcoes
        .slice(0, 15)
        .map((e) => ({ ...e, custo: custoComJogos(e, c.jogos, c.estimativa) }))
        .sort((a, b) => a.custo - b.custo);
      const escolhida = escolherEstrategia(reavaliadas, c.estrategia, rng);
      const erro = (100 - c.estrategia) / 12;
      c.pneu = escolhida.compostos[0]!;
      c.proximos = escolhida.compostos.slice(1);
      let anterior = 0;
      c.paradasPlanejadas = escolhida.paradas.map((v) => {
        anterior = limitar(Math.round(v + gauss(rng) * (1 + erro)), anterior + 4, voltasPrevistas - 3);
        return anterior;
      });
    }
    c.idade = pegarJogo(c.jogos, c.pneu, 0);
    c.usados = [c.pneu];
    c.cum = i * 0.2;
    c.tempos.push(c.cum);
  });

  const largadaDe = new Map(ordemGrid.map((c, i) => [c.p.id, i + 1]));
  const estados: EstadoPiloto[][] = [];
  const abandonos: Record<string, Abandono> = {};
  const neutralizacoes: Neutralizacao[] = [];
  const undercuts: Undercut[] = [];
  const quebrasDeMotor: string[] = [];
  let ordem = [...ordemGrid];
  let voltaRapida: Corrida['voltaMaisRapida'] = null;
  let voltas = voltasPrevistas;
  let encerrada = false;
  const prorrogacoes = new Map<Neutralizacao, number>();

  const neutralizada = (volta: number) => neutralizacoes.find((n) => volta >= n.de && volta <= n.ate);

  const registrarEstado = (pitaram: Set<Carro>) => {
    const ativos = ordem.filter((c) => !c.fora);
    const fora = carros.filter((c) => c.fora).sort((a, b) => b.tempos.length - a.tempos.length);
    estados.push(
      [...ativos, ...fora].map((c, i) => ({
        pilotoId: c.p.id,
        posicao: i + 1,
        pneu: c.pneu,
        idadePneu: Math.max(0, c.idade),
        paradas: c.paradas,
        noBox: pitaram.has(c),
        fora: c.fora,
      })),
    );
  };
  registrarEstado(new Set());

  const abandonar = (c: Carro, volta: number, motivo: string) => {
    const fracao = 0.15 + rng() * 0.7;
    c.fora = true;
    c.motivo = motivo;
    abandonos[c.p.id] = { tempo: c.tempos[c.tempos.length - 1]! + tempoVolta * fracao, distancia: volta - 1 + fracao };
  };

  // Depois de um incidente a direção de prova decide: bandeira vermelha, safety car, virtual ou nada.
  const neutralizar = (volta: number, chanceSC: number, chanceVSC: number, chanceVermelha = 0) => {
    const inicio = volta + 1;
    if (inicio >= voltas - 1 || neutralizada(volta) || neutralizada(inicio)) return;
    const r = rng();
    if (r < chanceVermelha) {
      neutralizacoes.push({ tipo: 'VERMELHA', de: inicio, ate: inicio });
      evento(inicio, 'vermelha', 'Bandeira vermelha: a corrida é interrompida e todos vão para o pit lane', []);
    } else if (r < chanceVermelha + chanceSC) {
      neutralizacoes.push({ tipo: 'SC', de: inicio, ate: Math.min(voltas - 1, inicio + 2 + Math.floor(rng() * 3)) });
      evento(inicio, 'safety_car', 'Safety car na pista: o pelotão se junta atrás dele', []);
    } else if (r < chanceVermelha + chanceSC + chanceVSC) {
      neutralizacoes.push({ tipo: 'VSC', de: inicio, ate: Math.min(voltas - 1, inicio + Math.floor(rng() * 2)) });
      evento(inicio, 'vsc', 'Safety car virtual: todos reduzem e as distâncias se mantêm', []);
    }
  };

  const perdaPneu = (c: Carro, composto: Composto, idade: number) => perdaNaVolta(pneus[composto], idade, c.fatorPneu);

  // Melhor plano para o resto da corrida a partir de um pneu seco novo (troca por chuva ou bandeira vermelha).
  const planejarSeco = (c: Carro, restantes: number, regra: CompostoSeco | 'qualquer-outro' | null) => {
    const fator = c.fatorPneu;
    let melhor: { k: CompostoSeco; e: Estrategia } | null = null;
    for (const k of COMPOSTOS_SECOS) {
      const exigir = regra === 'qualquer-outro' ? (c.usados.some((u) => u !== k && !ehMolhado(u)) ? null : 'qualquer-outro') : regra;
      const e = planoRestante(c.estimativa, restantes, pista.perdaBox, fator, { composto: k, idade: temJogoNovo(c.jogos, k) ? 0 : 3 }, exigir)[0];
      if (e && (!melhor || e.custo < melhor.e.custo)) melhor = { k, e };
    }
    return melhor!;
  };

  const trocarPneu = (c: Carro, novo: Composto) => {
    c.pneu = novo;
    c.usados.push(novo);
    c.idade = pegarJogo(c.jogos, novo, 0) - 1; // vira a idade do jogo no fim desta volta
  };

  for (let volta = 1; volta <= voltas; volta++) {
    const neutra = neutralizada(volta);
    const anterior = neutralizada(volta - 1);
    const aguaVolta = aguaDe(volta);
    const aguaAntes = agua[agua.length - 1]!;
    if (!estaMolhado(aguaAntes) && estaMolhado(aguaVolta)) evento(volta, 'chuva', 'Começa a chover', []);
    if (estaMolhado(aguaAntes) && !estaMolhado(aguaVolta)) evento(volta, 'chuva', 'A pista está secando', []);
    if (anterior && !neutra && anterior.tipo !== 'VERMELHA') {
      evento(volta, 'relargada', anterior.tipo === 'SC' ? 'Relargada: o safety car sai da pista' : 'Fim do safety car virtual', []);
    }
    const relargada = (anterior?.tipo === 'SC' && !neutra) || anterior?.tipo === 'VERMELHA';
    const largadaParada = volta === 1 || anterior?.tipo === 'VERMELHA';
    const ativos = ordem.filter((c) => !c.fora);
    const pitaram = new Set<Carro>();
    const pressao = volta > voltas - 10;
    const restantes = voltas - volta;

    if (neutra?.tipo === 'VERMELHA') {
      // Bandeira vermelha: volta lenta até o pit lane, carros parados e troca de pneus livre.
      const porChuva = aguaAntes > 0.9;
      let pausa = 900 + rng() * 1500;
      if (porChuva) {
        let k = 1;
        while (k <= 60 && aguaNaVolta(condicao, volta + deslocamentoAgua + k) > 0.8) k++;
        pausa = Math.max(900, k * tempoVolta);
        if (k > 60) encerrada = true;
        deslocamentoAgua += k;
      } else {
        deslocamentoAgua += Math.round(pausa / tempoVolta);
      }
      if (restantes < 3) encerrada = true;
      const aguaDepois = aguaDe(volta + 1);
      let anteriorCum = -Infinity;
      const chegada: number[] = [];
      for (const c of ativos) {
        c.pitando = false;
        const cum = Math.max(anteriorCum + 1, c.cum + tempoVolta * RITMO_SC);
        anteriorCum = cum;
        chegada.push(cum);
      }
      const relargadaEm = Math.max(...chegada) + pausa;
      ativos.forEach((c, i) => {
        const novoCum = relargadaEm + i * 0.25;
        const parada = novoCum - chegada[i]!;
        c.box.push({ volta, perda: novoCum - c.cum - tempoVolta * RITMO_SC, parada, vermelha: true });
        if (!encerrada) {
          const ideal = compostoIdeal(aguaDepois);
          if (ideal !== 'seco') {
            trocarPneu(c, ideal);
            c.proximos = [];
            c.paradasPlanejadas = [];
          } else {
            const plano = planejarSeco(c, voltas - volta, regraDosCompostos(c));
            trocarPneu(c, plano.k);
            c.proximos = plano.e.compostos;
            c.paradasPlanejadas = plano.e.paradas.map((p) => volta + p);
          }
        }
        c.cum = novoCum;
      });
      for (const c of ativos) {
        c.tempos.push(c.cum);
        c.idade++;
      }
      agua.push(aguaVolta);
      registrarEstado(pitaram);
      if (encerrada) {
        voltas = volta - 1;
        evento(volta, 'vermelha', 'A corrida não volta: o resultado vale como estava antes da bandeira vermelha', []);
        break;
      }
      evento(volta + 1, 'relargada', 'Relargada parada, com os carros alinhados no grid', []);
      continue;
    }

    // Quebras e erros acontecem durante a volta.
    for (const c of ativos) {
      const a = c.p.atributos;
      const quebra = (100 - c.equipe.sistemas.confiabilidade) * 0.00004;
      let erro = 0.00045 * Math.max(0.3, 1 + (90 - a.consistencia) * 0.08) * (1 + intensidade(c.p, 'erros_graves'));
      erro *= 1 + 3 * pesoDaChuva(aguaVolta);
      // Pneu errado para a condição: muito mais fácil rodar.
      if (!ehMolhado(c.pneu) && estaMolhado(aguaVolta)) erro *= 1 + 8 * aguaVolta;
      if (largadaParada) erro *= 3;
      if (neutra) erro *= 0.1;
      if (rng() < quebra) {
        const causa = CAUSAS_DE_QUEBRA[Math.floor(rng() * CAUSAS_DE_QUEBRA.length)]!;
        abandonar(c, volta, causa);
        if (causa === 'Motor') quebrasDeMotor.push(c.p.id);
        evento(volta, 'quebra', `${nomeDe(c)} abandona com problema de ${causa.toLowerCase()}`, [c]);
        neutralizar(volta, 0.1, 0.4);
      } else if (rng() < erro) {
        abandonar(c, volta, 'Batida');
        evento(volta, 'batida', `${nomeDe(c)} bate e está fora`, [c]);
        neutralizar(volta, 0.5, 0.3, 0.06 + 0.1 * pesoDaChuva(aguaVolta));
      }
    }
    // Chuva demais: a direção de prova interrompe.
    if (!neutra && aguaVolta > 0.93 && !neutralizada(volta + 1) && volta + 1 < voltas - 1) {
      neutralizacoes.push({ tipo: 'VERMELHA', de: volta + 1, ate: volta + 1 });
      evento(volta + 1, 'vermelha', 'Bandeira vermelha: chuva forte demais para correr', []);
    }

    const naPista = ativos.filter((c) => !c.fora);
    const lider = naPista[0];
    // Decisões de box, olhando a corrida como estava na última passagem pela linha.
    naPista.forEach((c, i) => {
      c.pitando = false;
      const proxima = c.paradasPlanejadas[0];
      const temParada = proxima !== undefined && c.proximos.length > 0;
      const frente = naPista[i - 1];
      const vida = pneus[c.pneu].vida / c.fatorPneu;
      const futura = aguaDe(volta + 1);
      const ideal = compostoIdeal(futura);
      let novo: Composto | null = null;
      let motivo: 'plano' | 'undercut' | 'cobertura' | 'neutralizacao' | 'pneu' | 'clima' = 'plano';
      let plano: { k: CompostoSeco; e: Estrategia } | null = null;

      // Condição mudou: troca para o pneu certo quando o ganho paga a parada.
      const tipoAtual = ehMolhado(c.pneu) ? c.pneu : 'seco';
      if (ideal !== tipoAtual && restantes > 1) {
        if (ideal === 'seco') plano = planejarSeco(c, restantes, regraDosCompostos(c));
        const alvo: Composto = ideal === 'seco' ? plano!.k : ideal;
        const ganho = perdaPorAgua(c.pneu, futura) - perdaPorAgua(alvo, futura);
        const coragem = 1.1 - (c.estrategia - 80) * 0.015 + gauss(rng) * 0.3;
        if (ganho * Math.min(restantes, 8) > pista.perdaBox * coragem * (neutra ? 0.5 : 1)) {
          novo = alvo;
          motivo = 'clima';
        }
      }
      if (!novo && temParada && proxima <= volta) novo = c.proximos[0]!;
      if (!novo && temParada && neutra && proxima - volta <= 10 && c.idade >= 5) {
        if (rng() < (neutra.tipo === 'SC' ? 0.45 : 0.3) + (c.estrategia - 75) * 0.02) {
          novo = c.proximos[0]!;
          motivo = 'neutralizacao';
        }
      }
      // Undercut: parar antes do carro da frente para passar com o pneu novo.
      if (!novo && !neutra && temParada && frente && !frente.fora && frente.paradas === c.paradas && proxima - volta <= 6 && c.idade >= 8 && volta > 3) {
        const gap = c.cum - frente.cum;
        const k = c.proximos[0]!;
        const ganho = [0, 1].reduce((s, j) => s + perdaPneu(frente, frente.pneu, frente.idade + j) - perdaPneu(c, k, j), 0);
        if (gap < 2.5 && ganho > gap + 0.4 && rng() < limitar(0.2 + (c.estrategia - 75) * 0.025, 0.08, 0.75)) {
          novo = k;
          motivo = 'undercut';
          undercuts.push({ atacante: c, alvo: frente, volta });
          evento(volta, 'undercut', `${nomeDe(c)} para cedo para tentar o undercut em ${nomeDe(frente)}`, [c, frente]);
        }
      }
      // Cobertura: o carro de trás parou na volta anterior; parar agora para não perder a posição.
      if (!novo && !neutra && temParada && proxima - volta <= 10 && c.idade >= 6) {
        const atacante = carros.find((o) => !o.fora && o.box.at(-1)?.volta === volta - 1 && !o.box.at(-1)?.vermelha && o.frenteNaParada === c.p.id && (o.gapNaParada ?? 9) < 3);
        if (atacante && rng() < limitar(0.3 + (c.estrategia - 75) * 0.03, 0.12, 0.85)) {
          novo = c.proximos[0]!;
          motivo = 'cobertura';
          evento(volta, 'undercut', `${nomeDe(c)} responde a ${nomeDe(atacante)} e para na volta seguinte`, [c, atacante]);
        }
      }
      // Pneu acabou antes do planejado (ou não havia plano).
      if (!novo && !ehMolhado(c.pneu) && c.idade > vida * 1.35 && restantes > 3) {
        plano = planejarSeco(c, restantes, regraDosCompostos(c));
        novo = plano.k;
        motivo = 'pneu';
      }
      if (!novo) return;

      const ps = c.equipe.areas.pitStop;
      let parada = 2.2 + (100 - ps) * 0.04 + Math.abs(gauss(rng)) * 0.3;
      const lenta = rng() < 0.02 + (100 - ps) * 0.002;
      if (lenta) parada += 3 + rng() * 5;
      const fatorPit = neutra?.tipo === 'SC' ? 0.5 : neutra?.tipo === 'VSC' ? 0.6 : 1;
      const perda = pista.perdaBox * fatorPit + parada;
      c.box.push({ volta, perda, parada });
      c.frenteNaParada = frente?.p.id;
      c.gapNaParada = frente ? c.cum - frente.cum : undefined;
      if (motivo === 'clima' || motivo === 'pneu') {
        // Plano novo para o resto da corrida.
        if (plano && !ehMolhado(novo)) {
          c.proximos = plano.e.compostos;
          c.paradasPlanejadas = plano.e.paradas.map((p) => volta + p);
        } else {
          c.proximos = [];
          c.paradasPlanejadas = [];
        }
      } else {
        // Antecipar ou atrasar uma parada empurra as seguintes na mesma medida.
        const desvio = volta - proxima!;
        c.proximos = c.proximos.slice(1);
        c.paradasPlanejadas = c.paradasPlanejadas.slice(1).map((v) => limitar(v + desvio, volta + 4, voltas - 3));
      }
      trocarPneu(c, novo);
      c.paradas++;
      c.pitando = true;
      pitaram.add(c);
      if (lenta) evento(volta, 'box_lento', `Parada lenta para ${nomeDe(c)} (${parada.toFixed(1)}s)`, [c]);
      else if (motivo === 'clima') evento(volta, 'box', `${nomeDe(c)} para e coloca pneu ${NOME_PNEU[novo]} (${parada.toFixed(1)}s)`, [c]);
      else if (motivo !== 'undercut' && motivo !== 'cobertura') evento(volta, 'box', `${nomeDe(c)} para nos boxes (${parada.toFixed(1)}s)`, [c]);
    });

    // Tempo de volta de cada um.
    naPista.forEach((c, i) => {
      const a = c.p.atributos;
      const pitada = c.box.at(-1);
      const perdaBox = c.pitando && pitada ? pitada.perda : 0;
      // Quem parou anda a volta com o pneu velho; o novo só conta a partir da próxima.
      const pneuDaVolta = c.pitando ? c.usados[c.usados.length - 2]! : c.pneu;
      const idadeDaVolta = c.pitando ? (c.box.length > 1 ? volta - c.box[c.box.length - 2]!.volta : volta) - 1 : c.idade;
      if (neutra) {
        const ritmo = neutra.tipo === 'SC' ? RITMO_SC : RITMO_VSC;
        c.desejado = c.cum + tempoVolta * ritmo + Math.abs(gauss(rng)) * 0.05 + perdaBox;
        return;
      }
      const m = pesoDaChuva(aguaVolta);
      let sigma = c.sigma * (1 + 0.6 * m);
      if (pressao && i < 3 && intensidade(c.p, 'frio_sob_pressao') > 0) sigma *= 0.8;
      const combustivel = 1.8 * (1 - volta / voltasPrevistas);
      const nota = c.notaSeco * (1 - m) + c.notaChuva * m;
      let t = tempoVolta + 6 * aguaVolta + perdaPorAgua(pneuDaVolta, aguaVolta) + combustivel + perdaPneu(c, pneuDaVolta, idadeDaVolta);
      t += -SEGUNDOS_POR_PONTO * (nota - 85) + c.formaDoDia + c.acerto + gauss(rng) * sigma;
      if (largadaParada) t += 4 - (a.largada - 80) * 0.03 + gauss(rng) * 0.25 + (rng() < 0.03 ? 1.5 : 0);
      // Volta de saída do box: pneu frio.
      if (!c.pitando && c.box.at(-1)?.volta === volta - 1 && !c.box.at(-1)?.vermelha && !ehMolhado(pneuDaVolta)) t += 0.6;
      c.desejado = c.cum + t + perdaBox;
    });

    // Resolve a ordem no fim da volta.
    const fila: Carro[] = [];
    if (neutra?.tipo === 'SC') {
      // Safety car: o pelotão se junta, carro atrás de carro. Retardatários ficam uma volta atrás,
      // até a direção de prova liberar que tirem a volta; aí andam forte até o fim da fila.
      const ultimaVoltaDoLider = lider ? lider.cum - lider.tempos[lider.tempos.length - 2]! : tempoVolta;
      const liberados = volta >= neutra.ate - 1;
      const retardatarios = new Set(naPista.filter((c) => lider !== undefined && c !== lider && c.cum - lider.cum > ultimaVoltaDoLider * 0.95));
      const retardatario = (c: Carro) => retardatarios.has(c);
      if (liberados && volta === neutra.ate - 1 && retardatarios.size > 0) {
        evento(volta, 'retardatarios', 'Retardatários liberados para passar o safety car e tirar a volta', []);
      }
      let anteriorCum = -Infinity;
      for (const c of naPista) {
        const extra = c.pitando ? c.box.at(-1)!.perda : 0;
        if (c === lider) c.cum = c.cum + tempoVolta * RITMO_SC + extra;
        else if (retardatario(c) && !liberados) c.cum = c.cum + tempoVolta * RITMO_SC + extra;
        else c.cum = Math.max(anteriorCum + 0.8, c.cum + tempoVolta * RITMO_SC * 0.65) + extra;
        if (!c.pitando) anteriorCum = Math.max(anteriorCum, c.cum);
        fila.push(c);
      }
      // O safety car só sai depois que todos os retardatários tiraram a volta (no máximo duas voltas a mais).
      const novoLider = fila.reduce((a, b) => (a.cum < b.cum ? a : b));
      const aindaAtras = fila.some((c) => c !== novoLider && c.cum - novoLider.cum > tempoVolta * RITMO_SC * 0.95);
      const extras = prorrogacoes.get(neutra) ?? 0;
      if (volta === neutra.ate && liberados && aindaAtras && extras < 2 && neutra.ate < voltas - 2) {
        neutra.ate++;
        prorrogacoes.set(neutra, extras + 1);
      }
    } else if (neutra?.tipo === 'VSC') {
      // Safety car virtual: todos reduzem igual, as distâncias se mantêm e ninguém ultrapassa.
      for (const c of naPista) {
        c.cum = c.desejado;
        fila.push(c);
      }
    } else {
      for (const c of naPista) {
        let idx = fila.length;
        let tentativas = 2;
        let cum = c.desejado;
        while (idx > 0) {
          const frente = fila[idx - 1]!;
          if (cum >= frente.cum + GAP_MINIMO) break;
          if (frente.pitando || c.pitando) {
            if (cum < frente.cum) {
              idx--;
              continue;
            }
            cum = frente.cum + GAP_MINIMO;
            break;
          }
          // Ar sujo: quem segue de perto perde um pouco, e só tenta se estiver de fato mais rápido.
          cum += arSujo;
          if (cum >= frente.cum || tentativas === 0) {
            cum = Math.max(cum, frente.cum + GAP_MINIMO);
            break;
          }
          tentativas--;
          const r = disputar(c, frente, cum, volta, relargada || largadaParada, aguaVolta);
          if (c.fora) break;
          if (frente.fora) {
            fila.splice(idx - 1, 1);
            idx--;
            continue;
          }
          if (r === 'passou') {
            idx--;
            evento(volta, 'ultrapassagem', `${nomeDe(c)} passa ${nomeDe(frente)} pelo P${idx + 1}`, [c, frente]);
            continue;
          }
          cum = frente.cum + GAP_MINIMO + rng() * 0.2;
          break;
        }
        if (c.fora) continue;
        const frente = fila[idx - 1];
        if (frente) cum = Math.max(cum, frente.cum + GAP_MINIMO);
        c.cum = cum;
        fila.splice(idx, 0, c);
        for (let k = idx + 1; k < fila.length; k++) fila[k]!.cum = Math.max(fila[k]!.cum, fila[k - 1]!.cum + GAP_MINIMO);
      }
      // Limites de pista: três avisos, bandeira preta e branca, depois punições.
      for (const c of fila) {
        if (largadaParada || rng() >= chanceLimites * (1 + (88 - c.p.atributos.consistencia) * 0.06)) continue;
        c.limites++;
        if (c.limites === 3) evento(volta, 'limites', `Bandeira preta e branca para ${nomeDe(c)} por limites de pista`, [c]);
        if (c.limites >= 4) {
          const s = c.limites === 4 ? 5 : 10;
          c.punicao += s;
          evento(volta, 'punicao', `${nomeDe(c)} leva ${s} segundos de punição por limites de pista`, [c]);
        }
      }
    }

    for (const c of fila) {
      c.cum += c.atraso;
      c.atraso = 0;
    }
    fila.sort((a, b) => a.cum - b.cum);
    for (const c of fila) {
      const tempo = c.cum - c.tempos[c.tempos.length - 1]!;
      c.tempos.push(c.cum);
      // Intermediário em pista quase seca superaquece e gasta o dobro.
      c.idade += c.pneu === 'intermediario' && aguaVolta < 0.2 ? 2 : 1;
      if (!neutra && !c.pitando && !largadaParada && tempo < c.melhorVolta) c.melhorVolta = tempo;
      if (!neutra && !c.pitando && !largadaParada && (!voltaRapida || tempo < voltaRapida.tempo)) {
        voltaRapida = { pilotoId: c.p.id, volta, tempo };
      }
    }
    ordem = [...fila.filter((c) => !c.fora), ...carros.filter((c) => c.fora)];
    agua.push(aguaVolta);

    // Undercuts se resolvem quando o alvo também para.
    for (let k = undercuts.length - 1; k >= 0; k--) {
      const u = undercuts[k]!;
      if (u.atacante.fora || u.alvo.fora || volta - u.volta > 12) {
        undercuts.splice(k, 1);
        continue;
      }
      if (u.alvo.paradas < u.atacante.paradas || u.alvo.pitando) continue;
      const passou = ordem.indexOf(u.atacante) < ordem.indexOf(u.alvo);
      evento(
        volta,
        'undercut',
        passou ? `O undercut deu certo: ${nomeDe(u.atacante)} sai na frente de ${nomeDe(u.alvo)}` : `${nomeDe(u.alvo)} segura ${nomeDe(u.atacante)} e o undercut não funciona`,
        [u.atacante, u.alvo],
      );
      undercuts.splice(k, 1);
    }
    registrarEstado(pitaram);
  }

  // Disputa entre dois carros. Pode terminar em ultrapassagem, defesa ou toque.
  function disputar(atacante: Carro, defensor: Carro, cum: number, volta: number, relargada: boolean, aguaVolta: number): 'passou' | 'segurou' {
    const aa = atacante.p.atributos;
    const ad = defensor.p.atributos;
    const agressivo = atacante.agressivoAte >= volta && atacante.agressivoContra === defensor.p.id;
    const vantagem = defensor.cum - cum;
    const companheiros = atacante.equipe.id === defensor.equipe.id;
    // "Cabeça quente" e "sujo" não se somam na mesma disputa.
    const sujoA = agressivo ? 0 : intensidade(atacante.p, 'sujo_roda_a_roda') + (companheiros ? intensidade(atacante.p, 'sujo_companheiro') : 0);
    const sujoD = intensidade(defensor.p, 'sujo_roda_a_roda') + (companheiros ? intensidade(defensor.p, 'sujo_companheiro') : 0);
    const defesa = ad.defesa + 3 * sujoD;
    const rodaA = aa.rodaARoda + 3 * sujoA;
    // Cada zona de modo de ultrapassagem é mais uma chance de chegar junto e tentar.
    const facilidade = 0.05 + 0.5 * pista.perfil.ultrapassagem + 0.04 * zonas;
    let chance = facilidade * (0.6 + vantagem * 0.8 + (aa.ultrapassagem - defesa) * 0.02 + (rodaA - ad.rodaARoda) * 0.008);
    if (agressivo) chance *= 1.2;
    if (relargada) chance *= 1.3;
    chance = limitar(chance, 0.01, 0.9);

    let toque = 0.01 * (1 + sujoA) * (1 + sujoD) * (agressivo ? 3 : 1) * (1 + pesoDaChuva(aguaVolta));
    toque *= 1 - 0.5 * intensidade(atacante.p, 'roda_a_roda_limpo');
    toque *= 1 - 0.5 * intensidade(defensor.p, 'roda_a_roda_limpo');
    if (rng() < toque) {
      const culpado = rng() < 0.7 ? atacante : defensor;
      const vitima = culpado === atacante ? defensor : atacante;
      const limpo = intensidade(culpado.p, 'roda_a_roda_limpo');
      const sujo = culpado === atacante ? sujoA : sujoD;
      evento(volta, 'toque', `Toque entre ${nomeDe(atacante)} e ${nomeDe(defensor)}`, [atacante, defensor]);
      if (rng() < 0.6 * (1 + 0.5 * sujo) * (1 - 0.5 * limpo)) {
        culpado.punicao += 5;
        evento(volta, 'punicao', `${nomeDe(culpado)} leva 5 segundos de punição`, [culpado]);
      }
      if (rng() < 0.35) {
        abandonar(vitima, volta, 'Toque');
        evento(volta, 'batida', `${nomeDe(vitima)} fica fora depois do toque`, [vitima]);
        neutralizar(volta, 0.4, 0.3, 0.04);
        return vitima === defensor ? 'passou' : 'segurou';
      }
      vitima.atraso += 3 + rng() * 6;
      return vitima === defensor ? 'passou' : 'segurou';
    }

    if (rng() < chance) {
      const raiva = intensidade(defensor.p, 'cabeca_quente');
      if (raiva > 0 && rng() < 0.15 * raiva) {
        defensor.agressivoAte = volta + 2;
        defensor.agressivoContra = atacante.p.id;
      }
      return 'passou';
    }
    return 'segurou';
  }

  // Bandeirada. Corrida completa: quem tomou volta termina na primeira vez que cruza a linha
  // depois do líder. Corrida encerrada pela bandeira vermelha: vale a ordem da volta anterior.
  let chegaram: Carro[];
  if (encerrada) {
    const ordemFinal = estados[voltas]!;
    const posicao = new Map(ordemFinal.map((e) => [e.pilotoId, e.posicao]));
    chegaram = carros.filter((c) => !c.fora).sort((a, b) => posicao.get(a.p.id)! - posicao.get(b.p.id)!);
  } else {
    const lider = ordem.find((c) => !c.fora)!;
    const tempoLider = lider.tempos[voltas]!;
    for (const c of carros) {
      if (c.fora) continue;
      const fim = c.tempos.findIndex((t, i) => i > 0 && t >= tempoLider);
      if (fim > 0) c.tempos = c.tempos.slice(0, fim + 1);
    }
    chegaram = carros
      .filter((c) => !c.fora)
      .sort((a, b) => b.tempos.length - a.tempos.length || a.tempos[a.tempos.length - 1]! + a.punicao - (b.tempos[b.tempos.length - 1]! + b.punicao));
  }

  const pontos = pontosPorDistancia(tabelaPontos, voltas, voltasPrevistas);
  const voltasDe = (c: Carro) => (encerrada ? Math.min(voltas, c.tempos.length - 1) : c.tempos.length - 1);
  const tempoDe = (c: Carro) => (encerrada ? c.tempos[Math.min(voltas, c.tempos.length - 1)]! : c.tempos[c.tempos.length - 1]!);
  const abandonaram = carros.filter((c) => c.fora).sort((a, b) => b.tempos.length - a.tempos.length);
  const resultado: ResultadoPiloto[] = [...chegaram, ...abandonaram].map((c, i) => ({
    pilotoId: c.p.id,
    equipeId: c.equipe.id,
    posicao: i + 1,
    largada: largadaDe.get(c.p.id)!,
    status: c.fora ? 'abandonou' : 'chegou',
    motivo: c.motivo,
    voltas: voltasDe(c),
    tempoTotal: tempoDe(c) + c.punicao,
    punicao: c.punicao,
    pontos: c.fora ? 0 : (pontos[i] ?? 0),
    paradas: c.paradas,
    melhorVolta: c.melhorVolta,
    pneus: c.usados,
  }));
  const vencedor = chegaram[0]!;
  const nomeDaCorrida = tipo === 'sprint' ? `a sprint em ${pista.nome}` : `em ${pista.nome}`;
  evento(encerrada ? voltas + 1 : voltas, 'bandeirada', `${nomeDe(vencedor)} vence ${nomeDaCorrida}`, [vencedor]);
  if (pontos !== tabelaPontos && pontos.length > 0) {
    evento(voltas + 1, 'bandeirada', `Menos de 75% da distância: pontuação reduzida`, []);
  }

  return {
    pistaId: pista.id,
    categoria,
    tipo,
    clima: molhadoNaLargada ? 'molhado' : 'seco',
    agua,
    voltas,
    voltasPrevistas,
    tempoVolta,
    semente,
    pneus,
    classificacao,
    grid: ordemGrid.map((c) => ({ pilotoId: c.p.id, tempo: temposDeGrid.get(c.p.id) ?? Infinity })),
    tempos: Object.fromEntries(carros.map((c) => [c.p.id, c.tempos])),
    paradas: Object.fromEntries(carros.map((c) => [c.p.id, c.box.filter((b) => b.volta < c.tempos.length)])),
    abandonos,
    neutralizacoes,
    estados,
    eventos,
    resultado,
    voltaMaisRapida: voltaRapida,
    quebrasDeMotor,
  };
}

const NOME_PNEU: Record<Composto, string> = { macio: 'macio', medio: 'médio', duro: 'duro', intermediario: 'intermediário', chuva: 'de chuva' };

// Grid de uma categoria a partir dos dados da temporada: titulares, no máximo dois por equipe.
export function montarGrid<T extends PilotoNaCorrida & { papel?: string }>(pilotos: T[], categoria: Categoria): T[] {
  const porEquipe = new Map<string, number>();
  return pilotos.filter((p) => {
    if (p.categoria !== categoria || (p.papel && p.papel !== 'titular')) return false;
    const n = porEquipe.get(p.equipeId) ?? 0;
    porEquipe.set(p.equipeId, n + 1);
    return n < 2;
  });
}


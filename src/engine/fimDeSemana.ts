// Um fim de semana inteiro: treinos livres, classificação, sprint (quando tem) e corrida.
// F1 normal: TL1, TL2, TL3, classificação e corrida.
// F1 sprint: TL1, classificação sprint (SQ1 a SQ3), sprint, classificação e corrida.
// F2: um treino, classificação, sprint (grid com os 10 primeiros invertidos) e corrida principal.
import type { Categoria, Equipe, Pista } from './types.ts';
import { criarRng, type Rng } from './rng.ts';
import { aguaNaVolta, sortearClima, type Clima, type Condicao } from './clima.ts';
import { aplicarPunicoesDeGrid, classificar, formatoQuali, type Classificacao, type ConcorrenteQuali, type LinhaClassificacao } from './classificacao.ts';
import { simularCorrida, type Corrida, type PilotoNaCorrida } from './corrida.ts';
import { alocacaoInicial, compostoIdeal, estimarPneus, perdaPorAgua, sortearPneus, type Composto, type JogosDePneus, type PneusDoFimDeSemana } from './pneus.ts';
import { combinar, gauss, intensidade, notaCarro, notaMolhado, pesoDaChuva, SEGUNDOS_POR_PONTO } from './ritmo.ts';
import {
  aprenderComCorrida,
  aprendizadoVazio,
  conhecimentoDaEquipe,
  perdaDeAcerto,
  simularTreino,
  sortearAcertoInicial,
  type CarroNoTreino,
  type SessaoTreino,
} from './treinos.ts';

export type SessaoId = 'TL1' | 'TL2' | 'TL3' | 'SQ' | 'SPRINT' | 'Q' | 'CORRIDA';

export const NOME_SESSAO: Record<SessaoId, string> = {
  TL1: 'Treino Livre 1',
  TL2: 'Treino Livre 2',
  TL3: 'Treino Livre 3',
  SQ: 'Classificação Sprint',
  SPRINT: 'Sprint',
  Q: 'Classificação',
  CORRIDA: 'Corrida',
};

export const PONTOS_SPRINT_F2 = [10, 8, 6, 5, 4, 3, 2, 1];

export interface ParametrosFimDeSemana {
  pista: Pista;
  categoria: Categoria;
  pilotos: PilotoNaCorrida[];
  equipes: Equipe[];
  semente: number;
  sprint: boolean; // na F1; a F2 sempre tem sprint e corrida principal
  clima?: Clima; // força o tempo de todas as sessões
  punicoesDeGrid?: Record<string, number>; // posições perdidas na largada da corrida
}

export interface FimDeSemana {
  pistaId: string;
  categoria: Categoria;
  sprint: boolean;
  semente: number;
  sessoes: SessaoId[];
  clima: Partial<Record<SessaoId, Condicao>>;
  pneus: PneusDoFimDeSemana; // comportamento real
  leitura: PneusDoFimDeSemana; // o que o paddock descobriu nos treinos
  conhecimento: Record<string, number>; // por equipe, de 0 a 1
  acerto: Record<string, number>; // por piloto, segundos por volta na corrida
  treinos: SessaoTreino[];
  sprintQuali?: Classificacao;
  gridSprint?: LinhaClassificacao[];
  sprintCorrida?: Corrida;
  quali: Classificacao;
  gridCorrida: LinhaClassificacao[];
  corrida: Corrida;
  jogosNaLargada: Record<string, JogosDePneus>; // jogos de pneus de cada piloto antes da corrida
}

const tempoBase = (pista: Pista, categoria: Categoria) => pista.tempoVolta * (categoria === 'F1' ? 1 : 1.07);

// Voltas de cada corrida. A sprint da F1 tem cerca de 100 km; na F2, 120 km na sprint e 170 km
// na principal, sem passar de 45 e 60 minutos.
export function voltasDaCorrida(pista: Pista, categoria: Categoria, tipo: 'principal' | 'sprint'): number {
  const km = pista.comprimento ?? 5000;
  if (categoria === 'F1') return tipo === 'principal' ? pista.voltas : Math.ceil(100000 / km);
  const volta = tempoBase(pista, categoria);
  const [distancia, minutos] = tipo === 'principal' ? [170000, 60] : [120000, 45];
  return Math.min(Math.round(distancia / km), Math.floor((minutos * 60) / volta));
}

export function sessoesDoFimDeSemana(categoria: Categoria, sprint: boolean): SessaoId[] {
  if (categoria === 'F2') return ['TL1', 'Q', 'SPRINT', 'CORRIDA'];
  return sprint ? ['TL1', 'SQ', 'SPRINT', 'Q', 'CORRIDA'] : ['TL1', 'TL2', 'TL3', 'Q', 'CORRIDA'];
}

const subSemente = (rng: Rng) => Math.floor(rng() * 2 ** 32);

function media(estimativas: PneusDoFimDeSemana[], real: PneusDoFimDeSemana, conhecimento: number): PneusDoFimDeSemana {
  const saida = {} as PneusDoFimDeSemana;
  for (const k of Object.keys(real) as Composto[]) {
    const n = estimativas.length;
    saida[k] = {
      ritmo: estimativas.reduce((s, e) => s + e[k].ritmo, 0) / n,
      desgaste: estimativas.reduce((s, e) => s + e[k].desgaste, 0) / n,
      vida: estimativas.reduce((s, e) => s + e[k].vida, 0) / n,
      // As surpresas só aparecem quando as equipes rodaram o suficiente para perceber.
      nota: conhecimento > 0.45 ? real[k].nota : undefined,
    };
  }
  return saida;
}

export function simularFimDeSemana(params: ParametrosFimDeSemana): FimDeSemana {
  const { pista, categoria, pilotos } = params;
  const daCategoria = new Set(pilotos.map((p) => p.equipeId));
  const equipes = params.equipes.filter((e) => daCategoria.has(e.id));
  const rng = criarRng(params.semente);
  const sprint = categoria === 'F2' || params.sprint;
  const sessoes = sessoesDoFimDeSemana(categoria, params.sprint);
  const voltasSprint = voltasDaCorrida(pista, categoria, 'sprint');
  const voltasCorrida = voltasDaCorrida(pista, categoria, 'principal');
  const clima = sortearClima(
    pista,
    sessoes.map((id) => ({ id, voltas: id === 'CORRIDA' ? voltasCorrida : id === 'SPRINT' ? voltasSprint : 0 })),
    rng,
    params.clima,
  );
  const pneus = sortearPneus(pista, rng);
  const tempo = tempoBase(pista, categoria);
  const equipePorId = new Map(equipes.map((e) => [e.id, e]));
  const jogos: Record<string, JogosDePneus> = Object.fromEntries(pilotos.map((p) => [p.id, alocacaoInicial(categoria === 'F1' && params.sprint)]));
  const acertoBase: Record<string, number> = Object.fromEntries(pilotos.map((p) => [p.id, sortearAcertoInicial(rng)]));
  const forma: Record<string, number> = Object.fromEntries(pilotos.map((p) => [p.id, gauss(rng) * (0.1 + (100 - p.atributos.consistencia) * 0.006)]));
  const ap = aprendizadoVazio();

  // Volta rápida de cada piloto (sem a perda de acerto), em função da água na pista.
  const ritmoQuali = (p: PilotoNaCorrida) => {
    const equipe = equipePorId.get(p.equipeId)!;
    const seco = combinar(categoria, p.atributos.quali, notaCarro(equipe, pista));
    const chuva = combinar(categoria, notaMolhado(p, p.atributos.quali), notaCarro(equipe, pista));
    return (w: number) => {
      const m = pesoDaChuva(w);
      const ideal = compostoIdeal(w);
      return tempo - 1.8 + 6 * w + (ideal === 'seco' ? 0 : perdaPorAgua(ideal, w)) - SEGUNDOS_POR_PONTO * (seco * (1 - m) + chuva * m - 85) + forma[p.id]!;
    };
  };
  const ritmos = new Map(pilotos.map((p) => [p.id, ritmoQuali(p)]));

  // Treinos livres.
  const treinos: SessaoTreino[] = [];
  const carrosTreino: CarroNoTreino[] = pilotos.map((p) => {
    const equipe = equipePorId.get(p.equipeId)!;
    return { piloto: p, equipe, ritmo: ritmos.get(p.id)!, confiabilidade: equipe.sistemas.confiabilidade, jogos: jogos[p.id]! };
  });
  for (const id of sessoes.filter((s) => s.startsWith('TL'))) {
    const nome = categoria === 'F2' ? 'Treino Livre' : NOME_SESSAO[id];
    treinos.push(simularTreino(nome, carrosTreino, aguaNaVolta(clima[id]!, 0), ap, acertoBase, rng));
  }

  const lerPneus = () => {
    const conhecimento = Object.fromEntries(equipes.map((e) => [e.id, conhecimentoDaEquipe(ap, e)]));
    const estimativas = Object.fromEntries(equipes.map((e) => [e.id, estimarPneus(pneus, conhecimento[e.id]!, rng)]));
    const medio = equipes.reduce((s, e) => s + conhecimento[e.id]!, 0) / equipes.length;
    return { conhecimento, estimativas, leitura: media(Object.values(estimativas), pneus, medio) };
  };
  // Parque fechado: o acerto da classificação vale para a corrida.
  const acertoAtual = () => Object.fromEntries(pilotos.map((p) => [p.id, perdaDeAcerto(ap, p, acertoBase[p.id]!)]));

  const concorrentes = (acerto: Record<string, number>, agua: number): ConcorrenteQuali[] =>
    pilotos.map((p) => {
      const a = p.atributos;
      const m = pesoDaChuva(agua);
      return {
        id: p.id,
        ritmo: (w: number) => ritmos.get(p.id)!(w) + acerto[p.id]!,
        sigma: (0.08 + (100 - a.consistencia) * 0.005) * (1 + 0.8 * m),
        chanceErro: 0.03 + 0.06 * intensidade(p, 'erros_graves') + 0.05 * m,
        chanceBatida: 0.003 + 0.006 * intensidade(p, 'erros_graves') + 0.02 * m,
        jogos: jogos[p.id],
      };
    });
  const aguaQuali = (id: SessaoId) => [0, 1, 2].map((i) => aguaNaVolta(clima[id]!, i * 4));

  const correr = (
    id: 'SPRINT' | 'CORRIDA',
    grid: string[],
    tipo: 'principal' | 'sprint',
    estimativas: Record<string, PneusDoFimDeSemana>,
    acerto: Record<string, number>,
  ) =>
    simularCorrida({
      pista,
      categoria,
      pilotos,
      equipes,
      semente: subSemente(rng),
      condicao: clima[id],
      grid,
      tipo,
      voltas: tipo === 'principal' ? voltasCorrida : voltasSprint,
      pontos: categoria === 'F2' && tipo === 'sprint' ? PONTOS_SPRINT_F2 : undefined,
      paradaObrigatoria: tipo === 'principal',
      pneus,
      estimativas,
      acerto,
      jogos,
    });

  let sprintQuali: Classificacao | undefined;
  let gridSprint: LinhaClassificacao[] | undefined;
  let sprintCorrida: Corrida | undefined;

  // Sprint da F1: classificação sprint e sprint vêm antes da classificação da corrida.
  if (categoria === 'F1' && params.sprint) {
    const leitura = lerPneus();
    const acerto = acertoAtual();
    sprintQuali = classificar(concorrentes(acerto, aguaQuali('SQ')[0]!), 'SPRINT', { agua: aguaQuali('SQ'), tempoVolta: tempo, pneus }, rng);
    gridSprint = sprintQuali.grid;
    sprintCorrida = correr('SPRINT', gridSprint.map((l) => l.pilotoId), 'sprint', leitura.estimativas, acerto);
    // Depois da sprint o parque fechado abre: as voltas de corrida ajudam no acerto e nos pneus.
    aprenderComCorrida(
      ap,
      sprintCorrida.resultado.map((r) => ({ pilotoId: r.pilotoId, equipeId: r.equipeId, voltas: r.voltas })),
    );
  }

  const leitura = lerPneus();
  const acerto = acertoAtual();
  const quali = classificar(concorrentes(acerto, aguaQuali('Q')[0]!), formatoQuali(categoria, params.sprint), { agua: aguaQuali('Q'), tempoVolta: tempo, pneus }, rng);
  const gridCorrida = aplicarPunicoesDeGrid(quali.grid, params.punicoesDeGrid ?? {});

  // F2: a sprint larga com os 10 primeiros da classificação invertidos.
  if (categoria === 'F2') {
    const ordem = quali.grid.map((l) => l.pilotoId);
    const invertido = [...ordem.slice(0, 10).reverse(), ...ordem.slice(10)];
    gridSprint = invertido.map((id, i) => ({ ...quali.grid.find((l) => l.pilotoId === id)!, posicao: i + 1 }));
    sprintCorrida = correr('SPRINT', invertido, 'sprint', leitura.estimativas, acerto);
    bonusF2(sprintCorrida, null);
  }

  const jogosNaLargada = structuredClone(jogos);
  const corrida = correr('CORRIDA', gridCorrida.map((l) => l.pilotoId), 'principal', leitura.estimativas, acerto);
  if (categoria === 'F2') bonusF2(corrida, gridCorrida[0]?.pilotoId ?? null);

  return {
    pistaId: pista.id,
    categoria,
    sprint,
    semente: params.semente,
    sessoes,
    clima,
    pneus,
    leitura: leitura.leitura,
    conhecimento: leitura.conhecimento,
    acerto,
    treinos,
    sprintQuali,
    gridSprint,
    sprintCorrida,
    quali,
    gridCorrida,
    corrida,
    jogosNaLargada,
  };
}

// Pontos extras da F2: volta mais rápida (entre os 10 primeiros) e pole na corrida principal.
function bonusF2(corrida: Corrida, pole: string | null) {
  const rapida = corrida.voltaMaisRapida?.pilotoId;
  for (const r of corrida.resultado) {
    if (r.status === 'chegou' && r.pilotoId === rapida && r.posicao <= 10) r.pontos += 1;
    if (r.pilotoId === pole) r.pontos += 2;
  }
}

// Campeonato: calendário, resultados etapa por etapa, tabelas de pilotos e equipes e o uso de
// unidades de potência na F1 (passar do limite custa posições no grid).
import type { Categoria, Equipe, Pista } from './types.ts';
import type { Rng } from './rng.ts';
import type { Corrida } from './corrida.ts';
import type { FimDeSemana } from './fimDeSemana.ts';

// Fins de semana sprint da F1 em 2026.
export const SPRINTS_2026 = ['shanghai', 'miami', 'villeneuve', 'silverstone', 'zandvoort', 'marina_bay'];
// Etapas da F2 em 2026 dentro do calendário que temos (aproximado).
export const F2_2026 = ['albert_park', 'monaco', 'catalunya', 'red_bull_ring', 'silverstone', 'spa', 'hungaroring', 'monza', 'madring', 'baku', 'losail', 'yas_marina'];

export const LIMITE_MOTORES = 4; // unidades de potência por temporada (simplificado)

export interface Rodada {
  numero: number;
  pistaId: string;
  data?: string;
  sprint: boolean;
  f2: boolean;
}

export interface ResultadoResumido {
  pilotoId: string;
  equipeId: string;
  posicao: number;
  largada: number;
  pontos: number;
  status: 'chegou' | 'abandonou';
}

export interface ResultadoDaCategoria {
  pole: string;
  sprint?: ResultadoResumido[];
  corrida: ResultadoResumido[];
  voltaMaisRapida?: string;
}

export interface ResultadoRodada {
  rodada: number;
  F1: ResultadoDaCategoria;
  F2?: ResultadoDaCategoria;
}

export interface Motor {
  usados: number; // unidades já usadas na temporada (a atual conta)
  corridas: number; // corridas da unidade atual
  vida: number; // corridas que a unidade atual aguenta
  quebrou?: boolean;
}

export interface TrocaDeMotor {
  pilotoId: string;
  unidade: number;
  punicao: number;
}

export interface Campeonato {
  versao: 1;
  ano: number;
  rodadas: Rodada[];
  resultados: ResultadoRodada[];
  motores: Record<string, Motor>;
  trocas: Record<number, TrocaDeMotor[]>; // por rodada
  sementes: Record<number, number>; // semente sorteada para cada etapa, ao começar
}

export function criarCampeonato(ano: number, pistas: Pista[]): Campeonato {
  const rodadas = [...pistas]
    .sort((a, b) => (a.rodada ?? 0) - (b.rodada ?? 0))
    .map((p, i) => ({ numero: i + 1, pistaId: p.id, data: p.data, sprint: SPRINTS_2026.includes(p.id), f2: F2_2026.includes(p.id) }));
  return { versao: 1, ano, rodadas, resultados: [], motores: {}, trocas: {}, sementes: {} };
}

export const proximaRodada = (c: Campeonato) => c.rodadas[c.resultados.length];
export const terminado = (c: Campeonato) => c.resultados.length >= c.rodadas.length;

// Antes de cada etapa: quem precisa de motor novo. Passar do limite custa 10 posições na primeira
// vez e 5 nas seguintes.
export function trocasDeMotor(c: Campeonato, pilotos: { id: string; equipeId: string }[], equipes: Equipe[], rng: Rng): { motores: Record<string, Motor>; trocas: TrocaDeMotor[]; punicoes: Record<string, number> } {
  const confiab = new Map(equipes.map((e) => [e.id, e.sistemas.confiabilidade]));
  const vidaNova = (equipeId: string) => Math.max(3, Math.round(7 + ((confiab.get(equipeId) ?? 80) - 80) * 0.15 + (rng() - 0.5) * 2));
  const motores: Record<string, Motor> = structuredClone(c.motores);
  const trocas: TrocaDeMotor[] = [];
  const punicoes: Record<string, number> = {};
  for (const p of pilotos) {
    const m = motores[p.id];
    if (!m) {
      motores[p.id] = { usados: 1, corridas: 0, vida: vidaNova(p.equipeId) };
      continue;
    }
    if (!m.quebrou && m.corridas < m.vida) continue;
    const unidade = m.usados + 1;
    const punicao = unidade <= LIMITE_MOTORES ? 0 : unidade === LIMITE_MOTORES + 1 ? 10 : 5;
    motores[p.id] = { usados: unidade, corridas: 0, vida: vidaNova(p.equipeId) };
    trocas.push({ pilotoId: p.id, unidade, punicao });
    if (punicao) punicoes[p.id] = punicao;
  }
  return { motores, trocas, punicoes };
}

const resumir = (corrida: Corrida): ResultadoResumido[] =>
  corrida.resultado.map((r) => ({ pilotoId: r.pilotoId, equipeId: r.equipeId, posicao: r.posicao, largada: r.largada, pontos: r.pontos, status: r.status }));

function resumirFimDeSemana(f: FimDeSemana): ResultadoDaCategoria {
  return {
    pole: f.quali.grid[0]!.pilotoId,
    sprint: f.sprintCorrida ? resumir(f.sprintCorrida) : undefined,
    corrida: resumir(f.corrida),
    voltaMaisRapida: f.corrida.voltaMaisRapida?.pilotoId,
  };
}

export function registrarRodada(c: Campeonato, rodada: number, f1: FimDeSemana, f2: FimDeSemana | undefined, motores: Record<string, Motor>, trocas: TrocaDeMotor[]): Campeonato {
  // Cada corrida gasta a unidade de potência; quebra de motor obriga a trocar na próxima etapa.
  const novos = structuredClone(motores);
  const quebraram = new Set([...(f1.sprintCorrida?.quebrasDeMotor ?? []), ...f1.corrida.quebrasDeMotor]);
  for (const id of Object.keys(novos)) {
    if (!f1.corrida.tempos[id]) continue;
    novos[id]!.corridas += 1;
    if (quebraram.has(id)) novos[id]!.quebrou = true;
  }
  return {
    ...c,
    resultados: [...c.resultados, { rodada, F1: resumirFimDeSemana(f1), F2: f2 ? resumirFimDeSemana(f2) : undefined }],
    motores: novos,
    trocas: { ...c.trocas, [rodada]: trocas },
  };
}

export interface LinhaPilotos {
  pilotoId: string;
  equipeId: string;
  pontos: number;
  vitorias: number;
  podios: number;
  poles: number;
  posicoes: number[]; // posição em cada corrida principal (0 = não correu)
}

export interface LinhaEquipes {
  equipeId: string;
  pontos: number;
  vitorias: number;
}

// Desempate como na F1: mais vitórias, depois mais segundos lugares, e assim por diante.
function desempatar<T extends { pontos: number; posicoes: number[] }>(a: T, b: T): number {
  if (b.pontos !== a.pontos) return b.pontos - a.pontos;
  for (let pos = 1; pos <= 22; pos++) {
    const na = a.posicoes.filter((p) => p === pos).length;
    const nb = b.posicoes.filter((p) => p === pos).length;
    if (na !== nb) return nb - na;
  }
  return 0;
}

export function tabelaPilotos(c: Campeonato, categoria: Categoria): LinhaPilotos[] {
  const linhas = new Map<string, LinhaPilotos>();
  const linha = (pilotoId: string, equipeId: string) => {
    let l = linhas.get(pilotoId);
    if (!l) {
      l = { pilotoId, equipeId, pontos: 0, vitorias: 0, podios: 0, poles: 0, posicoes: [] };
      linhas.set(pilotoId, l);
    }
    l.equipeId = equipeId;
    return l;
  };
  for (const r of c.resultados) {
    const cat = r[categoria];
    if (!cat) continue;
    for (const x of cat.sprint ?? []) linha(x.pilotoId, x.equipeId).pontos += x.pontos;
    for (const x of cat.corrida) {
      const l = linha(x.pilotoId, x.equipeId);
      l.pontos += x.pontos;
      if (x.status === 'chegou') {
        if (x.posicao === 1) l.vitorias++;
        if (x.posicao <= 3) l.podios++;
        l.posicoes.push(x.posicao);
      } else l.posicoes.push(0);
    }
    const pole = linhas.get(cat.pole);
    if (pole) pole.poles++;
  }
  return [...linhas.values()].sort(desempatar);
}

export function tabelaEquipes(c: Campeonato, categoria: Categoria): LinhaEquipes[] {
  const linhas = new Map<string, LinhaEquipes & { posicoes: number[] }>();
  for (const r of c.resultados) {
    const cat = r[categoria];
    if (!cat) continue;
    for (const x of [...(cat.sprint ?? []), ...cat.corrida]) {
      const l = linhas.get(x.equipeId) ?? { equipeId: x.equipeId, pontos: 0, vitorias: 0, posicoes: [] };
      l.pontos += x.pontos;
      linhas.set(x.equipeId, l);
    }
    for (const x of cat.corrida) {
      const l = linhas.get(x.equipeId)!;
      if (x.status === 'chegou') {
        l.posicoes.push(x.posicao);
        if (x.posicao === 1) l.vitorias++;
      }
    }
  }
  return [...linhas.values()].sort(desempatar).map(({ equipeId, pontos, vitorias }) => ({ equipeId, pontos, vitorias }));
}

// Primeira versão do cálculo de overall, a partir dos dados brutos da temporada.
// Os pesos são o ponto de partida para balancear, não verdade absoluta.
import type { DadosF1 } from '../f1/jolpica.ts';
import type { ClassificacaoF2 } from '../f2/wikipedia.ts';

export interface AtributosCalculados {
  ritmo: number;
  consistencia: number;
  chuva: number;
  ultrapassagem: number;
  defesa: number;
}

export interface PilotoCalculado {
  id: string;
  nome: string;
  categoria: 'F1' | 'F2';
  equipe: string;
  papel: 'titular' | 'reserva';
  overall: number;
  atributos: AtributosCalculados;
  // Números que explicam a nota, para a revisão.
  base: Record<string, number>;
}

export interface EquipeCalculada {
  id: string;
  nome: string;
  overall: number;
  areas: { motor: number; aerodinamica: number; chassi: number; estrategia: number; pitStop: number };
}

// Fornecedor de unidade de potência em 2026.
export const MOTORES_2026: Record<string, string> = {
  mercedes: 'Mercedes', mclaren: 'Mercedes', williams: 'Mercedes', alpine: 'Mercedes',
  ferrari: 'Ferrari', haas: 'Ferrari', cadillac: 'Ferrari',
  red_bull: 'Red Bull Ford', rb: 'Red Bull Ford',
  aston_martin: 'Honda',
  audi: 'Audi',
};

const PESOS = { ritmo: 0.35, consistencia: 0.2, chuva: 0.1, ultrapassagem: 0.2, defesa: 0.15 };

export const limitar = (v: number, min = 40, max = 99) => Math.round(Math.min(max, Math.max(min, v)));

export function overallDosAtributos(a: AtributosCalculados): number {
  return limitar(
    a.ritmo * PESOS.ritmo + a.consistencia * PESOS.consistencia + a.chuva * PESOS.chuva +
      a.ultrapassagem * PESOS.ultrapassagem + a.defesa * PESOS.defesa,
  );
}

// Fração de duelos vencidos contra o companheiro, com 1 duelo fictício de empate
// para não dar 100% ou 0% com poucas corridas.
function duelos(minhas: Map<number, number>, dele: Map<number, number>): number {
  let vitorias = 0.5;
  let total = 1;
  for (const [rodada, pos] of minhas) {
    const outra = dele.get(rodada);
    if (outra === undefined) continue;
    total++;
    if (pos < outra) vitorias++;
  }
  return vitorias / total;
}

export function calcularF1(dados: DadosF1): { pilotos: PilotoCalculado[]; equipes: EquipeCalculada[] } {
  const ultimaRodada = Math.max(...dados.resultados.map((r) => r.rodada));
  const titulares = new Set(dados.resultados.filter((r) => r.rodada === ultimaRodada).map((r) => r.pilotoId));
  const maxPontosEquipe = Math.max(...dados.equipes.map((e) => e.pontos));
  // Força do carro de 0 a 1, pelos pontos de construtores (raiz para não esmagar o pelotão do meio).
  const forca = new Map(dados.equipes.map((e) => [e.id, Math.sqrt(e.pontos / maxPontosEquipe)]));

  const quali = new Map<string, Map<number, number>>();
  for (const q of dados.classificatorios) {
    if (!quali.has(q.pilotoId)) quali.set(q.pilotoId, new Map());
    quali.get(q.pilotoId)!.set(q.rodada, q.posicao);
  }
  const corrida = new Map<string, Map<number, number>>();
  for (const r of dados.resultados) {
    if (!corrida.has(r.pilotoId)) corrida.set(r.pilotoId, new Map());
    // Abandono conta como último lugar no duelo de corrida.
    corrida.get(r.pilotoId)!.set(r.rodada, r.chegada ?? 99);
  }

  const pilotos = dados.pilotos.map((p): PilotoCalculado => {
    const meus = dados.resultados.filter((r) => r.pilotoId === p.id);
    const companheiros = dados.pilotos.filter((o) => o.id !== p.id && o.equipeId === p.equipeId).map((o) => o.id);
    const media = (f: (c: string) => number) =>
      companheiros.length ? companheiros.reduce((s, c) => s + f(c), 0) / companheiros.length : 0.5;
    const q = media((c) => duelos(quali.get(p.id) ?? new Map(), quali.get(c) ?? new Map()));
    const r = media((c) => duelos(corrida.get(p.id) ?? new Map(), corrida.get(c) ?? new Map()));
    const largou = meus.filter((m) => m.status !== 'Did not start');
    const abandonos = largou.filter((m) => m.chegada === null).length / Math.max(1, largou.length);
    const ganhos = largou.filter((m) => m.chegada !== null && m.largada > 0);
    const ganhoMedio = ganhos.reduce((s, m) => s + (m.largada - m.chegada!), 0) / Math.max(1, ganhos.length);
    const t = forca.get(p.equipeId) ?? 0;

    // Nível geral: parte vem do carro em que o piloto anda (equipes boas contratam bons pilotos),
    // parte de como ele se sai contra quem tem o mesmo carro.
    const nivel = 70 + 14 * t + 18 * (q - 0.5) + 12 * (r - 0.5);
    const atributos: AtributosCalculados = {
      ritmo: limitar(nivel + 10 * (q - 0.5)),
      consistencia: limitar(nivel + 6 - 40 * abandonos),
      chuva: limitar(nivel), // sem dado de corrida na chuva ainda
      ultrapassagem: limitar(nivel + Math.max(-6, Math.min(6, ganhoMedio))),
      defesa: limitar(nivel + 8 * (r - q)),
    };
    return {
      id: p.id,
      nome: p.nome,
      categoria: 'F1',
      equipe: p.equipeId,
      papel: titulares.has(p.id) ? 'titular' : 'reserva',
      overall: overallDosAtributos(atributos),
      atributos,
      base: {
        forcaCarro: +t.toFixed(2),
        dueloQuali: +q.toFixed(2),
        dueloCorrida: +r.toFixed(2),
        abandonos: +abandonos.toFixed(2),
        posicoesGanhas: +ganhoMedio.toFixed(1),
      },
    };
  });

  // Motor: média da força das equipes que usam cada fornecedor.
  const motores = new Map<string, number[]>();
  for (const e of dados.equipes) {
    const m = MOTORES_2026[e.id] ?? e.id;
    motores.set(m, [...(motores.get(m) ?? []), forca.get(e.id) ?? 0]);
  }
  const forcaMotor = (id: string) => {
    const lista = motores.get(MOTORES_2026[id] ?? id) ?? [0];
    return lista.reduce((a, b) => a + b, 0) / lista.length;
  };

  const equipes = dados.equipes.map((e): EquipeCalculada => {
    const t = forca.get(e.id) ?? 0;
    const areas = {
      motor: limitar(65 + 30 * forcaMotor(e.id)),
      aerodinamica: limitar(62 + 34 * t),
      chassi: limitar(64 + 30 * t),
      estrategia: limitar(68 + 22 * t), // sem dado próprio ainda, acompanha o carro
      pitStop: limitar(70 + 18 * t), // idem
    };
    const overall = limitar(
      areas.motor * 0.25 + areas.aerodinamica * 0.3 + areas.chassi * 0.25 + areas.estrategia * 0.1 + areas.pitStop * 0.1,
    );
    return { id: e.id, nome: e.nome, overall, areas };
  });

  return { pilotos, equipes };
}

export function calcularF2(
  classificacao: ClassificacaoF2[],
  equipePorPiloto: Map<string, string>,
): PilotoCalculado[] {
  const maxPontos = Math.max(...classificacao.map((c) => c.pontos));
  return classificacao.map((c): PilotoCalculado => {
    const corridas = c.resultados.filter((r) => r !== '');
    const chegadas = corridas.filter((r) => /^\d+$/.test(r)).map(Number);
    const abandonos = (corridas.length - chegadas.length) / Math.max(1, corridas.length);
    const fracao = c.pontos / maxPontos;
    // Escala da F2 fica abaixo da F1: o campeão chega perto de um piloto mediano de F1.
    const nivel = 60 + 20 * Math.sqrt(fracao);
    const atributos: AtributosCalculados = {
      ritmo: limitar(nivel + 2),
      consistencia: limitar(nivel + 5 - 30 * abandonos),
      chuva: limitar(nivel),
      ultrapassagem: limitar(nivel),
      defesa: limitar(nivel - 2),
    };
    return {
      id: c.idPiloto,
      nome: c.piloto,
      categoria: 'F2',
      equipe: equipePorPiloto.get(c.idPiloto) ?? '',
      papel: 'titular',
      overall: overallDosAtributos(atributos),
      atributos,
      base: {
        pontos: c.pontos,
        fracaoDoLider: +fracao.toFixed(2),
        corridas: corridas.length,
        abandonos: +abandonos.toFixed(2),
      },
    };
  });
}

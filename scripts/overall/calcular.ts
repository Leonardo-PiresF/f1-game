// Cálculo automático de atributos a partir dos dados brutos da temporada.
// Serve de ponto de partida: os valores revisados à mão em dados/manual/ têm prioridade.
import type { AtributosPiloto, Equipe, Piloto } from '../../src/engine/types.ts';
import type { DadosF1 } from '../f1/jolpica.ts';
import type { ClassificacaoF2, InscritoF2 } from '../f2/wikipedia.ts';
import { criarId } from '../lib/texto.ts';

export interface PilotoCalculado extends Piloto {
  equipeId: string;
  papel: 'titular' | 'reserva';
  // Números que explicam a nota, para a revisão.
  base: Record<string, number>;
}

// Fornecedor de unidade de potência em 2026.
export const MOTORES_2026: Record<string, string> = {
  mercedes: 'Mercedes', mclaren: 'Mercedes', williams: 'Mercedes', alpine: 'Mercedes',
  ferrari: 'Ferrari', haas: 'Ferrari', cadillac: 'Ferrari',
  red_bull: 'Red Bull Ford', rb: 'Red Bull Ford',
  aston_martin: 'Honda',
  audi: 'Audi',
};

export const limitar = (v: number, min = 40, max = 99) => Math.round(Math.min(max, Math.max(min, v)));

// Todos os atributos no nível geral, com ajustes onde há dado para isso.
function atributosDoNivel(nivel: number, ajustes: Partial<AtributosPiloto> = {}): AtributosPiloto {
  const a = (k: keyof AtributosPiloto) => limitar(nivel + (ajustes[k] ?? 0));
  return {
    quali: a('quali'), ritmoCorrida: a('ritmoCorrida'), consistencia: a('consistencia'), largada: a('largada'),
    ultrapassagem: a('ultrapassagem'), defesa: a('defesa'), rodaARoda: a('rodaARoda'), gestaoPneu: a('gestaoPneu'),
    chuva: a('chuva'), feedback: a('feedback'), inteligencia: a('inteligencia'),
  };
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

export function calcularF1(dados: DadosF1): { pilotos: PilotoCalculado[]; equipes: Equipe[] } {
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
    // Ainda não separa batida de quebra: a API não diz de quem foi a culpa.
    const abandonos = largou.filter((m) => m.chegada === null).length / Math.max(1, largou.length);
    const ganhos = largou.filter((m) => m.chegada !== null && m.largada > 0);
    const ganhoMedio = ganhos.reduce((s, m) => s + (m.largada - m.chegada!), 0) / Math.max(1, ganhos.length);
    const t = forca.get(p.equipeId) ?? 0;

    // Escala de 74 a 92 da revisão: parte vem do carro em que o piloto anda
    // (equipes boas contratam bons pilotos), parte do duelo com quem tem o mesmo carro.
    const nivel = 76 + 10 * t + 10 * (q - 0.5) + 8 * (r - 0.5);
    return {
      id: p.id,
      nome: p.nome,
      categoria: 'F1',
      nacionalidade: p.nacionalidade,
      nascimento: p.nascimento,
      equipeId: p.equipeId,
      papel: titulares.has(p.id) ? 'titular' : 'reserva',
      atributos: atributosDoNivel(nivel, {
        quali: 8 * (q - 0.5),
        consistencia: 3 - 20 * abandonos,
        ultrapassagem: Math.max(-4, Math.min(4, ganhoMedio)),
        defesa: 6 * (r - q),
      }),
      tracos: [],
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

  const equipes = dados.equipes.map((e): Equipe => {
    const t = forca.get(e.id) ?? 0;
    return {
      id: e.id,
      nome: e.nome,
      categoria: 'F1',
      fornecedorMotor: MOTORES_2026[e.id],
      areas: {
        motor: limitar(75 + 20 * forcaMotor(e.id)),
        aerodinamica: limitar(66 + 26 * t),
        chassi: limitar(67 + 23 * t),
        estrategia: limitar(72 + 16 * t), // sem dado próprio, acompanha o carro
        pitStop: limitar(72 + 15 * t), // idem
      },
      // Sem dado automático: valor neutro até a revisão manual.
      sistemas: { confiabilidade: 78, desenvolvimento: 78, gestaoPilotos: 78 },
    };
  });

  return { pilotos, equipes };
}

export function calcularF2(
  classificacao: ClassificacaoF2[],
  inscritos: InscritoF2[],
): { pilotos: PilotoCalculado[]; equipes: Equipe[] } {
  const equipePorPiloto = new Map(inscritos.map((i) => [i.idPiloto, criarId(i.equipe)]));
  const nacionalidade = new Map(inscritos.map((i) => [i.idPiloto, i.nacionalidade]));
  const maxPontos = Math.max(...classificacao.map((c) => c.pontos));

  const pilotos = classificacao.map((c): PilotoCalculado => {
    const corridas = c.resultados.filter((r) => r !== '');
    const chegadas = corridas.filter((r) => /^\d+$/.test(r)).map(Number);
    const abandonos = (corridas.length - chegadas.length) / Math.max(1, corridas.length);
    const fracao = c.pontos / maxPontos;
    // Escala única com a F1: o campeão da F2 fica abaixo do meio do grid da F1 (topo em 79).
    const nivel = 63 + 16 * Math.sqrt(fracao);
    return {
      id: c.idPiloto,
      nome: c.piloto,
      categoria: 'F2',
      nacionalidade: nacionalidade.get(c.idPiloto) ?? c.nacionalidade,
      equipeId: equipePorPiloto.get(c.idPiloto) ?? '',
      papel: 'titular',
      atributos: atributosDoNivel(nivel, { consistencia: 2 - 15 * abandonos }),
      tracos: [],
      base: {
        pontos: c.pontos,
        fracaoDoLider: +fracao.toFixed(2),
        corridas: corridas.length,
        abandonos: +abandonos.toFixed(2),
      },
    };
  });

  // Equipe de F2: acerto pela soma de pontos dos seus pilotos.
  const pontosEquipe = new Map<string, number>();
  const nomeEquipe = new Map(inscritos.map((i) => [criarId(i.equipe), i.equipe]));
  for (const c of classificacao) {
    const e = equipePorPiloto.get(c.idPiloto);
    if (e) pontosEquipe.set(e, (pontosEquipe.get(e) ?? 0) + c.pontos);
  }
  const maxEquipe = Math.max(...pontosEquipe.values());
  const equipes = [...nomeEquipe].map(([id, nome]): Equipe => {
    const t = Math.sqrt((pontosEquipe.get(id) ?? 0) / maxEquipe);
    return {
      id,
      nome,
      categoria: 'F2',
      areas: { acerto: limitar(69 + 12 * t), estrategia: limitar(70 + 8 * t), pitStop: limitar(71 + 6 * t) },
      sistemas: { confiabilidade: 76, desenvolvimento: 74 },
    };
  });

  return { pilotos, equipes };
}

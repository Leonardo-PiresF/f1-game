// Classificação. Na F1 são três sessões eliminatórias (Q1 corta 6, Q2 corta mais 6, Q3 decide
// as 10 primeiras posições); na sprint são SQ1, SQ2 e SQ3, mais curtas; na F2 é uma sessão única.
// Cada carro faz tentativas (volta de saída, volta lançada, volta de entrada); a pista melhora
// ao longo da sessão, e uma batida traz bandeira vermelha, que anula as voltas em andamento.
import type { Categoria } from './types.ts';
import type { Rng } from './rng.ts';
import { compostoIdeal, pegarJogo, perdaNaVolta, type Composto, type JogosDePneus, type PneusDoFimDeSemana } from './pneus.ts';
import { gauss } from './ritmo.ts';

export type FormatoQuali = 'F1' | 'SPRINT' | 'F2';

export interface ConcorrenteQuali {
  id: string;
  ritmo: (agua: number) => number; // tempo esperado de uma volta lançada com pneu novo
  sigma: number; // variação entre tentativas
  chanceErro: number; // chance de errar numa volta lançada
  chanceBatida: number;
  jogos?: JogosDePneus;
}

export interface LinhaClassificacao {
  pilotoId: string;
  posicao: number;
  q1: number | null;
  q2: number | null;
  q3: number | null;
  ultimaSessao: string | null; // até onde chegou; null na F2 (sessão única)
  fora107?: boolean; // sem tempo dentro dos 107%: larga no fim, com autorização dos comissários
  punicaoGrid?: number; // posições perdidas (motor, por exemplo)
}

export interface TentativaQuali {
  pilotoId: string;
  saida: number; // segundos desde o início da sessão (tempo real, com pausas)
  inicioLancada: number;
  fimLancada: number;
  fimEntrada: number; // de volta à garagem
  tempo: number | null; // null quando a volta não valeu
  composto: Composto;
  idadePneu: number;
  erro?: boolean;
  batida?: boolean;
  abortada?: boolean; // bandeira vermelha no meio da volta
  fracaoBatida?: number;
}

export interface SessaoQuali {
  nome: string;
  duracao: number; // relógio da sessão
  fim: number; // tempo real, contando as bandeiras vermelhas
  agua: number;
  participantes: string[];
  passam: number; // quantos seguem para a próxima sessão (todos na última)
  vermelhas: { de: number; ate: number; pilotoId: string }[];
  tentativas: TentativaQuali[];
  resultado: { pilotoId: string; tempo: number | null }[];
}

export interface Classificacao {
  formato: FormatoQuali;
  sessoes: SessaoQuali[];
  grid: LinhaClassificacao[];
}

interface ConfigSessao {
  nome: string;
  duracao: number;
  composto: Composto;
  tentativas: number;
  melhora: number; // segundos que a pista já ganhou no início da sessão
}

const SESSOES: Record<FormatoQuali, ConfigSessao[]> = {
  F1: [
    { nome: 'Q1', duracao: 18 * 60, composto: 'macio', tentativas: 2, melhora: 0 },
    { nome: 'Q2', duracao: 15 * 60, composto: 'macio', tentativas: 2, melhora: 0.25 },
    { nome: 'Q3', duracao: 12 * 60, composto: 'macio', tentativas: 2, melhora: 0.4 },
  ],
  SPRINT: [
    { nome: 'SQ1', duracao: 12 * 60, composto: 'medio', tentativas: 2, melhora: 0 },
    { nome: 'SQ2', duracao: 10 * 60, composto: 'medio', tentativas: 2, melhora: 0.25 },
    { nome: 'SQ3', duracao: 8 * 60, composto: 'macio', tentativas: 2, melhora: 0.4 },
  ],
  F2: [{ nome: 'Classificação', duracao: 30 * 60, composto: 'macio', tentativas: 3, melhora: 0 }],
};

const PAUSA_VERMELHA = 6 * 60;
const MELHORA_NA_SESSAO = 0.3;

export interface OpcoesQuali {
  agua: number[]; // uma por sessão (a última se repete)
  tempoVolta: number; // volta de referência, para as voltas de saída e de entrada
  pneus: PneusDoFimDeSemana;
}

function simularSessao(cfg: ConfigSessao, participantes: ConcorrenteQuali[], passam: number, agua: number, opcoes: OpcoesQuali, rng: Rng): SessaoQuali {
  const { tempoVolta, pneus } = opcoes;
  const saidaBox = tempoVolta * 1.35;
  const entrada = tempoVolta * 1.3;
  const ideal = compostoIdeal(agua);
  const composto: Composto = ideal === 'seco' ? cfg.composto : ideal;
  let fimReal = cfg.duracao;
  let pausado = 0; // soma das pausas, para converter tempo real em relógio
  const vermelhas: SessaoQuali['vermelhas'] = [];
  const feitas: TentativaQuali[] = [];
  const fora = new Set<string>();
  const ultimaVolta = new Map<string, number>(); // quando cada carro volta à garagem

  // Plano: a primeira tentativa no começo, a última no fim, quando a pista está melhor.
  type Plano = { c: ConcorrenteQuali; inicio: number };
  let fila: Plano[] = [];
  for (const c of participantes) {
    const primeira = cfg.duracao * (0.04 + rng() * 0.26);
    const ultima = cfg.duracao - saidaBox - 15 - rng() * 75;
    const inicios = [primeira];
    for (let k = 1; k < cfg.tentativas - 1; k++) inicios.push(primeira + ((ultima - primeira) * k) / (cfg.tentativas - 1) + gauss(rng) * 20);
    if (cfg.tentativas > 1) inicios.push(ultima);
    for (const inicio of inicios) fila.push({ c, inicio });
  }
  const ordenar = () => fila.sort((a, b) => a.inicio - b.inicio);
  ordenar();

  while (fila.length > 0) {
    const plano = fila.shift()!;
    const { c } = plano;
    if (fora.has(c.id)) continue;
    // Uma tentativa por vez: espera o carro voltar para a garagem.
    const livre = (ultimaVolta.get(c.id) ?? -Infinity) + 40;
    if (plano.inicio < livre) {
      plano.inicio = livre;
      fila.push(plano);
      ordenar();
      continue;
    }
    const parada = vermelhas.find((v) => plano.inicio >= v.de && plano.inicio < v.ate);
    if (parada) {
      plano.inicio = parada.ate + rng() * 30;
      fila.push(plano);
      ordenar();
      continue;
    }
    const saida = plano.inicio;
    const inicioLancada = saida + saidaBox;
    // A volta só vale se começar antes da bandeirada.
    if (inicioLancada > fimReal) continue;
    const idadePneu = c.jogos ? pegarJogo(c.jogos, composto, 3) : 0;
    const relogio = inicioLancada - pausado;
    let tempo = c.ritmo(agua) - cfg.melhora - MELHORA_NA_SESSAO * (relogio / cfg.duracao) + gauss(rng) * c.sigma;
    tempo += perdaNaVolta(pneus[composto], idadePneu, 1) - perdaNaVolta(pneus[composto], 0, 1);
    const erro = rng() < c.chanceErro;
    if (erro) tempo += 1 + rng() * 1.5;
    const t: TentativaQuali = { pilotoId: c.id, saida, inicioLancada, fimLancada: inicioLancada + tempo, fimEntrada: inicioLancada + tempo + entrada, tempo, composto, idadePneu, erro };

    if (rng() < c.chanceBatida) {
      // Batida: o carro fica na pista e a sessão para.
      const fracao = 0.1 + rng() * 0.8;
      const tc = inicioLancada + fracao * tempo;
      t.tempo = null;
      t.batida = true;
      t.fracaoBatida = fracao;
      t.fimLancada = tc;
      t.fimEntrada = tc;
      fora.add(c.id);
      feitas.push(t);
      vermelhas.push({ de: tc, ate: tc + PAUSA_VERMELHA, pilotoId: c.id });
      // Quem estava na pista volta devagar para os boxes e perde a tentativa.
      for (const o of feitas) {
        if (o === t || o.batida || o.fimLancada < tc || o.saida > tc) continue;
        o.abortada = true;
        o.tempo = null;
        o.fimLancada = Math.max(o.inicioLancada, tc);
        o.fimEntrada = tc + entrada * 1.2;
        ultimaVolta.set(o.pilotoId, o.fimEntrada);
        fila.push({ c: participantes.find((p) => p.id === o.pilotoId)!, inicio: tc + PAUSA_VERMELHA + rng() * 60 });
      }
      // O relógio para durante a bandeira vermelha; todos tentam sair assim que a sessão volta.
      fimReal += PAUSA_VERMELHA;
      pausado += PAUSA_VERMELHA;
      const restante = fimReal - (tc + PAUSA_VERMELHA);
      fila = fila.map((p) => (p.inicio > tc ? { ...p, inicio: tc + PAUSA_VERMELHA + rng() * Math.min(90, Math.max(5, restante - saidaBox)) } : p));
      ordenar();
      continue;
    }
    // Bandeira vermelha de outro carro no meio desta tentativa: a volta não vale.
    const vermelha = vermelhas.find((v) => t.saida <= v.de && t.fimLancada > v.de);
    if (vermelha) {
      t.abortada = true;
      t.tempo = null;
      t.fimLancada = Math.max(t.inicioLancada, vermelha.de);
      t.fimEntrada = vermelha.de + entrada * 1.2;
      fila.push({ c, inicio: vermelha.ate + rng() * 60 });
      ordenar();
    }
    feitas.push(t);
    ultimaVolta.set(c.id, t.fimEntrada);
  }

  // Voltas que terminaram depois de uma bandeira vermelha posterior já foram anuladas acima.
  const melhor = new Map<string, number>();
  for (const t of feitas) if (t.tempo !== null && t.tempo < (melhor.get(t.pilotoId) ?? Infinity)) melhor.set(t.pilotoId, t.tempo);
  const resultado = participantes
    .map((c) => ({ pilotoId: c.id, tempo: melhor.get(c.id) ?? null }))
    .sort((a, b) => (a.tempo ?? Infinity) - (b.tempo ?? Infinity));
  return {
    nome: cfg.nome,
    duracao: cfg.duracao,
    fim: Math.max(fimReal, ...feitas.map((t) => t.fimEntrada)) + 5,
    agua,
    participantes: participantes.map((c) => c.id),
    passam,
    vermelhas,
    tentativas: feitas.sort((a, b) => a.saida - b.saida),
    resultado,
  };
}

export function classificar(concorrentes: ConcorrenteQuali[], formato: FormatoQuali, opcoes: OpcoesQuali, rng: Rng): Classificacao {
  const configs = SESSOES[formato];
  const n = concorrentes.length;
  const porId = new Map(concorrentes.map((c) => [c.id, c]));
  const passamPor = (i: number) => (configs.length === 1 ? n : i === 0 ? Math.max(10, n - 6) : i === 1 ? 10 : 10);
  const sessoes: SessaoQuali[] = [];
  let participantes = concorrentes;
  for (let i = 0; i < configs.length; i++) {
    const agua = opcoes.agua[Math.min(i, opcoes.agua.length - 1)]!;
    const s = simularSessao(configs[i]!, participantes, passamPor(i), agua, opcoes, rng);
    sessoes.push(s);
    participantes = s.resultado.slice(0, s.passam).map((r) => porId.get(r.pilotoId)!);
  }

  // Grid: quem chegou mais longe fica na frente; dentro de cada grupo, pelo tempo daquela sessão.
  const tempoEm = (s: number, id: string) => sessoes[s]?.resultado.find((r) => r.pilotoId === id)?.tempo ?? null;
  const ordem: string[] = [];
  for (let i = sessoes.length - 1; i >= 0; i--) {
    for (const r of sessoes[i]!.resultado) if (!ordem.includes(r.pilotoId)) ordem.push(r.pilotoId);
  }
  // Regra dos 107%: sem tempo ou muito lento na primeira sessão, larga no fim se os comissários autorizarem.
  const melhorQ1 = Math.min(...sessoes[0]!.resultado.map((r) => r.tempo ?? Infinity));
  const fora107 = (id: string) => {
    const t = tempoEm(0, id);
    return t === null || t > melhorQ1 * 1.07;
  };
  const dentro = ordem.filter((id) => !fora107(id));
  const fora = ordem.filter(fora107);
  const nomes = configs.map((c) => c.nome);
  const grid = [...dentro, ...fora].map((id, i): LinhaClassificacao => {
    let ultima = 0;
    for (let s = 0; s < sessoes.length; s++) if (sessoes[s]!.participantes.includes(id)) ultima = s;
    return {
      pilotoId: id,
      posicao: i + 1,
      q1: tempoEm(0, id),
      q2: tempoEm(1, id),
      q3: tempoEm(2, id),
      ultimaSessao: configs.length === 1 ? null : nomes[ultima]!,
      fora107: fora107(id) || undefined,
    };
  });
  return { formato, sessoes, grid };
}

export const formatoQuali = (categoria: Categoria, sprint: boolean): FormatoQuali => (categoria === 'F2' ? 'F2' : sprint ? 'SPRINT' : 'F1');

// Punições de grid (troca de motor, por exemplo): cada piloto perde posições; acima de 15, larga no fim.
export function aplicarPunicoesDeGrid(grid: LinhaClassificacao[], punicoes: Record<string, number>): LinhaClassificacao[] {
  const fundo = grid.filter((l) => (punicoes[l.pilotoId] ?? 0) > 15);
  let lista = grid.filter((l) => (punicoes[l.pilotoId] ?? 0) <= 15);
  const punidos = lista.filter((l) => punicoes[l.pilotoId]).sort((a, b) => a.posicao - b.posicao);
  for (const l of punidos) {
    const i = lista.indexOf(l);
    lista.splice(i, 1);
    lista.splice(Math.min(lista.length, i + punicoes[l.pilotoId]!), 0, l);
  }
  lista = [...lista, ...fundo];
  return lista.map((l, i) => ({ ...l, posicao: i + 1, punicaoGrid: punicoes[l.pilotoId] || undefined }));
}

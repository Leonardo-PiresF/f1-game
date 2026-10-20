// Simulação de uma corrida, volta a volta. É determinística: a mesma semente e os
// mesmos dados dão sempre a mesma corrida. A tela só anima o resultado.
import type { AreasEquipeF1, AreasEquipeF2, Categoria, Equipe, Piloto, Pista, TracoId } from './types.ts';
import { criarRng, type Rng } from './rng.ts';
import { classificar, type LinhaClassificacao } from './classificacao.ts';
import { melhoresEstrategias, perdaNaVolta, sortearPneus, type Composto, type Estrategia, type PneusDoFimDeSemana } from './pneus.ts';

export type { Composto } from './pneus.ts';
export type Clima = 'seco' | 'molhado';

export const PONTOS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

export interface PilotoNaCorrida extends Piloto {
  equipeId: string;
}

export interface ParametrosCorrida {
  pista: Pista;
  categoria: Categoria;
  pilotos: PilotoNaCorrida[];
  equipes: Equipe[];
  semente: number;
  clima?: Clima; // sorteado pela chance de chuva da pista quando ausente
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
  | 'safety_car'
  | 'vsc'
  | 'relargada'
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
}

export interface Neutralizacao {
  tipo: 'SC' | 'VSC';
  de: number; // primeira volta neutralizada
  ate: number; // última volta neutralizada
}

export interface Corrida {
  pistaId: string;
  categoria: Categoria;
  clima: Clima;
  voltas: number;
  tempoVolta: number;
  semente: number;
  pneus: PneusDoFimDeSemana;
  classificacao: LinhaClassificacao[];
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
}

interface Carro {
  p: PilotoNaCorrida;
  equipe: Equipe;
  nota: number; // ritmo de corrida combinando piloto e carro
  formaDoDia: number; // segundos por volta, sorteado uma vez por fim de semana
  sigma: number;
  fatorPneu: number;
  estrategia: number;
  compostos: Composto[]; // plano de pneus
  paradasPlanejadas: number[]; // volta de cada parada ainda por fazer, na ordem
  stint: number;
  pneu: Composto;
  usados: Composto[];
  idade: number;
  paradas: number;
  tempos: number[];
  box: ParadaBox[];
  fora: boolean;
  motivo?: string;
  punicao: number;
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
const SEGUNDOS_POR_PONTO = 0.07; // diferença de ritmo por ponto de nota
const RITMO_SC = 1.4; // volta atrás do safety car, em relação à volta normal
const RITMO_VSC = 1.35;

const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function gauss(rng: Rng): number {
  const u = 1 - rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function intensidade(p: Piloto, id: TracoId): number {
  return p.tracos.find((t) => t.id === id)?.intensidade ?? (p.tracos.some((t) => t.id === id) ? 1 : 0);
}

export function sobrenome(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter((p) => !/^(jr\.?|júnior|junior|filho|neto)$/i.test(p));
  return partes[partes.length - 1] ?? nome;
}

// Nota do carro nesta pista: pistas de reta valorizam motor, pistas de curva valorizam aerodinâmica.
export function notaCarro(equipe: Equipe, pista: Pista): number {
  if (equipe.categoria === 'F2') return (equipe.areas as AreasEquipeF2).acerto;
  const a = equipe.areas as AreasEquipeF1;
  const pesoMotor = 30 * (0.5 + pista.perfil.velocidade);
  const pesoAero = 30 * (0.5 + pista.perfil.curvas);
  const pesoChassi = 25;
  return (a.motor * pesoMotor + a.aerodinamica * pesoAero + a.chassi * pesoChassi) / (pesoMotor + pesoAero + pesoChassi);
}

function notaPiloto(p: Piloto, clima: Clima, base: number): number {
  if (clima === 'seco') return base;
  return base * 0.4 + (p.atributos.chuva + 3 * intensidade(p, 'mestre_chuva')) * 0.6;
}

// No F1 o carro pesa quase tanto quanto o piloto; na F2 o carro é igual para todos.
function combinar(categoria: Categoria, piloto: number, carro: number): number {
  return categoria === 'F1' ? 0.55 * piloto + 0.45 * carro : 0.8 * piloto + 0.2 * carro;
}

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

export function simularCorrida(params: ParametrosCorrida): Corrida {
  const { pista, categoria, semente } = params;
  const rng = criarRng(semente);
  const clima: Clima = params.clima ?? (rng() < pista.perfil.chanceChuva ? 'molhado' : 'seco');
  const voltas = categoria === 'F1' ? pista.voltas : Math.round(pista.voltas * 0.57);
  const tempoVolta = pista.tempoVolta * (categoria === 'F1' ? 1 : 1.07) + (clima === 'molhado' ? 10 : 0);
  const pneus = sortearPneus(pista, rng);
  const zonas = pista.zonas?.length ?? 1;
  // Ar sujo: em pista travada, seguir de perto custa mais e é preciso ser bem mais rápido para tentar.
  const arSujo = 0.15 + 0.5 * (1 - pista.perfil.ultrapassagem);
  const equipes = new Map(params.equipes.map((e) => [e.id, e]));
  const eventos: EventoCorrida[] = [];
  const nomeDe = (c: Carro) => sobrenome(c.p.nome);
  const evento = (volta: number, tipo: TipoEvento, texto: string, carros: Carro[]) =>
    eventos.push({ volta, tipo, texto, pilotos: carros.map((c) => c.p.id) });
  const molhado = clima === 'molhado';

  const carros: Carro[] = params.pilotos.map((p) => {
    const equipe = equipes.get(p.equipeId);
    if (!equipe) throw new Error(`Equipe desconhecida para ${p.id}: ${p.equipeId}`);
    const a = p.atributos;
    return {
      p,
      equipe,
      nota: combinar(categoria, notaPiloto(p, clima, a.ritmoCorrida), notaCarro(equipe, pista)),
      formaDoDia: gauss(rng) * (0.12 + (100 - a.consistencia) * 0.008) * (molhado ? 1.5 : 1),
      sigma: (0.12 + (100 - a.consistencia) * 0.012) * (molhado ? 1.6 : 1),
      fatorPneu: limitar(1 - (a.gestaoPneu - 85) * 0.012, 0.8, 1.2) * (1 - 0.1 * intensidade(p, 'gestor_pneus')),
      estrategia: equipe.areas.estrategia + 3 * intensidade(p, 'estrategista'),
      compostos: [],
      paradasPlanejadas: [],
      stint: 0,
      pneu: 'medio',
      usados: [],
      idade: 0,
      paradas: 0,
      tempos: [],
      box: [],
      fora: false,
      punicao: 0,
      melhorVolta: Infinity,
      agressivoAte: 0,
      desejado: 0,
      cum: 0,
      pitando: false,
      atraso: 0,
    };
  });
  const porId = new Map(carros.map((c) => [c.p.id, c]));

  // Classificação: voltas lançadas com pouco combustível e pneu macio.
  const classificacao = classificar(
    carros.map((c) => {
      const a = c.p.atributos;
      const nota = combinar(categoria, notaPiloto(c.p, clima, a.quali), notaCarro(c.equipe, pista));
      return {
        id: c.p.id,
        ritmo: tempoVolta - 1.8 - SEGUNDOS_POR_PONTO * (nota - 85) + c.formaDoDia,
        sigma: (0.08 + (100 - a.consistencia) * 0.005) * (molhado ? 1.8 : 1),
        chanceErro: 0.03 + 0.06 * intensidade(c.p, 'erros_graves') + (molhado ? 0.05 : 0),
      };
    }),
    categoria,
    rng,
  );
  const ordemGrid = classificacao.map((l) => porId.get(l.pilotoId)!);
  const tempoDeQuali = (l: LinhaClassificacao) => l.q3 ?? l.q2 ?? l.q1 ?? Infinity;

  // Estratégia de pneus: as equipes conhecem o comportamento do fim de semana pelos treinos.
  const cacheEstrategias = new Map<number, Estrategia[]>();
  ordemGrid.forEach((c, i) => {
    if (molhado) {
      const vida = pneus.chuva.vida / c.fatorPneu;
      c.compostos = vida >= voltas ? ['chuva'] : ['chuva', 'chuva'];
      c.paradasPlanejadas = c.compostos.length > 1 ? [Math.round(voltas / 2 + gauss(rng) * 2)] : [];
    } else {
      const chave = Math.round(c.fatorPneu * 50) / 50;
      let opcoes = cacheEstrategias.get(chave);
      if (!opcoes) {
        opcoes = melhoresEstrategias(pneus, voltas, pista.perdaBox, chave);
        cacheEstrategias.set(chave, opcoes);
      }
      const escolhida = escolherEstrategia(opcoes, c.estrategia, rng);
      const erro = (100 - c.estrategia) / 12;
      c.compostos = escolhida.compostos;
      let anterior = 0;
      c.paradasPlanejadas = escolhida.paradas.map((v) => {
        anterior = limitar(Math.round(v + gauss(rng) * (1 + erro)), anterior + 4, voltas - 3);
        return anterior;
      });
    }
    c.pneu = c.compostos[0]!;
    c.usados = [c.pneu];
    c.cum = i * 0.2;
    c.tempos.push(c.cum);
  });

  const largadaDe = new Map(ordemGrid.map((c, i) => [c.p.id, i + 1]));
  const estados: EstadoPiloto[][] = [];
  const abandonos: Record<string, Abandono> = {};
  const neutralizacoes: Neutralizacao[] = [];
  const undercuts: Undercut[] = [];
  let ordem = [...ordemGrid];
  let voltaRapida: Corrida['voltaMaisRapida'] = null;

  const neutralizada = (volta: number) => neutralizacoes.find((n) => volta >= n.de && volta <= n.ate);

  const registrarEstado = (pitaram: Set<Carro>) => {
    const ativos = ordem.filter((c) => !c.fora);
    const fora = carros.filter((c) => c.fora).sort((a, b) => b.tempos.length - a.tempos.length);
    estados.push(
      [...ativos, ...fora].map((c, i) => ({
        pilotoId: c.p.id,
        posicao: i + 1,
        pneu: c.pneu,
        idadePneu: c.idade,
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

  // Depois de um incidente a direção de prova decide: safety car, safety car virtual ou nada.
  const neutralizar = (volta: number, chanceSC: number, chanceVSC: number) => {
    const inicio = volta + 1;
    if (inicio >= voltas - 1 || neutralizada(volta) || neutralizada(inicio)) return;
    const r = rng();
    if (r < chanceSC) {
      neutralizacoes.push({ tipo: 'SC', de: inicio, ate: Math.min(voltas - 1, inicio + 2 + Math.floor(rng() * 3)) });
      evento(inicio, 'safety_car', 'Safety car na pista: o pelotão se junta atrás dele', []);
    } else if (r < chanceSC + chanceVSC) {
      neutralizacoes.push({ tipo: 'VSC', de: inicio, ate: Math.min(voltas - 1, inicio + Math.floor(rng() * 2)) });
      evento(inicio, 'vsc', 'Safety car virtual: todos reduzem e as distâncias se mantêm', []);
    }
  };

  const perdaPneu = (c: Carro, composto: Composto, idade: number) => perdaNaVolta(pneus[composto], idade, c.fatorPneu);

  for (let volta = 1; volta <= voltas; volta++) {
    const neutra = neutralizada(volta);
    const anterior = neutralizada(volta - 1);
    if (anterior && !neutra) {
      evento(volta, 'relargada', anterior.tipo === 'SC' ? 'Relargada: o safety car sai da pista' : 'Fim do safety car virtual', []);
    }
    const relargada = anterior?.tipo === 'SC' && !neutra;
    const ativos = ordem.filter((c) => !c.fora);
    const pitaram = new Set<Carro>();
    const pressao = volta > voltas - 10;
    const restantes = voltas - volta;

    // Quebras e erros acontecem durante a volta.
    for (const c of ativos) {
      const a = c.p.atributos;
      const quebra = (100 - c.equipe.sistemas.confiabilidade) * 0.00004;
      let erro = 0.00045 * Math.max(0.3, 1 + (90 - a.consistencia) * 0.08) * (1 + intensidade(c.p, 'erros_graves'));
      if (molhado) erro *= 4;
      if (volta === 1) erro *= 3;
      if (neutra) erro *= 0.1;
      if (rng() < quebra) {
        abandonar(c, volta, 'Quebra');
        evento(volta, 'quebra', `${nomeDe(c)} abandona com problema no carro`, [c]);
        neutralizar(volta, 0.1, 0.4);
      } else if (rng() < erro) {
        abandonar(c, volta, 'Batida');
        evento(volta, 'batida', `${nomeDe(c)} bate e está fora`, [c]);
        neutralizar(volta, 0.5, 0.3);
      }
    }

    const naPista = ativos.filter((c) => !c.fora);
    // Decisões de box, olhando a corrida como estava na última passagem pela linha.
    naPista.forEach((c, i) => {
      c.pitando = false;
      const proxima = c.paradasPlanejadas[0];
      const temParada = proxima !== undefined && c.stint < c.compostos.length - 1;
      const frente = naPista[i - 1];
      const vida = pneus[c.pneu].vida / c.fatorPneu;
      let parar = temParada && proxima <= volta;
      let motivo: 'plano' | 'undercut' | 'cobertura' | 'neutralizacao' | 'pneu' = 'plano';

      if (!parar && temParada && neutra && proxima - volta <= 10 && c.idade >= 5) {
        parar = rng() < (neutra.tipo === 'SC' ? 0.45 : 0.3) + (c.estrategia - 75) * 0.02;
        motivo = 'neutralizacao';
      }
      // Undercut: parar antes do carro da frente para passar com o pneu novo.
      if (!parar && !neutra && temParada && frente && !frente.fora && frente.paradas === c.paradas && proxima - volta <= 6 && c.idade >= 8 && volta > 3) {
        const gap = c.cum - frente.cum;
        const novo = c.compostos[c.stint + 1]!;
        const ganho = [0, 1].reduce((s, k) => s + perdaPneu(frente, frente.pneu, frente.idade + k) - perdaPneu(c, novo, k), 0);
        if (gap < 2.5 && ganho > gap + 0.4 && rng() < limitar(0.2 + (c.estrategia - 75) * 0.025, 0.08, 0.75)) {
          parar = true;
          motivo = 'undercut';
          undercuts.push({ atacante: c, alvo: frente, volta });
          evento(volta, 'undercut', `${nomeDe(c)} para cedo para tentar o undercut em ${nomeDe(frente)}`, [c, frente]);
        }
      }
      // Cobertura: o carro de trás parou na volta anterior; parar agora para não perder a posição.
      if (!parar && !neutra && temParada && proxima - volta <= 10 && c.idade >= 6) {
        const atacante = carros.find((o) => !o.fora && o.box.at(-1)?.volta === volta - 1 && o.frenteNaParada === c.p.id && (o.gapNaParada ?? 9) < 3);
        if (atacante && rng() < limitar(0.3 + (c.estrategia - 75) * 0.03, 0.12, 0.85)) {
          parar = true;
          motivo = 'cobertura';
          evento(volta, 'undercut', `${nomeDe(c)} responde a ${nomeDe(atacante)} e para na volta seguinte`, [c, atacante]);
        }
      }
      // Pneu acabou antes do planejado.
      if (!parar && !molhado && temParada && c.idade > vida * 1.35 && restantes > 3) {
        parar = true;
        motivo = 'pneu';
      }
      if (!parar || !temParada) return;

      const ps = c.equipe.areas.pitStop;
      let parada = 2.2 + (100 - ps) * 0.04 + Math.abs(gauss(rng)) * 0.3;
      const lenta = rng() < 0.02 + (100 - ps) * 0.002;
      if (lenta) parada += 3 + rng() * 5;
      const fatorPit = neutra?.tipo === 'SC' ? 0.5 : neutra?.tipo === 'VSC' ? 0.6 : 1;
      const perda = pista.perdaBox * fatorPit + parada;
      c.box.push({ volta, perda, parada });
      c.frenteNaParada = frente?.p.id;
      c.gapNaParada = frente ? c.cum - frente.cum : undefined;
      // Antecipar ou atrasar uma parada empurra as seguintes na mesma medida.
      const desvio = volta - proxima;
      c.paradasPlanejadas = c.paradasPlanejadas.slice(1).map((v) => limitar(v + desvio, volta + 4, voltas - 3));
      c.stint++;
      c.pneu = c.compostos[c.stint]!;
      c.usados.push(c.pneu);
      c.idade = -1; // vira 0 no fim desta volta: o pneu novo só começa a contar na próxima
      c.paradas++;
      c.pitando = true;
      pitaram.add(c);
      if (lenta) evento(volta, 'box_lento', `Parada lenta para ${nomeDe(c)} (${parada.toFixed(1)}s)`, [c]);
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
      let sigma = c.sigma;
      if (pressao && i < 3 && intensidade(c.p, 'frio_sob_pressao') > 0) sigma *= 0.8;
      const combustivel = 1.8 * (1 - volta / voltas);
      let t = tempoVolta + combustivel + perdaPneu(c, pneuDaVolta, idadeDaVolta) - SEGUNDOS_POR_PONTO * (c.nota - 85) + c.formaDoDia + gauss(rng) * sigma;
      if (volta === 1) t += 4 - (a.largada - 80) * 0.03 + gauss(rng) * 0.25 + (rng() < 0.03 ? 1.5 : 0);
      // Volta de saída do box: pneu frio.
      if (!c.pitando && c.box.at(-1)?.volta === volta - 1 && pneuDaVolta !== 'chuva') t += 0.6;
      c.desejado = c.cum + t + perdaBox;
    });

    // Resolve a ordem no fim da volta.
    const fila: Carro[] = [];
    if (neutra?.tipo === 'SC') {
      // Safety car: o pelotão se junta, carro atrás de carro.
      let anteriorCum = -Infinity;
      for (const c of naPista) {
        const extra = c.pitando ? c.box.at(-1)!.perda : 0;
        c.cum = Math.max(anteriorCum + 0.8, c.cum + tempoVolta * RITMO_SC * 0.65) + extra;
        if (!c.pitando) anteriorCum = c.cum;
        fila.push(c);
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
          const r = disputar(c, frente, cum, volta, relargada);
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
    }

    for (const c of fila) {
      c.cum += c.atraso;
      c.atraso = 0;
    }
    fila.sort((a, b) => a.cum - b.cum);
    for (const c of fila) {
      const tempo = c.cum - c.tempos[c.tempos.length - 1]!;
      c.tempos.push(c.cum);
      c.idade++;
      if (!neutra && !c.pitando && volta > 1 && tempo < c.melhorVolta) c.melhorVolta = tempo;
      if (!neutra && !c.pitando && volta > 1 && (!voltaRapida || tempo < voltaRapida.tempo)) {
        voltaRapida = { pilotoId: c.p.id, volta, tempo };
      }
    }
    ordem = [...fila.filter((c) => !c.fora), ...carros.filter((c) => c.fora)];

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
  function disputar(atacante: Carro, defensor: Carro, cum: number, volta: number, relargada: boolean): 'passou' | 'segurou' {
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
    const facilidade = 0.05 + 0.6 * pista.perfil.ultrapassagem + 0.04 * zonas;
    let chance = facilidade * (0.6 + vantagem * 0.8 + (aa.ultrapassagem - defesa) * 0.02 + (rodaA - ad.rodaARoda) * 0.008);
    if (agressivo) chance *= 1.2;
    if (volta === 1 || relargada) chance *= 1.3;
    chance = limitar(chance, 0.01, 0.9);

    let toque = 0.01 * (1 + sujoA) * (1 + sujoD) * (agressivo ? 3 : 1);
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
        neutralizar(volta, 0.4, 0.3);
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

  // Bandeirada: quem tomou volta termina na primeira vez que cruza a linha depois do líder.
  const lider = ordem.find((c) => !c.fora)!;
  const tempoLider = lider.tempos[voltas]!;
  for (const c of carros) {
    if (c.fora) continue;
    const fim = c.tempos.findIndex((t, i) => i > 0 && t >= tempoLider);
    if (fim > 0) c.tempos = c.tempos.slice(0, fim + 1);
  }

  const chegaram = carros
    .filter((c) => !c.fora)
    .sort((a, b) => b.tempos.length - a.tempos.length || a.tempos[a.tempos.length - 1]! + a.punicao - (b.tempos[b.tempos.length - 1]! + b.punicao));
  const abandonaram = carros.filter((c) => c.fora).sort((a, b) => b.tempos.length - a.tempos.length);
  const resultado: ResultadoPiloto[] = [...chegaram, ...abandonaram].map((c, i) => ({
    pilotoId: c.p.id,
    equipeId: c.equipe.id,
    posicao: i + 1,
    largada: largadaDe.get(c.p.id)!,
    status: c.fora ? 'abandonou' : 'chegou',
    motivo: c.motivo,
    voltas: c.tempos.length - 1,
    tempoTotal: c.tempos[c.tempos.length - 1]! + c.punicao,
    punicao: c.punicao,
    pontos: c.fora ? 0 : (PONTOS[i] ?? 0),
    paradas: c.paradas,
    melhorVolta: c.melhorVolta,
    pneus: c.usados,
  }));
  const vencedor = chegaram[0]!;
  evento(voltas, 'bandeirada', `${nomeDe(vencedor)} vence em ${pista.nome}`, [vencedor]);

  return {
    pistaId: pista.id,
    categoria,
    clima,
    voltas,
    tempoVolta,
    semente,
    pneus,
    classificacao,
    grid: classificacao.map((l) => ({ pilotoId: l.pilotoId, tempo: tempoDeQuali(l) })),
    tempos: Object.fromEntries(carros.map((c) => [c.p.id, c.tempos])),
    paradas: Object.fromEntries(carros.map((c) => [c.p.id, c.box.filter((b) => b.volta < c.tempos.length)])),
    abandonos,
    neutralizacoes,
    estados,
    eventos,
    resultado,
    voltaMaisRapida: voltaRapida,
  };
}

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

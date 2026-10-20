// Simulação de uma corrida, volta a volta. É determinística: a mesma semente e os
// mesmos dados dão sempre a mesma corrida. A tela só anima o resultado.
import type { AreasEquipeF1, AreasEquipeF2, Categoria, Equipe, Piloto, Pista, TracoId } from './types.ts';
import { criarRng, type Rng } from './rng.ts';

export type Composto = 'macio' | 'medio' | 'duro' | 'chuva';
export type Clima = 'seco' | 'molhado';

interface DadosComposto {
  ritmo: number; // segundos a mais por volta que o macio novo
  desgaste: number; // segundos perdidos por volta de uso
  vida: number; // voltas até o pneu "acabar" numa pista de desgaste normal
}

export const COMPOSTOS: Record<Composto, DadosComposto> = {
  macio: { ritmo: 0, desgaste: 0.08, vida: 20 },
  medio: { ritmo: 0.45, desgaste: 0.05, vida: 32 },
  duro: { ritmo: 0.8, desgaste: 0.032, vida: 45 },
  chuva: { ritmo: 0, desgaste: 0.03, vida: 35 },
};

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
  | 'batida'
  | 'quebra'
  | 'toque'
  | 'punicao'
  | 'safety_car'
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
}

export interface Abandono {
  tempo: number; // instante da corrida em que parou
  distancia: number; // em voltas, a partir da linha de largada
}

export interface Corrida {
  pistaId: string;
  categoria: Categoria;
  clima: Clima;
  voltas: number;
  tempoVolta: number;
  semente: number;
  grid: { pilotoId: string; tempo: number }[];
  // Instante em que cada piloto cruza a linha ao fim de cada volta. O índice 0 é a
  // largada (os de trás cruzam a linha um pouco depois).
  tempos: Record<string, number[]>;
  abandonos: Record<string, Abandono>;
  voltasSafetyCar: number[];
  estados: EstadoPiloto[][]; // por volta; índice 0 = grid
  eventos: EventoCorrida[];
  resultado: ResultadoPiloto[];
  voltaMaisRapida: { pilotoId: string; volta: number; tempo: number } | null;
}

interface Parada {
  composto: Composto;
  ate: number; // volta ao fim da qual o piloto para (Infinity no último stint)
}

interface Carro {
  p: PilotoNaCorrida;
  equipe: Equipe;
  nota: number; // ritmo de corrida combinando piloto e carro
  formaDoDia: number; // segundos por volta, sorteado uma vez por fim de semana
  sigma: number;
  fatorPneu: number;
  estrategia: number;
  plano: Parada[];
  stint: number;
  pneu: Composto;
  idade: number;
  paradas: number;
  tempos: number[];
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
}

const GAP_MINIMO = 0.3; // segundos entre dois carros na mesma linha
const SEGUNDOS_POR_PONTO = 0.07; // diferença de ritmo por ponto de nota

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

function estrategiaDe(c: { p: Piloto; equipe: Equipe }): number {
  return c.equipe.areas.estrategia + 3 * intensidade(c.p, 'estrategista');
}

function planejar(c: Carro, pista: Pista, voltas: number, clima: Clima, largada: number, rng: Rng): Parada[] {
  const vidaReal = (k: Composto) => COMPOSTOS[k].vida / (pista.perfil.desgaste * c.fatorPneu);
  let compostos: Composto[];
  if (clima === 'molhado') {
    compostos = vidaReal('chuva') >= voltas ? ['chuva'] : ['chuva', 'chuva'];
  } else {
    const umaParada: Composto[][] = largada <= 10 ? [['medio', 'duro'], ['medio', 'duro'], ['macio', 'duro']] : [['duro', 'medio'], ['medio', 'duro'], ['macio', 'duro']];
    compostos = umaParada[Math.floor(rng() * umaParada.length)]!;
    const alcance = compostos.reduce((s, k) => s + vidaReal(k), 0);
    if (alcance < voltas * 0.95) compostos = rng() < 0.5 ? ['macio', 'medio', 'medio'] : ['medio', 'duro', 'medio'];
  }
  const vidas = compostos.map(vidaReal);
  const total = vidas.reduce((s, v) => s + v, 0);
  const erro = (100 - c.estrategia) / 12;
  const plano: Parada[] = [];
  let acumulado = 0;
  compostos.forEach((composto, i) => {
    acumulado += vidas[i]!;
    const ultimo = i === compostos.length - 1;
    const ideal = (acumulado / total) * voltas;
    const ate = ultimo ? Infinity : limitar(Math.round(ideal + gauss(rng) * (1.5 + erro)), 5, voltas - 3);
    plano.push({ composto, ate });
  });
  return plano;
}

export function simularCorrida(params: ParametrosCorrida): Corrida {
  const { pista, categoria, semente } = params;
  const rng = criarRng(semente);
  const clima: Clima = params.clima ?? (rng() < pista.perfil.chanceChuva ? 'molhado' : 'seco');
  const voltas = categoria === 'F1' ? pista.voltas : Math.round(pista.voltas * 0.57);
  const tempoVolta = pista.tempoVolta * (categoria === 'F1' ? 1 : 1.07) + (clima === 'molhado' ? 10 : 0);
  const equipes = new Map(params.equipes.map((e) => [e.id, e]));
  const eventos: EventoCorrida[] = [];
  const nomeDe = (c: Carro) => sobrenome(c.p.nome);
  const evento = (volta: number, tipo: TipoEvento, texto: string, carros: Carro[]) =>
    eventos.push({ volta, tipo, texto, pilotos: carros.map((c) => c.p.id) });

  const carros: Carro[] = params.pilotos.map((p) => {
    const equipe = equipes.get(p.equipeId);
    if (!equipe) throw new Error(`Equipe desconhecida para ${p.id}: ${p.equipeId}`);
    const a = p.atributos;
    const carro = notaCarro(equipe, pista);
    const molhado = clima === 'molhado';
    return {
      p,
      equipe,
      nota: combinar(categoria, notaPiloto(p, clima, a.ritmoCorrida), carro),
      formaDoDia: gauss(rng) * (0.12 + (100 - a.consistencia) * 0.008) * (molhado ? 1.5 : 1),
      sigma: (0.12 + (100 - a.consistencia) * 0.012) * (molhado ? 1.6 : 1),
      fatorPneu: limitar(1 - (a.gestaoPneu - 85) * 0.012, 0.8, 1.2) * (1 - 0.1 * intensidade(p, 'gestor_pneus')),
      estrategia: estrategiaDe({ p, equipe }),
      plano: [],
      stint: 0,
      pneu: 'medio',
      idade: 0,
      paradas: 0,
      tempos: [],
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

  // Classificação: uma volta lançada com pouco combustível.
  const grid = carros
    .map((c) => {
      const a = c.p.atributos;
      const nota = combinar(categoria, notaPiloto(c.p, clima, a.quali), notaCarro(c.equipe, pista));
      const sigma = (0.1 + (100 - a.consistencia) * 0.006) * (clima === 'molhado' ? 1.8 : 1);
      const erro = rng() < 0.08 * intensidade(c.p, 'erros_graves') ? 1.2 + rng() : 0;
      const tempo = tempoVolta - 1.8 - SEGUNDOS_POR_PONTO * (nota - 85) + c.formaDoDia + gauss(rng) * sigma + erro;
      return { c, tempo };
    })
    .sort((a, b) => a.tempo - b.tempo);

  grid.forEach(({ c }, i) => {
    c.plano = planejar(c, pista, voltas, clima, i + 1, rng);
    c.pneu = c.plano[0]!.composto;
    c.cum = i * 0.2;
    c.tempos.push(c.cum);
  });

  const largadaDe = new Map(grid.map(({ c }, i) => [c.p.id, i + 1]));
  const estados: EstadoPiloto[][] = [];
  const abandonos: Record<string, Abandono> = {};
  const voltasSafetyCar: number[] = [];
  let ordem = grid.map(({ c }) => c);
  let safetyCarAte = 0;
  let voltaRapida: Corrida['voltaMaisRapida'] = null;

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

  const abandonar = (c: Carro, volta: number, motivo: string, tempoDaVolta: number) => {
    const fracao = 0.15 + rng() * 0.7;
    c.fora = true;
    c.motivo = motivo;
    abandonos[c.p.id] = { tempo: c.tempos[c.tempos.length - 1]! + tempoDaVolta * fracao, distancia: volta - 1 + fracao };
  };

  const chamarSafetyCar = (volta: number, chance: number) => {
    if (volta < voltas - 2 && safetyCarAte < volta && rng() < chance) {
      safetyCarAte = volta + 2 + Math.floor(rng() * 3);
      evento(volta, 'safety_car', `Safety car na pista`, []);
    }
  };

  for (let volta = 1; volta <= voltas; volta++) {
    const sobSafetyCar = volta <= safetyCarAte;
    const relargada = !sobSafetyCar && safetyCarAte === volta - 1 && volta > 1;
    if (sobSafetyCar) voltasSafetyCar.push(volta);
    if (relargada) evento(volta, 'relargada', 'Relargada', []);
    const ativos = ordem.filter((c) => !c.fora);
    const pitaram = new Set<Carro>();
    const pressao = volta > voltas - 10;

    // Quebras e erros acontecem antes do fim da volta.
    for (const c of ativos) {
      const a = c.p.atributos;
      const quebra = (100 - c.equipe.sistemas.confiabilidade) * 0.00004;
      let erro = 0.00045 * Math.max(0.3, 1 + (90 - a.consistencia) * 0.08) * (1 + intensidade(c.p, 'erros_graves'));
      if (clima === 'molhado') erro *= 4;
      if (volta === 1) erro *= 3;
      if (sobSafetyCar) erro *= 0.1;
      if (rng() < quebra) {
        abandonar(c, volta, 'Quebra', tempoVolta);
        evento(volta, 'quebra', `${nomeDe(c)} abandona com problema no carro`, [c]);
        chamarSafetyCar(volta + 1, 0.15);
      } else if (rng() < erro) {
        abandonar(c, volta, 'Batida', tempoVolta);
        evento(volta, 'batida', `${nomeDe(c)} bate e está fora`, [c]);
        chamarSafetyCar(volta + 1, 0.5);
      }
    }

    const naPista = ativos.filter((c) => !c.fora);
    naPista.forEach((c, i) => {
      const a = c.p.atributos;
      const dados = COMPOSTOS[c.pneu];
      const vida = dados.vida / (pista.perfil.desgaste * c.fatorPneu);
      const pneu = dados.ritmo + dados.desgaste * c.idade * c.fatorPneu * pista.perfil.desgaste + Math.max(0, c.idade - vida) * 0.3;
      const combustivel = 1.8 * (1 - volta / voltas);
      let sigma = c.sigma;
      if (pressao && i < 3 && intensidade(c.p, 'frio_sob_pressao') > 0) sigma *= 0.8;
      let t = tempoVolta + combustivel + pneu - SEGUNDOS_POR_PONTO * (c.nota - 85) + c.formaDoDia + gauss(rng) * sigma;
      if (volta === 1) t += 4 - (a.largada - 80) * 0.03 + gauss(rng) * 0.25 + (rng() < 0.03 ? 1.5 : 0);
      if (sobSafetyCar) t = tempoVolta * 1.4;

      // Box: parada planejada, ou antecipada para aproveitar o safety car.
      const proxima = c.plano[c.stint];
      let parar = proxima !== undefined && proxima.ate <= volta;
      if (!parar && sobSafetyCar && proxima && proxima.ate !== Infinity && proxima.ate - volta <= 10 && c.idade >= 5) {
        parar = rng() < 0.4 + (c.estrategia - 75) * 0.02;
      }
      if (!parar && clima === 'seco' && c.idade > vida * 1.35 && c.stint < c.plano.length - 1) parar = true;
      c.pitando = false;
      if (parar && c.stint < c.plano.length - 1) {
        const ps = c.equipe.areas.pitStop;
        let parada = 2.2 + (100 - ps) * 0.04 + Math.abs(gauss(rng)) * 0.3;
        const lenta = rng() < 0.02 + (100 - ps) * 0.002;
        if (lenta) parada += 3 + rng() * 5;
        t += pista.perdaBox * (sobSafetyCar ? 0.5 : 1) + parada;
        c.stint++;
        c.pneu = c.plano[c.stint]!.composto;
        c.idade = 0;
        c.paradas++;
        c.pitando = true;
        pitaram.add(c);
        evento(volta, lenta ? 'box_lento' : 'box', lenta ? `Parada lenta para ${nomeDe(c)} (${parada.toFixed(1)}s)` : `${nomeDe(c)} para nos boxes`, [c]);
      }
      c.desejado = c.cum + t;
    });

    // Resolve a ordem no fim da volta: quem é mais rápido tenta passar o carro da frente.
    const fila: Carro[] = [];
    if (sobSafetyCar) {
      let anterior = -Infinity;
      for (const c of naPista) {
        const atraso = c.pitando ? c.desejado - (c.cum + tempoVolta * 1.4) : 0;
        c.cum = Math.max(anterior + 0.8, c.cum + tempoVolta * 1.4 * 0.65) + atraso;
        if (!c.pitando) anterior = c.cum;
        fila.push(c);
      }
      fila.sort((a, b) => a.cum - b.cum);
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
          cum += 0.15;
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
      if (!sobSafetyCar && !c.pitando && volta > 1 && tempo < c.melhorVolta) c.melhorVolta = tempo;
      if (!sobSafetyCar && !c.pitando && volta > 1 && (!voltaRapida || tempo < voltaRapida.tempo)) {
        voltaRapida = { pilotoId: c.p.id, volta, tempo };
      }
    }
    // Toques podem ter tirado alguém da corrida durante a disputa.
    ordem = [...fila.filter((c) => !c.fora), ...carros.filter((c) => c.fora)];
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
    let chance = 0.05 + 0.4 * pista.perfil.ultrapassagem + vantagem * 0.35 + (aa.ultrapassagem - defesa) * 0.012 + (rodaA - ad.rodaARoda) * 0.004;
    if (agressivo) chance += 0.1;
    if (volta === 1 || relargada) chance += 0.1;
    chance = limitar(chance, 0.03, 0.9);

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
        abandonar(vitima, volta, 'Toque', tempoVolta);
        evento(volta, 'batida', `${nomeDe(vitima)} fica fora depois do toque`, [vitima]);
        chamarSafetyCar(volta + 1, 0.5);
        return vitima === defensor ? 'passou' : 'segurou';
      }
      vitima.atraso += 3 + rng() * 6;
      if (vitima === defensor) return 'passou';
      return 'segurou';
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
    grid: grid.map(({ c, tempo }) => ({ pilotoId: c.p.id, tempo })),
    tempos: Object.fromEntries(carros.map((c) => [c.p.id, c.tempos])),
    abandonos,
    voltasSafetyCar,
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

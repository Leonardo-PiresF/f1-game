// Traços de personalidade: não mudam o overall, disparam efeitos temporários na corrida.
// Os números são o ponto de partida da revisão do Leonardo, para balancear no jogo.
import type { TracoId } from './types';

export interface DefinicaoTraco {
  nome: string;
  tipo: 'positivo' | 'negativo' | 'misto';
  gatilho: string;
  efeito: string;
}

export const TRACOS: Record<TracoId, DefinicaoTraco> = {
  queda_emocional: {
    nome: 'Queda emocional', tipo: 'negativo',
    gatilho: 'Corrida ou quali abaixo do esperado: atrás do companheiro, erro de estratégia da equipe, abandono',
    efeito: '35% de chance de -2 a -4 no overall até o fim da etapa seguinte; acumula se repetir',
  },
  erros_graves: {
    nome: 'Erros graves', tipo: 'negativo',
    gatilho: 'Pilotando no limite (quali, ataque, defesa sob pressão)',
    efeito: 'Chance de batida ou rodada 2× a média do grid',
  },
  cabeca_quente: {
    nome: 'Cabeça quente', tipo: 'negativo',
    gatilho: 'Ser ultrapassado, tocado ou prejudicado por um rival',
    efeito: '15% de chance de manobra de risco contra esse rival, com chance de toque e punição',
  },
  atrito_equipe: {
    nome: 'Atrito com a equipe', tipo: 'negativo',
    gatilho: 'Carro abaixo da expectativa por várias etapas',
    efeito: 'Moral da equipe cai; -1 em feedback e chance de pedir saída no fim do contrato',
  },
  sujo_roda_a_roda: {
    nome: 'Sujo no roda a roda', tipo: 'misto',
    gatilho: 'Disputa lado a lado',
    efeito: '+3 em defesa e roda a roda, mas 2× chance de punição e de toque',
  },
  sujo_companheiro: {
    nome: 'Sujo com companheiro', tipo: 'misto',
    gatilho: 'Disputa contra o próprio companheiro',
    efeito: 'Mesmo efeito do "sujo", só contra o companheiro; pode ignorar ordens de equipe',
  },
  roda_a_roda_limpo: {
    nome: 'Roda a roda limpo', tipo: 'positivo',
    gatilho: 'Disputa lado a lado',
    efeito: 'Metade da chance de punição; rivais limpos também evitam toque com ele',
  },
  estrategista: {
    nome: 'Estrategista', tipo: 'positivo',
    gatilho: 'Decisões de pit, VSC/SC, gestão de pneu',
    efeito: '+3 em estratégia da equipe quando é ele no carro',
  },
  mestre_chuva: {
    nome: 'Mestre da chuva', tipo: 'positivo',
    gatilho: 'Pista molhada ou mista',
    efeito: '+3 adicional em chuva e menos chance de erro no molhado',
  },
  frio_sob_pressao: {
    nome: 'Frio sob pressão', tipo: 'positivo',
    gatilho: 'Brigando por título, pódio ou vitória nas voltas finais',
    efeito: 'Ignora efeitos negativos de pressão; +1 em consistência nesses momentos',
  },
  evolucao_acelerada: {
    nome: 'Evolução acelerada', tipo: 'positivo',
    gatilho: 'Ao longo da temporada (pilotos jovens)',
    efeito: '+1 de overall a cada 6 etapas, até um teto definido',
  },
  lider_tecnico: {
    nome: 'Líder técnico', tipo: 'positivo',
    gatilho: 'Fora da pista, entre etapas',
    efeito: '+10% no ganho das atualizações do carro',
  },
  gestor_pneus: {
    nome: 'Gestor de pneus', tipo: 'positivo',
    gatilho: 'Stints longos',
    efeito: 'Degradação 10% menor; viabiliza estratégias de uma parada a menos',
  },
};

// Quando um destes dispara numa disputa, os outros do grupo ficam bloqueados nela
// (sugestão da revisão para Verstappen não acumular os dois).
export const TRACOS_EXCLUSIVOS_NA_DISPUTA: TracoId[][] = [['cabeca_quente', 'sujo_roda_a_roda']];

// Modelo de dados central do jogo. O overall é calculado a partir dos
// atributos (overallPiloto, overallEquipe), nunca guardado, para não ficar dessincronizado.

export type Categoria = 'F1' | 'F2';

export interface AtributosPiloto {
  quali: number; // 0 a 100: velocidade de uma volta
  ritmoCorrida: number; // velocidade sustentada em stint longo
  consistencia: number;
  largada: number;
  ultrapassagem: number;
  defesa: number;
  rodaARoda: number;
  gestaoPneu: number;
  chuva: number; // só vale em pista molhada
  feedback: number; // acerto do carro e desenvolvimento
  inteligencia: number; // leitura de corrida, SC/VSC, energia, rádio
}

// Peso de cada atributo no overall, em %. Soma 100.
export const PESOS_PILOTO: Record<keyof AtributosPiloto, number> = {
  quali: 14,
  ritmoCorrida: 20,
  consistencia: 16,
  largada: 6,
  ultrapassagem: 9,
  defesa: 7,
  rodaARoda: 6,
  gestaoPneu: 9,
  chuva: 3,
  feedback: 4,
  inteligencia: 6,
};

export type TracoId =
  | 'queda_emocional'
  | 'erros_graves'
  | 'cabeca_quente'
  | 'atrito_equipe'
  | 'sujo_roda_a_roda'
  | 'sujo_companheiro'
  | 'roda_a_roda_limpo'
  | 'estrategista'
  | 'mestre_chuva'
  | 'frio_sob_pressao'
  | 'evolucao_acelerada'
  | 'lider_tecnico'
  | 'gestor_pneus';

export interface TracoPiloto {
  id: TracoId;
  intensidade?: number; // 1 quando ausente; 0.5 = versão leve
}

export interface Piloto {
  id: string;
  nome: string;
  categoria: Categoria;
  nacionalidade?: string;
  nascimento?: string; // data ISO
  atributos: AtributosPiloto;
  tracos: TracoPiloto[]; // não entram no overall, agem como eventos na corrida
  potencial?: number; // teto de evolução
  forma?: number; // momento recente, sobe e desce na temporada
  reputacao?: number; // pesa no mercado
}

// Áreas que formam o overall da equipe de F1.
export interface AreasEquipeF1 {
  motor: number;
  aerodinamica: number;
  chassi: number;
  estrategia: number;
  pitStop: number;
}

export const PESOS_EQUIPE_F1: Record<keyof AreasEquipeF1, number> = {
  motor: 30,
  aerodinamica: 30,
  chassi: 25,
  estrategia: 10,
  pitStop: 5,
};

// Na F2 o carro é igual para todos; a equipe se diferencia no acerto.
export interface AreasEquipeF2 {
  acerto: number;
  estrategia: number;
  pitStop: number;
}

export const PESOS_EQUIPE_F2: Record<keyof AreasEquipeF2, number> = {
  acerto: 55,
  estrategia: 30,
  pitStop: 15,
};

// Atributos de equipe que ficam fora do overall e agem como sistemas próprios.
export interface SistemasEquipe {
  confiabilidade: number; // chance de quebra por corrida
  desenvolvimento: number; // ganho por atualização ao longo do ano
  gestaoPilotos?: number; // só F1: clareza das regras entre os dois pilotos
}

export interface Equipe {
  id: string;
  nome: string;
  categoria: Categoria;
  areas: AreasEquipeF1 | AreasEquipeF2;
  sistemas: SistemasEquipe;
  fornecedorMotor?: string; // só F1
  orcamento?: number;
}

// Média ponderada arredondada, usada para todos os overalls.
export function mediaPonderada<K extends string>(valores: Record<K, number>, pesos: Record<K, number>): number {
  let soma = 0;
  let total = 0;
  for (const k of Object.keys(pesos) as K[]) {
    soma += valores[k] * pesos[k];
    total += pesos[k];
  }
  return Math.round(soma / total);
}

export const overallPiloto = (p: Pick<Piloto, 'atributos'>) => mediaPonderada(p.atributos, PESOS_PILOTO);

export const overallEquipe = (e: Pick<Equipe, 'categoria' | 'areas'>) =>
  e.categoria === 'F1'
    ? mediaPonderada(e.areas as AreasEquipeF1, PESOS_EQUIPE_F1)
    : mediaPonderada(e.areas as AreasEquipeF2, PESOS_EQUIPE_F2);

export interface Contrato {
  pilotoId: string;
  equipeId: string;
  inicio: number; // ano
  fim: number;
  papel: 'titular' | 'reserva' | 'academia';
  salario: number;
}

export interface PerfilPista {
  velocidade: number; // 0 a 1: quanto o motor pesa no ritmo
  curvas: number; // 0 a 1: quanto a aerodinâmica pesa no ritmo
  ultrapassagem: number; // 0 a 1: facilidade de ultrapassar
  desgaste: number; // multiplicador da degradação dos pneus (1 = normal)
  chanceChuva: number; // 0 a 1
}

export interface ZonaUltrapassagem {
  inicio: number; // fração da volta a partir da linha de chegada
  fim: number;
}

export interface Pista {
  id: string;
  nome: string;
  pais: string;
  rodada?: number;
  data?: string;
  perfil: PerfilPista;
  voltas: number; // corrida de F1
  tempoVolta: number; // volta de corrida de referência no seco, sem combustível, em segundos
  perdaBox: number; // tempo perdido no pit lane, sem contar a parada
  comprimento?: number; // metros
  tracado: [number, number][]; // pontos no sentido da corrida, começando na linha de chegada, de 0 a 100
  box?: { entrada: number; saida: number }; // frações da volta onde o pit lane começa e termina
  zonas?: ZonaUltrapassagem[];
}

export interface ResultadoCorrida {
  pistaId: string;
  classificacao: string[]; // ids de piloto, do 1º ao último
}

export interface Temporada {
  ano: number;
  categoria: Categoria;
  calendario: string[]; // ids de pista
  resultados: ResultadoCorrida[];
}

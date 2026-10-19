// Modelo de dados central do jogo. O overall exibido é calculado a partir
// dos atributos, nunca guardado, para não ficar dessincronizado.

export type Categoria = 'F1' | 'F2';

export interface AtributosPiloto {
  ritmo: number; // 0 a 100
  consistencia: number;
  chuva: number;
  ultrapassagem: number;
  defesa: number;
}

export interface Piloto {
  id: string;
  nome: string;
  nacionalidade: string;
  nascimento: string; // data ISO
  atributos: AtributosPiloto;
  potencial: number; // teto de evolução
  forma: number; // momento recente, sobe e desce na temporada
  reputacao: number; // pesa no mercado
}

export interface AreasEquipe {
  motor: number;
  aerodinamica: number;
  chassi: number;
  estrategia: number;
  pitStop: number;
}

export interface Equipe {
  id: string;
  nome: string;
  categoria: Categoria;
  areas: AreasEquipe;
  orcamento: number;
  fornecedorMotor?: string; // só F1
}

export interface Contrato {
  pilotoId: string;
  equipeId: string;
  inicio: number; // ano
  fim: number;
  papel: 'titular' | 'reserva' | 'academia';
  salario: number;
}

export interface PerfilPista {
  velocidade: number;
  curvas: number;
  ultrapassagem: number;
  chanceChuva: number;
}

export interface Pista {
  id: string;
  nome: string;
  pais: string;
  perfil: PerfilPista;
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

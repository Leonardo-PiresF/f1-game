// Grid, classificação e calendário da F1 pela API Jolpica (sucessora da Ergast).
import { buscarJson } from '../lib/http.ts';

const API = 'https://api.jolpi.ca/ergast/f1';

interface PilotoApi {
  driverId: string;
  permanentNumber?: string;
  code?: string;
  givenName: string;
  familyName: string;
  dateOfBirth: string;
  nationality: string;
}

interface EquipeApi {
  constructorId: string;
  name: string;
  nationality: string;
}

interface Resposta<T> {
  MRData: T;
}

export interface PilotoF1 {
  id: string;
  nome: string;
  codigo?: string;
  numero?: number;
  nascimento: string;
  nacionalidade: string;
  equipeId: string;
  posicao: number;
  pontos: number;
  vitorias: number;
}

export interface EquipeF1 {
  id: string;
  nome: string;
  nacionalidade: string;
  posicao: number;
  pontos: number;
  vitorias: number;
}

export interface EtapaF1 {
  rodada: number;
  nome: string;
  data: string;
  pista: { id: string; nome: string; cidade: string; pais: string; lat: number; long: number };
}

export interface DadosF1 {
  ano: number;
  rodadasDisputadas: number;
  pilotos: PilotoF1[];
  equipes: EquipeF1[];
  calendario: EtapaF1[];
}

export async function buscarF1(ano: number): Promise<DadosF1> {
  const pilotos = await buscarJson<
    Resposta<{ StandingsTable: { StandingsLists: { round: string; DriverStandings: {
      position?: string; points: string; wins: string; Driver: PilotoApi; Constructors: EquipeApi[];
    }[] }[] } }>
  >(`${API}/${ano}/driverstandings.json?limit=100`);
  const equipes = await buscarJson<
    Resposta<{ StandingsTable: { StandingsLists: { ConstructorStandings: {
      position?: string; points: string; wins: string; Constructor: EquipeApi;
    }[] }[] } }>
  >(`${API}/${ano}/constructorstandings.json?limit=100`);
  const corridas = await buscarJson<
    Resposta<{ RaceTable: { Races: {
      round: string; raceName: string; date: string;
      Circuit: { circuitId: string; circuitName: string; Location: { lat: string; long: string; locality: string; country: string } };
    }[] } }>
  >(`${API}/${ano}/races.json?limit=100`);

  const listaPilotos = pilotos.MRData.StandingsTable.StandingsLists[0];
  const listaEquipes = equipes.MRData.StandingsTable.StandingsLists[0];
  if (!listaPilotos || !listaEquipes) throw new Error(`Sem classificação da F1 para ${ano}`);

  return {
    ano,
    rodadasDisputadas: Number(listaPilotos.round),
    pilotos: listaPilotos.DriverStandings.map((s, i) => ({
      id: s.Driver.driverId,
      nome: `${s.Driver.givenName} ${s.Driver.familyName}`,
      codigo: s.Driver.code,
      numero: s.Driver.permanentNumber ? Number(s.Driver.permanentNumber) : undefined,
      nascimento: s.Driver.dateOfBirth,
      nacionalidade: s.Driver.nationality,
      // Quem trocou de equipe no ano aparece com mais de uma; a última é a atual.
      equipeId: s.Constructors.at(-1)!.constructorId,
      posicao: Number(s.position ?? i + 1),
      pontos: Number(s.points),
      vitorias: Number(s.wins),
    })),
    equipes: listaEquipes.ConstructorStandings.map((s, i) => ({
      id: s.Constructor.constructorId,
      nome: s.Constructor.name,
      nacionalidade: s.Constructor.nationality,
      posicao: Number(s.position ?? i + 1),
      pontos: Number(s.points),
      vitorias: Number(s.wins),
    })),
    calendario: corridas.MRData.RaceTable.Races.map((r) => ({
      rodada: Number(r.round),
      nome: r.raceName,
      data: r.date,
      pista: {
        id: r.Circuit.circuitId,
        nome: r.Circuit.circuitName,
        cidade: r.Circuit.Location.locality,
        pais: r.Circuit.Location.country,
        lat: Number(r.Circuit.Location.lat),
        long: Number(r.Circuit.Location.long),
      },
    })),
  };
}

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

export interface ResultadoF1 {
  rodada: number;
  pilotoId: string;
  equipeId: string;
  largada: number; // 0 = largou do pit lane
  chegada: number | null; // null quando não foi classificado
  status: string;
  pontos: number;
}

export interface ClassificatorioF1 {
  rodada: number;
  pilotoId: string;
  posicao: number;
}

export interface DadosF1 {
  ano: number;
  rodadasDisputadas: number;
  pilotos: PilotoF1[];
  equipes: EquipeF1[];
  calendario: EtapaF1[];
  resultados: ResultadoF1[];
  classificatorios: ClassificatorioF1[];
}

// A API devolve no máximo 100 linhas por página; junta as corridas de todas as páginas.
async function buscarPaginado<T>(url: string, chave: 'Results' | 'QualifyingResults'): Promise<{ round: string; linhas: T[] }[]> {
  const porRodada = new Map<string, T[]>();
  for (let offset = 0; ; offset += 100) {
    const pagina = await buscarJson<Resposta<{ total: string; RaceTable: { Races: ({ round: string } & Record<string, T[]>)[] } }>>(
      `${url}?limit=100&offset=${offset}`,
    );
    for (const corrida of pagina.MRData.RaceTable.Races) {
      porRodada.set(corrida.round, [...(porRodada.get(corrida.round) ?? []), ...(corrida[chave] ?? [])]);
    }
    if (offset + 100 >= Number(pagina.MRData.total)) break;
  }
  return [...porRodada].map(([round, linhas]) => ({ round, linhas }));
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

  const resultados = await buscarPaginado<{
    position: string; positionText: string; grid: string; status: string; points: string;
    Driver: PilotoApi; Constructor: EquipeApi;
  }>(`${API}/${ano}/results.json`, 'Results');
  const classificatorios = await buscarPaginado<{ position: string; Driver: PilotoApi }>(
    `${API}/${ano}/qualifying.json`, 'QualifyingResults',
  );

  const equipeAtual = new Map<string, string>();
  for (const { linhas } of resultados.sort((a, b) => Number(a.round) - Number(b.round))) {
    for (const r of linhas) equipeAtual.set(r.Driver.driverId, r.Constructor.constructorId);
  }

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
      // A equipe atual é a da corrida mais recente; a lista da classificação não vem em ordem.
      equipeId: equipeAtual.get(s.Driver.driverId) ?? s.Constructors[0]!.constructorId,
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
    resultados: resultados.flatMap(({ round, linhas }) =>
      linhas.map((r) => ({
        rodada: Number(round),
        pilotoId: r.Driver.driverId,
        equipeId: r.Constructor.constructorId,
        largada: Number(r.grid),
        // positionText é "R", "D", "W"... para quem não foi classificado.
        chegada: /^\d+$/.test(r.positionText) ? Number(r.position) : null,
        status: r.status,
        pontos: Number(r.points),
      })),
    ),
    classificatorios: classificatorios.flatMap(({ round, linhas }) =>
      linhas.map((q) => ({ rodada: Number(round), pilotoId: q.Driver.driverId, posicao: Number(q.position) })),
    ),
  };
}

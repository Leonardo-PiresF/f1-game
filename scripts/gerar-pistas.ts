// Gera src/data/pistas.json com as pistas do calendário: traçado real (bacinger/f1-circuits),
// número de voltas e volta de referência (Jolpica) e os dados manuais de dados/manual/pistas.json.
// Uso: npm run pistas -- 2026
import { readFile, writeFile } from 'node:fs/promises';
import { buscarJson } from './lib/http.ts';
import { detectarZonas, normalizarTracado, projetar, reamostrar } from './pistas/geometria.ts';

const ano = Number(process.argv[2] ?? 2026);
const API = 'https://api.jolpi.ca/ergast/f1';

interface Manual {
  geo: string;
  nome: string;
  pais: string;
  perfil: Record<string, number>;
  perdaBox: number;
  box: { entrada: number; saida: number };
}

interface CorridaApi {
  round: string;
  raceName: string;
  date: string;
  Circuit: { circuitId: string };
  Results?: { laps: string; FastestLap?: { Time?: { time: string } } }[];
}

type Resposta = { MRData: { RaceTable: { Races: CorridaApi[] } } };

const segundos = (t: string) => {
  const [m, s] = t.includes(':') ? t.split(':') : ['0', t];
  return Number(m) * 60 + Number(s);
};

async function referencia(temporada: number) {
  const vencedores = await buscarJson<Resposta>(`${API}/${temporada}/results/1.json?limit=100`);
  const rapidas = await buscarJson<Resposta>(`${API}/${temporada}/fastest/1/results.json?limit=100`);
  const porPista = new Map<string, { voltas: number; rapida?: number }>();
  for (const c of vencedores.MRData.RaceTable.Races) {
    porPista.set(c.Circuit.circuitId, { voltas: Number(c.Results?.[0]?.laps) });
  }
  for (const c of rapidas.MRData.RaceTable.Races) {
    const t = c.Results?.[0]?.FastestLap?.Time?.time;
    const atual = porPista.get(c.Circuit.circuitId);
    if (t && atual) atual.rapida = segundos(t);
  }
  return porPista;
}

const manual = JSON.parse(await readFile('dados/manual/pistas.json', 'utf8')) as { fonte: string; pistas: Record<string, Manual> };
const geo = JSON.parse(await readFile('dados/brutos/f1-circuits.geojson', 'utf8')) as {
  features: { properties: { id: string; length: number }; geometry: { coordinates: [number, number][] } }[];
};
const calendario = (await buscarJson<Resposta>(`${API}/${ano}.json?limit=100`)).MRData.RaceTable.Races;
const atual = await referencia(ano);
const anterior = await referencia(ano - 1);

// Os carros mudam de um ano para o outro: corrige a volta do ano anterior pela diferença mediana.
const diferencas = [...atual.entries()]
  .filter(([id, r]) => r.rapida && anterior.get(id)?.rapida)
  .map(([id, r]) => r.rapida! - anterior.get(id)!.rapida!)
  .sort((a, b) => a - b);
const ajuste = diferencas.length ? diferencas[Math.floor(diferencas.length / 2)]! : 0;

const pistas = calendario.map((c) => {
  const id = c.Circuit.circuitId;
  const m = manual.pistas[id];
  if (!m) throw new Error(`Sem dados manuais para ${id}`);
  const feicao = geo.features.find((f) => f.properties.id === m.geo);
  if (!feicao) throw new Error(`Sem traçado ${m.geo} para ${id}`);
  const metros = projetar(feicao.geometry.coordinates);
  const { pontos, comprimento } = reamostrar(metros, 240);
  const ref = atual.get(id);
  const refAnterior = anterior.get(id);
  const km = comprimento / 1000;
  const voltas = ref?.voltas || refAnterior?.voltas || Math.ceil(305 / km);
  const rapida = ref?.rapida ?? (refAnterior?.rapida !== undefined ? refAnterior.rapida + ajuste : (km / 205) * 3600);
  return {
    id,
    nome: m.nome,
    pais: m.pais,
    rodada: Number(c.round),
    data: c.date,
    perfil: m.perfil,
    voltas,
    // A volta mais rápida é feita com pouco combustível e pneu novo; a referência do motor fica um pouco acima.
    tempoVolta: Math.round((rapida + 0.6) * 1000) / 1000,
    perdaBox: m.perdaBox,
    comprimento: Math.round(comprimento),
    tracado: normalizarTracado(pontos),
    box: m.box,
    zonas: detectarZonas(pontos, comprimento),
  };
});

await writeFile(
  'src/data/pistas.json',
  JSON.stringify(
    {
      ano,
      fonte: `${manual.fonte} Voltas e volta de referência: Jolpica (${ano}, ou ${ano - 1} ajustado em ${ajuste.toFixed(2)}s quando a corrida ainda não aconteceu). Zonas de ultrapassagem: retas mais longas do traçado, detectadas automaticamente.`,
      pistas,
    },
    null,
    1,
  ) + '\n',
);
for (const p of pistas) {
  console.log(`${String(p.rodada).padStart(2)} ${p.id.padEnd(14)} ${String(p.voltas).padStart(2)} voltas  ref ${p.tempoVolta.toFixed(1)}s  ${p.comprimento}m  zonas ${p.zonas.length}`);
}
console.log(`ajuste ${ano - 1}→${ano}: ${ajuste.toFixed(2)}s`);

// Calcula os overalls a partir de dados/brutos/ e gera src/data/temporada-<ano>.json
// e uma tabela de revisão em dados/revisao-overall-<ano>.md.
// Uso: npm run overall -- 2026
import { readFile, writeFile } from 'node:fs/promises';
import type { DadosF1 } from './f1/jolpica.ts';
import type { ClassificacaoF2, InscritoF2 } from './f2/wikipedia.ts';
import { calcularF1, calcularF2, MOTORES_2026, type PilotoCalculado } from './overall/calcular.ts';

const ano = Number(process.argv[2] ?? new Date().getFullYear());
const raiz = new URL('../', import.meta.url);
const ler = async <T>(caminho: string) => JSON.parse(await readFile(new URL(caminho, raiz), 'utf8')) as T;

const f1 = await ler<DadosF1>(`dados/brutos/f1-${ano}.json`);
const f2 = await ler<{ inscritos: InscritoF2[]; classificacao: ClassificacaoF2[] }>(`dados/brutos/f2-${ano}.json`);

const { pilotos: pilotosF1, equipes } = calcularF1(f1);
const pilotosF2 = calcularF2(f2.classificacao, new Map(f2.inscritos.map((i) => [i.idPiloto, i.equipe])));
const nomeEquipe = new Map(equipes.map((e) => [e.id, e.nome]));

await writeFile(
  new URL(`src/data/temporada-${ano}.json`, raiz),
  JSON.stringify({ ano, equipesF1: equipes, pilotos: [...pilotosF1, ...pilotosF2].map((p) => ({ ...p, base: undefined })) }, null, 2) + '\n',
);

const linhaPiloto = (p: PilotoCalculado, colunas: string[]) =>
  `| ${p.nome} | ${nomeEquipe.get(p.equipe) ?? p.equipe}${p.papel === 'reserva' ? ' (reserva)' : ''} | **${p.overall}** | ${p.atributos.ritmo} | ${p.atributos.consistencia} | ${p.atributos.ultrapassagem} | ${p.atributos.defesa} | ${colunas.map((c) => p.base[c]).join(' | ')} |`;
const porOverall = (a: PilotoCalculado, b: PilotoCalculado) => b.overall - a.overall;

const md = `# Revisão dos overalls ${ano}

Gerado por \`npm run overall -- ${ano}\` com ${f1.rodadasDisputadas} corridas de F1 disputadas. Chuva ainda não tem dado próprio e acompanha o nível geral.

## Pilotos de F1

| Piloto | Equipe | Overall | Ritmo | Consist. | Ultrap. | Defesa | Força do carro | Duelo quali | Duelo corrida | Abandonos | Posições ganhas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${[...pilotosF1].sort(porOverall).map((p) => linhaPiloto(p, ['forcaCarro', 'dueloQuali', 'dueloCorrida', 'abandonos', 'posicoesGanhas'])).join('\n')}

## Equipes de F1

| Equipe | Motor | Overall | Motor | Aero | Chassi | Estratégia | Pit stop |
| --- | --- | --- | --- | --- | --- | --- | --- |
${[...equipes].sort((a, b) => b.overall - a.overall).map((e) => `| ${e.nome} | ${MOTORES_2026[e.id] ?? '?'} | **${e.overall}** | ${e.areas.motor} | ${e.areas.aerodinamica} | ${e.areas.chassi} | ${e.areas.estrategia} | ${e.areas.pitStop} |`).join('\n')}

Estratégia e pit stop ainda não têm dado próprio e acompanham a força do carro.

## Pilotos de F2

| Piloto | Equipe | Overall | Ritmo | Consist. | Ultrap. | Defesa | Pontos | Fração do líder | Corridas | Abandonos |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${[...pilotosF2].sort(porOverall).map((p) => linhaPiloto(p, ['pontos', 'fracaoDoLider', 'corridas', 'abandonos'])).join('\n')}
`;
await writeFile(new URL(`dados/revisao-overall-${ano}.md`, raiz), md);
console.log(`Gerado src/data/temporada-${ano}.json e dados/revisao-overall-${ano}.md`);

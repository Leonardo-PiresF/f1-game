// Calcula os atributos a partir de dados/brutos/, aplica a revisão manual de dados/manual/
// e gera src/data/temporada-<ano>.json e a tabela dados/revisao-overall-<ano>.md.
// Uso: npm run overall -- 2026
import { readFile, writeFile } from 'node:fs/promises';
import { TRACOS } from '../src/engine/tracos.ts';
import { overallEquipe, overallPiloto, type AreasEquipeF1, type AreasEquipeF2, type AtributosPiloto } from '../src/engine/types.ts';
import type { DadosF1 } from './f1/jolpica.ts';
import type { ClassificacaoF2, InscritoF2 } from './f2/wikipedia.ts';
import { calcularF1, calcularF2 } from './overall/calcular.ts';
import { aplicarEquipes, aplicarPilotos, type DadosManuais } from './overall/manual.ts';

const ano = Number(process.argv[2] ?? new Date().getFullYear());
const raiz = new URL('../', import.meta.url);
const ler = async <T>(caminho: string) => JSON.parse(await readFile(new URL(caminho, raiz), 'utf8')) as T;
const lerOpcional = async <T>(caminho: string, padrao: T) => ler<T>(caminho).catch(() => padrao);

const f1 = await ler<DadosF1>(`dados/brutos/f1-${ano}.json`);
const f2 = await ler<{ inscritos: InscritoF2[]; classificacao: ClassificacaoF2[] }>(`dados/brutos/f2-${ano}.json`);
const manual = await lerOpcional<DadosManuais>(`dados/manual/${ano}.json`, { fonte: '', pilotos: {}, equipesF1: {}, equipesF2: {} });

const calcF1 = calcularF1(f1);
const calcF2 = calcularF2(f2.classificacao, f2.inscritos);
const pilotos = aplicarPilotos([...calcF1.pilotos, ...calcF2.pilotos], manual);
const equipes = aplicarEquipes([...calcF1.equipes, ...calcF2.equipes], manual);

await writeFile(
  new URL(`src/data/temporada-${ano}.json`, raiz),
  JSON.stringify(
    {
      ano,
      equipes: equipes.map((e) => e.final),
      pilotos: pilotos.map(({ final }) => ({ ...final, base: undefined })),
    },
    null,
    2,
  ) + '\n',
);

// Tabela de revisão
const nomeEquipe = new Map(equipes.map((e) => [e.final.id, e.final.nome]));
const COLUNAS: [keyof AtributosPiloto, string][] = [
  ['quali', 'Quali'], ['ritmoCorrida', 'Ritmo'], ['consistencia', 'Consist.'], ['largada', 'Largada'],
  ['ultrapassagem', 'Ultrap.'], ['defesa', 'Defesa'], ['rodaARoda', 'Roda a roda'], ['gestaoPneu', 'Pneu'],
  ['chuva', 'Chuva'], ['feedback', 'Feedback'], ['inteligencia', 'Intelig.'],
];
const tabelaPilotos = (categoria: 'F1' | 'F2') => {
  const linhas = pilotos
    .filter((p) => p.final.categoria === categoria)
    .sort((a, b) => overallPiloto(b.final) - overallPiloto(a.final))
    .map(({ final: p, calculado, origem }) => {
      const equipe = `${nomeEquipe.get(p.equipeId) ?? p.equipeId}${p.papel === 'reserva' ? ' (reserva)' : ''}`;
      const tracos = p.tracos.map((t) => TRACOS[t.id].nome + (t.intensidade && t.intensidade < 1 ? ' (leve)' : '')).join(', ');
      return `| ${p.nome} | ${equipe} | **${overallPiloto(p)}** | ${COLUNAS.map(([k]) => p.atributos[k]).join(' | ')} | ${tracos} | ${origem} | ${overallPiloto(calculado)} |`;
    });
  return [
    `| Piloto | Equipe | Overall | ${COLUNAS.map(([, n]) => n).join(' | ')} | Traços | Origem | Overall calculado |`,
    `| ${Array(COLUNAS.length + 6).fill('---').join(' | ')} |`,
    ...linhas,
  ].join('\n');
};
const tabelaEquipes = (categoria: 'F1' | 'F2') => {
  const areas = categoria === 'F1'
    ? (['motor', 'aerodinamica', 'chassi', 'estrategia', 'pitStop'] as (keyof AreasEquipeF1)[])
    : (['acerto', 'estrategia', 'pitStop'] as (keyof AreasEquipeF2)[]);
  const sistemas = categoria === 'F1' ? (['confiabilidade', 'gestaoPilotos', 'desenvolvimento'] as const) : (['confiabilidade', 'desenvolvimento'] as const);
  const NOMES: Record<string, string> = {
    motor: 'Motor', aerodinamica: 'Aero', chassi: 'Chassi', estrategia: 'Estratégia', pitStop: 'Pit stop', acerto: 'Acerto',
    confiabilidade: 'Confiabilidade', gestaoPilotos: 'Gestão de pilotos', desenvolvimento: 'Desenvolvimento',
  };
  const linhas = equipes
    .filter((e) => e.final.categoria === categoria)
    .sort((a, b) => overallEquipe(b.final) - overallEquipe(a.final))
    .map(({ final: e, calculado, origem }) => {
      const a = e.areas as unknown as Record<string, number>;
      return `| ${e.nome} | **${overallEquipe(e)}** | ${areas.map((k) => a[k]).join(' | ')} | ${sistemas.map((k) => e.sistemas[k]).join(' | ')} | ${origem} | ${overallEquipe(calculado)} |`;
    });
  return [
    `| Equipe | Overall | ${[...areas, ...sistemas].map((k) => NOMES[k]).join(' | ')} | Origem | Overall calculado |`,
    `| ${Array(areas.length + sistemas.length + 4).fill('---').join(' | ')} |`,
    ...linhas,
  ].join('\n');
};

const md = `# Overalls ${ano}

Gerado por \`npm run overall -- ${ano}\`. "Origem" diz se o valor veio da revisão manual (\`dados/manual/${ano}.json\`) ou do cálculo automático; "Overall calculado" é o que o script daria sozinho, para comparar.

## Pilotos de F1

${tabelaPilotos('F1')}

## Equipes de F1

${tabelaEquipes('F1')}

## Pilotos de F2

${tabelaPilotos('F2')}

## Equipes de F2

${tabelaEquipes('F2')}
`;
await writeFile(new URL(`dados/revisao-overall-${ano}.md`, raiz), md);
console.log(`Gerado src/data/temporada-${ano}.json e dados/revisao-overall-${ano}.md`);

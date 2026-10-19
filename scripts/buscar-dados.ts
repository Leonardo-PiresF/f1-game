// Busca os dados brutos de F1 e F2 de um ano e salva em dados/brutos/.
// Uso: npm run dados -- 2026
import { mkdir, writeFile } from 'node:fs/promises';
import { buscarF1 } from './f1/jolpica.ts';
import { lerClassificacao, lerInscritos } from './f2/wikipedia.ts';
import { buscarJson } from './lib/http.ts';

const ano = Number(process.argv[2] ?? new Date().getFullYear());
const pasta = new URL('../dados/brutos/', import.meta.url);

async function salvar(nome: string, dados: object) {
  await mkdir(pasta, { recursive: true });
  const conteudo = { geradoEm: new Date().toISOString().slice(0, 10), ...dados };
  await writeFile(new URL(nome, pasta), JSON.stringify(conteudo, null, 2) + '\n');
  console.log(`Salvo dados/brutos/${nome}`);
}

const f1 = await buscarF1(ano);
await salvar(`f1-${ano}.json`, { fonte: 'https://api.jolpi.ca', ...f1 });

const pagina = `${ano}_Formula_2_Championship`;
const { parse } = await buscarJson<{ parse: { wikitext: string } }>(
  `https://en.wikipedia.org/w/api.php?action=parse&page=${pagina}&redirects=1&prop=wikitext&format=json&formatversion=2`,
);
await salvar(`f2-${ano}.json`, {
  fonte: `https://en.wikipedia.org/wiki/${pagina}`,
  ano,
  inscritos: lerInscritos(parse.wikitext),
  classificacao: lerClassificacao(parse.wikitext),
});

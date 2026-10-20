// Roda muitas corridas e imprime estatísticas para calibrar o simulador.
// Uso: node scripts/calibrar-corrida.ts [pista] [F1|F2] [n] [seco|molhado]
import temporada from '../src/data/temporada-2026.json' with { type: 'json' };
import { montarGrid, simularCorrida, type PilotoNaCorrida } from '../src/engine/corrida.ts';
import { buscarPista } from '../src/engine/pistas.ts';
import type { Categoria, Equipe } from '../src/engine/types.ts';

const [pistaId = 'interlagos', cat = 'F1', nTxt = '300', clima] = process.argv.slice(2);
const categoria = cat as Categoria;
const n = Number(nTxt);
const pilotos = montarGrid(temporada.pilotos as unknown as (PilotoNaCorrida & { papel: string })[], categoria);
const equipes = temporada.equipes as unknown as Equipe[];
const pista = buscarPista(pistaId);

const vitorias = new Map<string, number>();
const pontos = new Map<string, number>();
const poles = new Map<string, number>();
let vsc = 0, undercut = 0, tentativas = 0;
const estrategias = new Map<string, number>();
let abandonos = 0, ultrapassagens = 0, sc = 0, paradas = 0, toques = 0, punicoes = 0, molhadas = 0, chegaram = 0;
let margem = 0;
let vermelhas = 0, limites = 0, encerradas = 0, desdobradas = 0;
for (let s = 1; s <= n; s++) {
  const c = simularCorrida({ pista, categoria, pilotos, equipes, semente: s, clima: clima as 'seco' | 'molhado' | undefined });
  const v = c.resultado[0]!.pilotoId;
  vitorias.set(v, (vitorias.get(v) ?? 0) + 1);
  poles.set(c.grid[0]!.pilotoId, (poles.get(c.grid[0]!.pilotoId) ?? 0) + 1);
  for (const r of c.resultado) {
    pontos.set(r.pilotoId, (pontos.get(r.pilotoId) ?? 0) + r.pontos);
    if (r.status === 'chegou') { chegaram++; paradas += r.paradas; }
  }
  abandonos += c.resultado.filter((r) => r.status === 'abandonou').length;
  ultrapassagens += c.eventos.filter((e) => e.tipo === 'ultrapassagem').length;
  toques += c.eventos.filter((e) => e.tipo === 'toque').length;
  punicoes += c.eventos.filter((e) => e.tipo === 'punicao').length;
  sc += c.eventos.filter((e) => e.tipo === 'safety_car').length;
  vsc += c.eventos.filter((e) => e.tipo === 'vsc').length;
  undercut += c.eventos.filter((e) => e.texto.startsWith('O undercut deu certo')).length;
  tentativas += c.eventos.filter((e) => e.texto.includes('tentar o undercut')).length;
  for (const r of c.resultado) if (r.status === 'chegou') estrategias.set(r.pneus.join('-'), (estrategias.get(r.pneus.join('-')) ?? 0) + 1);
  if (c.clima === 'molhado') molhadas++;
  margem += c.resultado[1]!.tempoTotal - c.resultado[0]!.tempoTotal;
  vermelhas += c.neutralizacoes.filter((x) => x.tipo === 'VERMELHA').length;
  limites += c.eventos.filter((e) => e.tipo === 'punicao' && e.texto.includes('limites')).length;
  desdobradas += c.eventos.filter((e) => e.tipo === 'retardatarios').length;
  if (c.voltas < c.voltasPrevistas) encerradas++;
}
const f = (x: number) => (x / n).toFixed(2);
console.log(`${pista.nome} ${categoria}, ${n} corridas. Molhadas ${molhadas}`);
console.log(`por corrida: abandonos ${f(abandonos)}, ultrapassagens ${f(ultrapassagens)}, toques ${f(toques)}, punições ${f(punicoes)}, SC ${f(sc)}, VSC ${f(vsc)}, undercuts ${f(undercut)} de ${f(tentativas)} tentativas, paradas/piloto ${(paradas / chegaram).toFixed(2)}, margem vitória ${f(margem)}s`);
console.log(`bandeiras vermelhas ${f(vermelhas)}, encerradas antes ${encerradas}, punições por limites ${f(limites)}, retardatários liberados ${f(desdobradas)}`);
console.log('estratégias mais usadas:', [...estrategias.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} ${((100 * v) / chegaram).toFixed(0)}%`).join(', '));
const top = [...pontos.entries()].sort((a, b) => b[1] - a[1]);
for (const [id, p] of top) console.log(id.padEnd(26), 'pts/corrida', f(p).padStart(6), 'vit', String(vitorias.get(id) ?? 0).padStart(4), 'poles', String(poles.get(id) ?? 0).padStart(4));

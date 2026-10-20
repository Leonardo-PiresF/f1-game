import { useEffect, useMemo, useRef, useState } from 'react';
import temporada from '../data/temporada-2026.json';
import { montarGrid, simularCorrida, sobrenome, type Clima, type Corrida, type PilotoNaCorrida } from '../engine/corrida';
import { buscarPista, PISTAS } from '../engine/pistas';
import type { Categoria, Equipe } from '../engine/types';
import { corEquipe, PNEUS } from './cores';
import { MapaPista } from './MapaPista';
import { duracao, formatarTempo, torreNoTempo } from './relogio';

const PILOTOS = temporada.pilotos as unknown as (PilotoNaCorrida & { papel: string })[];
const EQUIPES = temporada.equipes as unknown as Equipe[];
const VELOCIDADES = [10, 30, 60, 120];

const sigla = (nome: string) =>
  sobrenome(nome)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .slice(0, 3)
    .toUpperCase();

interface Config {
  categoria: Categoria;
  pistaId: string;
  clima: Clima | 'sorteado';
  semente: number;
}

const novaSemente = () => Math.floor(Math.random() * 1_000_000);

export function TelaCorrida() {
  const [config, setConfig] = useState<Config>({ categoria: 'F1', pistaId: 'interlagos', clima: 'sorteado', semente: novaSemente() });
  const [corrida, setCorrida] = useState<Corrida | null>(null);

  const largar = () => {
    const pilotos = montarGrid(PILOTOS, config.categoria);
    setCorrida(
      simularCorrida({
        pista: buscarPista(config.pistaId),
        categoria: config.categoria,
        pilotos,
        equipes: EQUIPES,
        semente: config.semente,
        clima: config.clima === 'sorteado' ? undefined : config.clima,
      }),
    );
  };

  return (
    <div className="corrida">
      <form
        className="config"
        onSubmit={(e) => {
          e.preventDefault();
          largar();
        }}
      >
        <label>
          Categoria
          <select value={config.categoria} onChange={(e) => setConfig({ ...config, categoria: e.target.value as Categoria })}>
            <option value="F1">F1</option>
            <option value="F2">F2</option>
          </select>
        </label>
        <label>
          Pista
          <select value={config.pistaId} onChange={(e) => setConfig({ ...config, pistaId: e.target.value })}>
            {PISTAS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
        <label>
          Clima
          <select value={config.clima} onChange={(e) => setConfig({ ...config, clima: e.target.value as Config['clima'] })}>
            <option value="sorteado">Sorteado</option>
            <option value="seco">Seco</option>
            <option value="molhado">Molhado</option>
          </select>
        </label>
        <label>
          Semente
          <span className="semente">
            <input type="number" value={config.semente} onChange={(e) => setConfig({ ...config, semente: Number(e.target.value) })} />
            <button type="button" onClick={() => setConfig({ ...config, semente: novaSemente() })} title="Sortear outra semente">
              🎲
            </button>
          </span>
        </label>
        <button type="submit" className="largar">
          Largar
        </button>
      </form>
      {corrida ? <Transmissao key={`${corrida.pistaId}-${corrida.categoria}-${corrida.semente}-${corrida.clima}`} corrida={corrida} /> : <p className="dica">Escolha a pista e clique em Largar. A mesma semente sempre gera a mesma corrida.</p>}
    </div>
  );
}

function Transmissao({ corrida }: { corrida: Corrida }) {
  const pista = buscarPista(corrida.pistaId);
  const fim = useMemo(() => duracao(corrida), [corrida]);
  const [tempo, setTempo] = useState(0);
  const [tocando, setTocando] = useState(true);
  const [velocidade, setVelocidade] = useState(30);
  const [mostrarNomes, setMostrarNomes] = useState(true);
  const ultimoQuadro = useRef<number | null>(null);

  useEffect(() => {
    if (!tocando) return;
    let id = 0;
    const quadro = (agora: number) => {
      const dt = ultimoQuadro.current === null ? 0 : (agora - ultimoQuadro.current) / 1000;
      ultimoQuadro.current = agora;
      setTempo((t) => {
        const novo = Math.min(fim, t + dt * velocidade);
        if (novo >= fim) setTocando(false);
        return novo;
      });
      id = requestAnimationFrame(quadro);
    };
    id = requestAnimationFrame(quadro);
    return () => {
      cancelAnimationFrame(id);
      ultimoQuadro.current = null;
    };
  }, [tocando, velocidade, fim]);

  const pilotos = useMemo(() => new Map(PILOTOS.map((p) => [p.id, p])), []);
  const equipes = useMemo(() => new Map(EQUIPES.map((e) => [e.id, e])), []);
  const equipeDe = useMemo(() => new Map(corrida.resultado.map((r) => [r.pilotoId, r.equipeId])), [corrida]);
  const siglas = useMemo(() => new Map(corrida.resultado.map((r) => [r.pilotoId, sigla(pilotos.get(r.pilotoId)!.nome)])), [corrida, pilotos]);
  // O segundo piloto de cada equipe (pela ordem do grid) ganha borda escura, para diferenciar no mapa.
  const segundoPiloto = useMemo(() => {
    const vistos = new Set<string>();
    const segundos = new Set<string>();
    for (const g of corrida.grid) {
      const eq = equipeDe.get(g.pilotoId)!;
      if (vistos.has(eq)) segundos.add(g.pilotoId);
      vistos.add(eq);
    }
    return segundos;
  }, [corrida, equipeDe]);

  const linhas = torreNoTempo(corrida, tempo);
  const lider = linhas[0]!;
  const voltaAtual = Math.min(corrida.voltas, Math.floor(Math.max(0, lider.distancia)) + 1);
  const terminou = tempo >= fim;
  const safetyCar = corrida.voltasSafetyCar.includes(voltaAtual) && !lider.terminou;
  const estadoDaVolta = (pilotoId: string, voltas: number) => corrida.estados[Math.min(voltas, corrida.estados.length - 1)]!.find((e) => e.pilotoId === pilotoId)!;
  const eventos = corrida.eventos.filter((e) => e.tipo !== 'box' && e.volta <= lider.voltas).slice(-8).reverse();
  const nome = (id: string) => pilotos.get(id)!.nome;

  return (
    <>
      <div className="transmissao">
        <section className="pista">
          <header className="placar">
            <strong>{pista.nome}</strong>
            <span>
              Volta {voltaAtual}/{corrida.voltas}
            </span>
            <span>{corrida.clima === 'molhado' ? '🌧️ Molhado' : '☀️ Seco'}</span>
            {safetyCar && <span className="sc">SAFETY CAR</span>}
            {lider.terminou && <span className="bandeira">🏁 Bandeirada</span>}
          </header>
          <MapaPista pista={pista} linhas={linhas} siglas={siglas} equipeDe={equipeDe} segundoPiloto={segundoPiloto} mostrarNomes={mostrarNomes} />
          <div className="controles">
            <button
              type="button"
              onClick={() => {
                if (terminou) setTempo(0);
                setTocando(terminou || !tocando);
              }}
            >
              {terminou ? '↺ Rever' : tocando ? '⏸ Pausar' : '▶ Continuar'}
            </button>
            {VELOCIDADES.map((v) => (
              <button key={v} type="button" className={v === velocidade ? 'ativo' : ''} onClick={() => setVelocidade(v)}>
                {v}×
              </button>
            ))}
            <button type="button" onClick={() => setTempo(fim)}>
              ⏭ Fim
            </button>
            <label className="nomes">
              <input type="checkbox" checked={mostrarNomes} onChange={(e) => setMostrarNomes(e.target.checked)} /> Nomes
            </label>
          </div>
          <ol className="eventos">
            {eventos.map((e, i) => (
              <li key={`${e.volta}-${i}-${e.texto}`} className={`evento-${e.tipo}`}>
                <span className="volta">V{e.volta}</span> {e.texto}
              </li>
            ))}
          </ol>
        </section>
        <ol className="torre">
          {linhas.map((l) => {
            const estado = estadoDaVolta(l.pilotoId, l.voltas);
            const pneu = PNEUS[estado.pneu];
            const proximo = corrida.estados[l.voltas + 1]?.find((e) => e.pilotoId === l.pilotoId);
            return (
              <li key={l.pilotoId} className={l.fora ? 'fora' : ''}>
                <span className="pos">{l.posicao}</span>
                <span className="faixa" style={{ background: corEquipe(equipeDe.get(l.pilotoId)!) }} />
                <span className="sigla" title={nome(l.pilotoId)}>
                  {siglas.get(l.pilotoId)}
                </span>
                <span className="dif">{proximo?.noBox && !l.fora && !l.terminou ? 'BOX' : l.diferenca}</span>
                <span className="pneu" style={{ color: pneu.cor }} title={`${pneu.nome}, ${estado.idadePneu} voltas`}>
                  {pneu.sigla}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      {terminou && <Resultado corrida={corrida} nome={nome} equipes={equipes} />}
    </>
  );
}

function Resultado({ corrida, nome, equipes }: { corrida: Corrida; nome: (id: string) => string; equipes: Map<string, Equipe> }) {
  const vencedor = corrida.resultado[0]!;
  const rapida = corrida.voltaMaisRapida;
  return (
    <section className="resultado">
      <h2>Resultado</h2>
      <table>
        <thead>
          <tr>
            <th>Pos</th>
            <th>Piloto</th>
            <th>Equipe</th>
            <th>Largou</th>
            <th>Tempo</th>
            <th>Paradas</th>
            <th>Pontos</th>
          </tr>
        </thead>
        <tbody>
          {corrida.resultado.map((r) => {
            let tempo: string;
            if (r.status === 'abandonou') tempo = `Abandonou (${r.motivo?.toLowerCase()}, volta ${r.voltas + 1})`;
            else if (r === vencedor) tempo = formatarTempo(r.tempoTotal);
            else if (r.voltas < vencedor.voltas) tempo = `+${vencedor.voltas - r.voltas} ${vencedor.voltas - r.voltas === 1 ? 'volta' : 'voltas'}`;
            else tempo = `+${(r.tempoTotal - vencedor.tempoTotal).toFixed(3)}`;
            if (r.punicao > 0 && r.status === 'chegou') tempo += ` (inclui ${r.punicao}s de punição)`;
            return (
              <tr key={r.pilotoId}>
                <td>{r.status === 'chegou' ? r.posicao : '—'}</td>
                <td>{nome(r.pilotoId)}</td>
                <td>
                  <span className="faixa" style={{ background: corEquipe(r.equipeId) }} /> {equipes.get(r.equipeId)?.nome}
                </td>
                <td>{r.largada}</td>
                <td>{tempo}</td>
                <td>{r.paradas}</td>
                <td>{r.pontos || ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rapida && (
        <p>
          Volta mais rápida: {nome(rapida.pilotoId)}, {formatarTempo(rapida.tempo)} na volta {rapida.volta}. Pole: {nome(corrida.grid[0]!.pilotoId)},{' '}
          {formatarTempo(corrida.grid[0]!.tempo)}.
        </p>
      )}
    </section>
  );
}

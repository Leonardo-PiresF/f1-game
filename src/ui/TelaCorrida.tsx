import { useEffect, useMemo, useRef, useState } from 'react';
import temporada from '../data/temporada-2026.json';
import { montarGrid, simularCorrida, sobrenome, type Clima, type Corrida, type PilotoNaCorrida } from '../engine/corrida';
import { COMPOSTOS_SECOS, melhoresEstrategias, type Composto } from '../engine/pneus';
import { buscarPista, PISTAS } from '../engine/pistas';
import type { Categoria, Equipe } from '../engine/types';
import { corEquipe, PNEUS } from './cores';
import { MapaPista } from './MapaPista';
import { duracao, formatarTempo, montarLinhasDoTempo, torreNoTempo } from './relogio';

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
}

// Cada largada sorteia uma semente nova de 32 bits, para as corridas não se repetirem.
// O motor continua determinístico por semente, o que permite testes e saves.
const novaSemente = () => crypto.getRandomValues(new Uint32Array(1))[0]!;

export function TelaCorrida() {
  const [config, setConfig] = useState<Config>({ categoria: 'F1', pistaId: 'interlagos', clima: 'sorteado' });
  const [corrida, setCorrida] = useState<Corrida | null>(null);
  const [largou, setLargou] = useState(false);

  const classificar = () => {
    setLargou(false);
    const pilotos = montarGrid(PILOTOS, config.categoria);
    setCorrida(
      simularCorrida({
        pista: buscarPista(config.pistaId),
        categoria: config.categoria,
        pilotos,
        equipes: EQUIPES,
        semente: novaSemente(),
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
          classificar();
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
        <button type="submit" className="largar">
          Novo fim de semana
        </button>
      </form>
      {!corrida && <p className="dica">Escolha a pista e comece o fim de semana. Cada fim de semana é diferente: pneus, classificação e corrida.</p>}
      {corrida && !largou && <FimDeSemana key={corrida.semente} corrida={corrida} onLargar={() => setLargou(true)} />}
      {corrida && largou && <Transmissao key={corrida.semente} corrida={corrida} />}
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

  const linhasDoTempo = useMemo(() => montarLinhasDoTempo(corrida, pista), [corrida, pista]);
  const [modoTorre, setModoTorre] = useState<'intervalo' | 'lider'>('intervalo');
  const linhas = torreNoTempo(corrida, pista, linhasDoTempo, tempo);
  const lider = linhas[0]!;
  const voltaAtual = Math.min(corrida.voltas, Math.floor(Math.max(0, lider.distancia)) + 1);
  const terminou = tempo >= fim;
  const neutralizacao = lider.terminou || tempo <= 0 ? undefined : corrida.neutralizacoes.find((n) => voltaAtual >= n.de && voltaAtual <= n.ate);
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
            {neutralizacao?.tipo === 'SC' && <span className="sc">SAFETY CAR</span>}
            {neutralizacao?.tipo === 'VSC' && <span className="sc vsc">VIRTUAL SAFETY CAR</span>}
            {lider.terminou && <span className="bandeira">🏁 Bandeirada</span>}
          </header>
          <MapaPista pista={pista} linhas={linhas} siglas={siglas} equipeDe={equipeDe} segundoPiloto={segundoPiloto} mostrarNomes={mostrarNomes}
            safetyCar={neutralizacao?.tipo === 'SC' ? lider.distancia + 0.025 : null}
          />
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
        <div className="torre">
          <div className="torre-modo">
            <button type="button" className={modoTorre === 'intervalo' ? 'ativo' : ''} onClick={() => setModoTorre('intervalo')}>
              Intervalo
            </button>
            <button type="button" className={modoTorre === 'lider' ? 'ativo' : ''} onClick={() => setModoTorre('lider')}>
              Líder
            </button>
          </div>
          <ol>
          {linhas.map((l) => {
            const estado = estadoDaVolta(l.pilotoId, l.voltas);
            const pneu = PNEUS[estado.pneu];
            return (
              <li key={l.pilotoId} className={l.fora ? 'fora' : ''}>
                <span className="pos">{l.posicao}</span>
                <span className="faixa" style={{ background: corEquipe(equipeDe.get(l.pilotoId)!) }} />
                <span className="sigla" title={nome(l.pilotoId)}>
                  {siglas.get(l.pilotoId)}
                </span>
                <span className="dif">{l.noBox ? 'BOX' : modoTorre === 'intervalo' ? l.intervalo : l.paraLider}</span>
                <span className="pneu" style={{ color: pneu.cor }} title={`${pneu.nome}, ${estado.idadePneu} voltas`}>
                  {pneu.sigla}
                </span>
              </li>
            );
          })}
          </ol>
        </div>
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
            <th>Pneus</th>
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
                <td>
                  <SequenciaPneus pneus={r.pneus} />
                </td>
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

function SequenciaPneus({ pneus }: { pneus: Composto[] }) {
  return (
    <span className="sequencia-pneus">
      {pneus.map((p, i) => (
        <span key={i} style={{ color: PNEUS[p].cor }} title={PNEUS[p].nome}>
          {PNEUS[p].sigla}
        </span>
      ))}
    </span>
  );
}

const tempoQuali = (t: number | null) => (t === null ? '' : formatarTempo(t));

function FimDeSemana({ corrida, onLargar }: { corrida: Corrida; onLargar: () => void }) {
  const pista = buscarPista(corrida.pistaId);
  const pilotos = useMemo(() => new Map(PILOTOS.map((p) => [p.id, p])), []);
  const equipes = useMemo(() => new Map(EQUIPES.map((e) => [e.id, e])), []);
  const equipeDe = useMemo(() => new Map(corrida.resultado.map((r) => [r.pilotoId, r.equipeId])), [corrida]);
  const molhado = corrida.clima === 'molhado';
  const compostos: Composto[] = molhado ? ['chuva'] : COMPOSTOS_SECOS;
  const referencia = Math.min(...compostos.map((k) => corrida.pneus[k].ritmo));
  const prevista = molhado ? null : melhoresEstrategias(corrida.pneus, corrida.voltas, pista.perdaBox, 1)[0];
  const f1 = corrida.categoria === 'F1';

  return (
    <div className="fim-de-semana">
      <section className="painel">
        <header className="placar">
          <strong>{pista.nome}</strong>
          <span>{corrida.voltas} voltas</span>
          <span>{molhado ? '🌧️ Molhado' : '☀️ Seco'}</span>
          <button type="button" className="largar" onClick={onLargar}>
            Largar
          </button>
        </header>
        <h2>Pneus deste fim de semana</h2>
        <table className="tabela">
          <thead>
            <tr>
              <th>Composto</th>
              <th>Ritmo</th>
              <th>Desgaste</th>
              <th>Vida</th>
              <th>Nos treinos</th>
            </tr>
          </thead>
          <tbody>
            {compostos.map((k) => {
              const p = corrida.pneus[k];
              const dif = p.ritmo - referencia;
              return (
                <tr key={k}>
                  <td style={{ color: PNEUS[k].cor, fontWeight: 700 }}>{PNEUS[k].nome}</td>
                  <td>{dif < 0.005 ? 'o mais rápido' : `+${dif.toFixed(2)}s/volta`}</td>
                  <td>{p.desgaste.toFixed(3)}s/volta</td>
                  <td>~{Math.round(p.vida)} voltas</td>
                  <td>{p.nota ?? ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {prevista && (
          <p className="dica">
            Estratégia mais rápida no papel: <SequenciaPneus pneus={prevista.compostos} />, parando na{prevista.paradas.length > 1 ? 's voltas' : ' volta'}{' '}
            {prevista.paradas.join(' e ')}.
          </p>
        )}
      </section>
      <section className="painel">
        <h2>Classificação</h2>
        <table className="tabela">
          <thead>
            <tr>
              <th>Pos</th>
              <th>Piloto</th>
              <th>Equipe</th>
              <th>{f1 ? 'Q1' : 'Tempo'}</th>
              {f1 && <th>Q2</th>}
              {f1 && <th>Q3</th>}
            </tr>
          </thead>
          <tbody>
            {corrida.classificacao.map((l) => {
              const eq = equipeDe.get(l.pilotoId)!;
              const corte = f1 && (l.posicao === 11 || l.ultimaSessao === 'Q1') && corrida.classificacao[l.posicao - 2]?.ultimaSessao !== l.ultimaSessao;
              return (
                <tr key={l.pilotoId} className={corte ? 'corte' : ''}>
                  <td>{l.posicao}</td>
                  <td>{pilotos.get(l.pilotoId)!.nome}</td>
                  <td>
                    <span className="faixa" style={{ background: corEquipe(eq) }} /> {equipes.get(eq)?.nome}
                  </td>
                  <td>{tempoQuali(l.q1)}</td>
                  {f1 && <td>{tempoQuali(l.q2)}</td>}
                  {f1 && <td>{tempoQuali(l.q3)}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

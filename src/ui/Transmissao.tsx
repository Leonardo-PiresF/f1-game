import { useMemo, useState } from 'react';
import type { Corrida } from '../engine/corrida';
import { estaMolhado } from '../engine/clima';
import type { Composto } from '../engine/pneus';
import { buscarPista } from '../engine/pistas';
import { corEquipe, PNEUS } from './cores';
import { nomeEquipe, nomePiloto, segundosPilotos, siglaPiloto } from './dados';
import { MapaPista } from './MapaPista';
import { duracao, formatarTempo, montarLinhasDoTempo, torreNoTempo } from './relogio';
import { useReproducao, VELOCIDADES } from './reproducao';

export function Controles({ rep, nomes, setNomes }: { rep: ReturnType<typeof useReproducao>; nomes: boolean; setNomes: (v: boolean) => void }) {
  return (
    <div className="controles">
      <button type="button" onClick={rep.alternar}>
        {rep.terminou ? '↺ Rever' : rep.tocando ? '⏸ Pausar' : '▶ Continuar'}
      </button>
      {VELOCIDADES.map((v) => (
        <button key={v} type="button" className={v === rep.velocidade ? 'ativo' : ''} onClick={() => rep.setVelocidade(v)}>
          {v}×
        </button>
      ))}
      <button type="button" onClick={rep.pularParaOFim}>
        ⏭ Fim
      </button>
      <label className="nomes">
        <input type="checkbox" checked={nomes} onChange={(e) => setNomes(e.target.checked)} /> Nomes
      </label>
    </div>
  );
}

export function textoAgua(agua: number): string {
  if (agua < 0.05) return '☀️ Seco';
  if (!estaMolhado(agua)) return '🌦️ Úmido';
  return agua < 0.76 ? '🌧️ Molhado' : '⛈️ Muita água';
}

export function Transmissao({ corrida, titulo }: { corrida: Corrida; titulo: string }) {
  const pista = buscarPista(corrida.pistaId);
  const fim = useMemo(() => duracao(corrida), [corrida]);
  const rep = useReproducao(fim);
  const [nomes, setNomes] = useState(true);
  const [modoTorre, setModoTorre] = useState<'intervalo' | 'lider'>('intervalo');
  const linhasDoTempo = useMemo(() => montarLinhasDoTempo(corrida, pista), [corrida, pista]);
  const equipeDe = useMemo(() => new Map(corrida.resultado.map((r) => [r.pilotoId, r.equipeId])), [corrida]);
  const siglas = useMemo(() => new Map(corrida.resultado.map((r) => [r.pilotoId, siglaPiloto(r.pilotoId)])), [corrida]);
  const segundoPiloto = useMemo(() => segundosPilotos(corrida.grid.map((g) => g.pilotoId)), [corrida]);

  const { tempo, terminou } = rep;
  const linhas = torreNoTempo(corrida, linhasDoTempo, tempo);
  const lider = linhas[0]!;
  const voltaAtual = Math.min(corrida.voltas, Math.floor(Math.max(0, lider.distancia)) + 1);
  const neutralizacao = lider.terminou || tempo <= 0 ? undefined : corrida.neutralizacoes.find((n) => voltaAtual >= n.de && voltaAtual <= n.ate);
  const agua = corrida.agua[Math.min(voltaAtual, corrida.agua.length - 1)] ?? 0;
  const estadoDaVolta = (pilotoId: string, voltas: number) => corrida.estados[Math.min(voltas, corrida.estados.length - 1)]!.find((e) => e.pilotoId === pilotoId)!;
  const eventos = corrida.eventos.filter((e) => e.tipo !== 'box' && e.volta <= Math.max(1, lider.voltas)).slice(-8).reverse();

  return (
    <>
      <div className="transmissao">
        <section className="pista">
          <header className="placar">
            <strong>{titulo}</strong>
            <span>
              Volta {voltaAtual}/{corrida.voltasPrevistas}
            </span>
            <span title={`Água na pista: ${Math.round(agua * 100)}%`}>{textoAgua(agua)}</span>
            {neutralizacao?.tipo === 'SC' && <span className="sc">SAFETY CAR</span>}
            {neutralizacao?.tipo === 'VSC' && <span className="sc vsc">VIRTUAL SAFETY CAR</span>}
            {neutralizacao?.tipo === 'VERMELHA' && <span className="sc vermelha">BANDEIRA VERMELHA</span>}
            {lider.terminou && <span className="bandeira">🏁 Bandeirada</span>}
          </header>
          <MapaPista
            pista={pista}
            linhas={linhas}
            siglas={siglas}
            equipeDe={equipeDe}
            segundoPiloto={segundoPiloto}
            mostrarNomes={nomes}
            safetyCar={neutralizacao?.tipo === 'SC' ? lider.distancia + 0.025 : null}
          />
          <Controles rep={rep} nomes={nomes} setNomes={setNomes} />
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
                  <span className="sigla" title={nomePiloto(l.pilotoId)}>
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
      {terminou && <Resultado corrida={corrida} />}
    </>
  );
}

export function SequenciaPneus({ pneus }: { pneus: Composto[] }) {
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

export function Resultado({ corrida }: { corrida: Corrida }) {
  const vencedor = corrida.resultado[0]!;
  const rapida = corrida.voltaMaisRapida;
  const encerrada = corrida.voltas < corrida.voltasPrevistas;
  return (
    <section className="resultado">
      <h2>Resultado{corrida.tipo === 'sprint' ? ' da sprint' : ''}</h2>
      {encerrada && (
        <p className="dica">
          Corrida encerrada na volta {corrida.voltas} de {corrida.voltasPrevistas} pela bandeira vermelha.
          {corrida.voltas / corrida.voltasPrevistas < 0.75 ? ' Pontuação reduzida.' : ''}
        </p>
      )}
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
                <td>{nomePiloto(r.pilotoId)}</td>
                <td>
                  <span className="faixa" style={{ background: corEquipe(r.equipeId) }} /> {nomeEquipe(r.equipeId)}
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
          Volta mais rápida: {nomePiloto(rapida.pilotoId)}, {formatarTempo(rapida.tempo)} na volta {rapida.volta}.
        </p>
      )}
    </section>
  );
}

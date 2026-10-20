import { useMemo, useState } from 'react';
import type { Corrida } from '../engine/corrida';
import { estaMolhado } from '../engine/clima';
import type { Composto } from '../engine/pneus';
import { buscarPista } from '../engine/pistas';
import { corEquipe, PNEUS } from './cores';
import { nomeEquipe, nomePiloto, PILOTO, segundosPilotos, siglaPiloto } from './dados';
import { MapaPista } from './MapaPista';
import { CorpoPiloto, Retrato, temSprite } from './Pixel';
import { duracao, formatarTempo, montarLinhasDoTempo, torreNoTempo } from './relogio';
import { useReproducao, VELOCIDADES } from './reproducao';

export interface Camera {
  foco: string | null;
  zoom: boolean;
}

export function useCamera() {
  const [camera, setCamera] = useState<Camera>({ foco: null, zoom: false });
  return {
    ...camera,
    seguir: (id: string) =>
      setCamera((c) => ({
        foco: c.foco === id ? null : id,
        zoom: c.foco === id ? false : c.zoom,
      })),
    alternarZoom: (padrao: string) => setCamera((c) => ({ foco: c.foco ?? padrao, zoom: !c.zoom })),
  };
}

export function Controles({
  rep,
  nomes,
  setNomes,
  zoom,
  onZoom,
}: {
  rep: ReturnType<typeof useReproducao>;
  nomes: boolean;
  setNomes: (v: boolean) => void;
  zoom?: boolean;
  onZoom?: () => void;
}) {
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
      {onZoom && (
        <button type="button" className={zoom ? 'ativo' : ''} onClick={onZoom} title="Aproxima a câmera no piloto escolhido (clique num carro ou na torre)">
          🔍 Câmera
        </button>
      )}
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
  const camera = useCamera();
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
  const estadoDaVolta = (pilotoId: string, voltas: number) =>
    corrida.estados[Math.min(voltas, corrida.estados.length - 1)]!.find((e) => e.pilotoId === pilotoId)!;
  const eventos = corrida.eventos
    .filter((e) => e.tipo !== 'box' && e.volta <= Math.max(1, lider.voltas))
    .slice(-8)
    .reverse();

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
            foco={camera.foco}
            zoom={camera.zoom}
            onEscolher={camera.seguir}
          />
          <Controles rep={rep} nomes={nomes} setNomes={setNomes} zoom={camera.zoom} onZoom={() => camera.alternarZoom(lider.pilotoId)} />
          {camera.foco && (
            <PilotoSeguido
              pilotoId={camera.foco}
              linhas={linhas}
              equipeDe={equipeDe}
              detalhe={(l) => {
                const e = estadoDaVolta(l.pilotoId, l.voltas);
                return `${l.noBox ? 'nos boxes' : l.posicao === 1 ? 'líder' : `${l.paraLider} do líder`} · ${PNEUS[e.pneu].nome.toLowerCase()} com ${e.idadePneu} ${e.idadePneu === 1 ? 'volta' : 'voltas'}`;
              }}
            />
          )}
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
                <li
                  key={l.pilotoId}
                  className={`${l.fora ? 'fora' : ''} ${l.pilotoId === camera.foco ? 'seguido' : ''}`}
                  onClick={() => camera.seguir(l.pilotoId)}
                >
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

// Cartão do piloto que a câmera segue, embaixo do mapa.
export function PilotoSeguido<L extends { pilotoId: string; posicao: number }>({
  pilotoId,
  linhas,
  equipeDe,
  detalhe,
}: {
  pilotoId: string;
  linhas: L[];
  equipeDe: Map<string, string>;
  detalhe: (l: L) => string;
}) {
  const l = linhas.find((x) => x.pilotoId === pilotoId);
  if (!l) return null;
  const eq = equipeDe.get(pilotoId) ?? '';
  return (
    <div className="seguindo" style={{ borderColor: corEquipe(eq) }}>
      <Retrato pilotoId={pilotoId} tamanho={54} />
      <div>
        <strong>
          P{l.posicao} · {nomePiloto(pilotoId)}
        </strong>
        <span>
          {nomeEquipe(eq)} · {detalhe(l)}
        </span>
      </div>
    </div>
  );
}

export function Podio({ ids, titulo }: { ids: string[]; titulo?: string }) {
  const ordem = [ids[1], ids[0], ids[2]];
  return (
    <div className="podio" aria-label={titulo ?? 'Pódio'}>
      {ordem.map((id, i) =>
        id ? (
          <div key={id} className={`degrau degrau-${[2, 1, 3][i]}`}>
            {temSprite(id) ? (
              <CorpoPiloto pilotoId={id} direcao={(['south-east', 'south', 'south-west'] as const)[i]} tamanho={i === 1 ? 144 : 120} />
            ) : (
              <Retrato pilotoId={id} tamanho={i === 1 ? 84 : 66} />
            )}
            <span className="nome">{nomePiloto(id)}</span>
            <span className="caixa" style={{ background: corEquipe(PILOTO.get(id)?.equipeId ?? '') }}>
              {[2, 1, 3][i]}
            </span>
          </div>
        ) : null,
      )}
    </div>
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
      <Podio
        ids={corrida.resultado
          .filter((r) => r.status === 'chegou')
          .slice(0, 3)
          .map((r) => r.pilotoId)}
      />
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
                <td>
                  <span className="com-retrato">
                    <Retrato pilotoId={r.pilotoId} /> {nomePiloto(r.pilotoId)}
                  </span>
                </td>
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

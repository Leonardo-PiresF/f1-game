import { useMemo, useState } from 'react';
import type { Classificacao, LinhaClassificacao, SessaoQuali } from '../engine/classificacao';
import type { Pista } from '../engine/types';
import { corEquipe, PNEUS } from './cores';
import { nomeEquipe, nomePiloto, PILOTO, segundosPilotos, siglaPiloto } from './dados';
import { MapaPista } from './MapaPista';
import { formatarTempo } from './relogio';
import { montarLinhasDaQuali, relogioDaSessao, torreDaQuali, type EstadoNaQuali } from './relogioQuali';
import { useReproducao } from './reproducao';
import { Retrato } from './Pixel';
import { Controles, PilotoSeguido, textoAgua, useCamera } from './Transmissao';

const ROTULO: Record<EstadoNaQuali, string> = {
  garagem: '',
  saida: 'saída',
  lancada: '',
  entrada: 'entrada',
  batida: 'BATEU',
};

const relogio = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function Sessao({ sessao, pista, titulo, ultima, onFim }: { sessao: SessaoQuali; pista: Pista; titulo: string; ultima: boolean; onFim: () => void }) {
  const rep = useReproducao(sessao.fim, 30);
  const [nomes, setNomes] = useState(true);
  const camera = useCamera();
  const equipeDe = useMemo(() => new Map(sessao.participantes.map((id) => [id, PILOTO.get(id)?.equipeId ?? ''])), [sessao]);
  const linhas = useMemo(() => montarLinhasDaQuali(sessao, pista, equipeDe), [sessao, pista, equipeDe]);
  const siglas = useMemo(() => new Map(sessao.participantes.map((id) => [id, siglaPiloto(id)])), [sessao]);
  const segundoPiloto = useMemo(() => segundosPilotos(sessao.participantes), [sessao]);
  const torre = torreDaQuali(sessao, linhas, rep.tempo);
  const { restante, vermelha } = relogioDaSessao(sessao, rep.tempo);
  const lider = torre[0]?.melhor ?? null;
  const composto = sessao.tentativas[0]?.composto ?? 'macio';

  return (
    <div className="transmissao">
      <section className="pista">
        <header className="placar">
          <strong>
            {titulo} · {sessao.nome}
          </strong>
          <span className="relogio">{relogio(restante)}</span>
          <span>{textoAgua(sessao.agua)}</span>
          <span style={{ color: PNEUS[composto].cor }}>Pneu {PNEUS[composto].nome.toLowerCase()}</span>
          {vermelha && <span className="sc vermelha">BANDEIRA VERMELHA</span>}
          {rep.terminou && <span className="bandeira">🏁 Fim da sessão</span>}
        </header>
        <MapaPista
          pista={pista}
          linhas={torre.map((l) => ({ ...l, apagado: l.estado === 'garagem' }))}
          siglas={siglas}
          equipeDe={equipeDe}
          segundoPiloto={segundoPiloto}
          mostrarNomes={nomes}
          safetyCar={null}
          foco={camera.foco}
          zoom={camera.zoom}
          onEscolher={camera.seguir}
        />
        <Controles rep={rep} nomes={nomes} setNomes={setNomes} zoom={camera.zoom} onZoom={() => camera.alternarZoom(torre[0]!.pilotoId)} />
        {camera.foco && (
          <PilotoSeguido
            pilotoId={camera.foco}
            linhas={torre}
            equipeDe={equipeDe}
            detalhe={(l) => {
              const rotulo = { garagem: 'na garagem', saida: 'volta de saída', lancada: 'volta lançada', entrada: 'volta de entrada', batida: 'bateu' }[l.estado];
              return `${rotulo}${l.melhor !== null ? ` · melhor ${formatarTempo(l.melhor)}` : ''}`;
            }}
          />
        )}
        {rep.terminou && (
          <button type="button" className="largar proxima" onClick={onFim}>
            {ultima ? 'Ver o grid de largada' : 'Próxima sessão'}
          </button>
        )}
      </section>
      <div className="torre torre-quali">
        <ol>
          {torre.map((l, i) => {
            const cortado = sessao.passam < sessao.participantes.length && i === sessao.passam;
            const tempo = l.emVolta !== null ? formatarTempo(l.emVolta).slice(0, -2) : l.melhor !== null ? (i === 0 ? formatarTempo(l.melhor) : `+${(l.melhor - lider!).toFixed(3)}`) : '';
            return (
              <li
                key={l.pilotoId}
                className={`${l.fora ? 'fora' : ''} ${cortado ? 'corte' : ''} ${i >= sessao.passam ? 'zona-eliminacao' : ''} ${l.pilotoId === camera.foco ? 'seguido' : ''}`}
                onClick={() => camera.seguir(l.pilotoId)}
              >
                <span className="pos">{l.posicao}</span>
                <span className="faixa" style={{ background: corEquipe(equipeDe.get(l.pilotoId)!) }} />
                <span className="sigla" title={nomePiloto(l.pilotoId)}>
                  {siglas.get(l.pilotoId)}
                </span>
                <span className={`dif ${l.emVolta !== null ? 'em-volta' : ''}`}>{tempo}</span>
                <span className="estado">{ROTULO[l.estado]}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

export function TransmissaoQuali({ classificacao, pista, titulo, onFim }: { classificacao: Classificacao; pista: Pista; titulo: string; onFim?: () => void }) {
  const [indice, setIndice] = useState(0);
  const total = classificacao.sessoes.length;
  if (indice >= total) {
    return (
      <>
        <TabelaGrid classificacao={classificacao} grid={classificacao.grid} titulo={`${titulo}: resultado`} />
        <div className="controles">
          <button type="button" onClick={() => setIndice(0)}>
            ↺ Rever a sessão
          </button>
          {onFim && (
            <button type="button" className="largar" onClick={onFim}>
              Seguir
            </button>
          )}
        </div>
      </>
    );
  }
  return (
    <>
      <div className="controles abas-sessao">
        {classificacao.sessoes.map((s, i) => (
          <button key={s.nome} type="button" className={i === indice ? 'ativo' : ''} onClick={() => setIndice(i)}>
            {s.nome}
          </button>
        ))}
        <button type="button" onClick={() => setIndice(total)}>
          Pular para o resultado
        </button>
      </div>
      <Sessao key={indice} sessao={classificacao.sessoes[indice]!} pista={pista} titulo={titulo} ultima={indice === total - 1} onFim={() => setIndice(indice + 1)} />
    </>
  );
}

const tempoQuali = (t: number | null) => (t === null ? '' : formatarTempo(t));

export function TabelaGrid({ classificacao, grid, titulo }: { classificacao: Classificacao; grid: LinhaClassificacao[]; titulo: string }) {
  const nomes = classificacao.sessoes.map((s) => s.nome);
  const varias = nomes.length > 1;
  return (
    <section className="painel">
      <h2>{titulo}</h2>
      <table className="tabela">
        <thead>
          <tr>
            <th>Pos</th>
            <th>Piloto</th>
            <th>Equipe</th>
            {nomes.map((n) => (
              <th key={n}>{varias ? n : 'Tempo'}</th>
            ))}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {grid.map((l, i) => {
            const eq = PILOTO.get(l.pilotoId)?.equipeId ?? '';
            const anterior = grid[i - 1];
            const corte = varias && anterior && anterior.ultimaSessao !== l.ultimaSessao && !l.punicaoGrid && !anterior.punicaoGrid;
            const notas = [l.punicaoGrid ? `perde ${l.punicaoGrid} posições (motor)` : '', l.fora107 ? 'fora dos 107%, larga com autorização dos comissários' : '']
              .filter(Boolean)
              .join('; ');
            return (
              <tr key={l.pilotoId} className={corte ? 'corte' : ''}>
                <td>{l.posicao}</td>
                <td>
                  <span className="com-retrato">
                    <Retrato pilotoId={l.pilotoId} /> {nomePiloto(l.pilotoId)}
                  </span>
                </td>
                <td>
                  <span className="faixa" style={{ background: corEquipe(eq) }} /> {nomeEquipe(eq)}
                </td>
                {[l.q1, l.q2, l.q3].slice(0, nomes.length).map((t, k) => (
                  <td key={k}>{tempoQuali(t)}</td>
                ))}
                <td className="nota">{notas}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

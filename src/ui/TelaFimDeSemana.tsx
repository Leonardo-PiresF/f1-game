import { useState } from 'react';
import { aguaNaVolta } from '../engine/clima';
import type { TrocaDeMotor } from '../engine/campeonato';
import type { Corrida } from '../engine/corrida';
import { NOME_SESSAO, type FimDeSemana, type SessaoId } from '../engine/fimDeSemana';
import type { LinhaClassificacao } from '../engine/classificacao';
import { COMPOSTOS_SECOS, type Composto, type PneusDoFimDeSemana } from '../engine/pneus';
import { buscarPista } from '../engine/pistas';
import type { SessaoTreino } from '../engine/treinos';
import type { Categoria } from '../engine/types';
import { corEquipe, PNEUS } from './cores';
import { EQUIPE, nomeEquipe, nomePiloto, PILOTO } from './dados';
import { formatarTempo } from './relogio';
import { textoAgua, Transmissao } from './Transmissao';
import { TabelaGrid, TransmissaoQuali } from './TransmissaoQuali';

interface Props {
  fins: { F1: FimDeSemana; F2?: FimDeSemana };
  titulo: string;
  trocas?: TrocaDeMotor[];
  onConcluir?: () => void;
}

const nomeDaSessao = (f: FimDeSemana, id: SessaoId) => (f.categoria === 'F2' && id === 'TL1' ? 'Treino Livre' : f.categoria === 'F2' && id === 'CORRIDA' ? 'Corrida principal' : NOME_SESSAO[id]);

export function TelaFimDeSemana({ fins, titulo, trocas, onConcluir }: Props) {
  const [categoria, setCategoria] = useState<Categoria>('F1');
  const [progresso, setProgresso] = useState<Record<Categoria, number>>({ F1: 0, F2: 0 });
  const [aba, setAba] = useState<Record<Categoria, number>>({ F1: 0, F2: 0 });
  const f = fins[categoria] ?? fins.F1;
  const pista = buscarPista(f.pistaId);
  const atual = aba[categoria];
  const sessao = f.sessoes[atual]!;
  const avancar = () => {
    const proxima = Math.min(f.sessoes.length - 1, atual + 1);
    setProgresso({ ...progresso, [categoria]: Math.max(progresso[categoria], proxima) });
    setAba({ ...aba, [categoria]: proxima });
  };
  const ir = (i: number) => {
    setProgresso({ ...progresso, [categoria]: Math.max(progresso[categoria], i) });
    setAba({ ...aba, [categoria]: i });
  };
  const ultimoTreino = f.sessoes.filter((s) => s.startsWith('TL')).at(-1);

  return (
    <div className="fim-de-semana">
      <header className="placar">
        <strong>{titulo}</strong>
        {f.sprint && f.categoria === 'F1' && <span className="selo">Sprint</span>}
        {fins.F2 && (
          <span className="abas">
            {(['F1', 'F2'] as const).map((c) => (
              <button key={c} type="button" className={c === categoria ? 'ativo' : ''} onClick={() => setCategoria(c)}>
                {c}
              </button>
            ))}
          </span>
        )}
      </header>
      <nav className="abas">
        {f.sessoes.map((s, i) => {
          const cond = f.clima[s];
          return (
            <button key={s} type="button" className={i === atual ? 'ativo' : i <= progresso[categoria] ? 'feita' : ''} onClick={() => ir(i)}>
              {nomeDaSessao(f, s)} {cond ? textoAgua(aguaNaVolta(cond, 0)).split(' ')[0] : ''}
            </button>
          );
        })}
      </nav>

      {sessao.startsWith('TL') && (
        <>
          <TabelaTreino treino={f.treinos[f.sessoes.filter((s) => s.startsWith('TL')).indexOf(sessao)]!} />
          {sessao === ultimoTreino && <LeituraPneus f={f} />}
          <button type="button" className="largar" onClick={avancar}>
            Próxima sessão
          </button>
        </>
      )}
      {sessao === 'SQ' && f.sprintQuali && <TransmissaoQuali key={`${categoria}-SQ`} classificacao={f.sprintQuali} pista={pista} titulo={pista.nome} onFim={avancar} />}
      {sessao === 'Q' && (
        <>
          <TransmissaoQuali key={`${categoria}-Q`} classificacao={f.quali} pista={pista} titulo={pista.nome} onFim={avancar} />
          {categoria === 'F1' && trocas && trocas.length > 0 && <TrocasDeMotor trocas={trocas} />}
        </>
      )}
      {sessao === 'SPRINT' && f.sprintCorrida && f.gridSprint && (
        <Largada key={`${categoria}-S`} corrida={f.sprintCorrida} grid={f.gridSprint} f={f} titulo={`${pista.nome} · Sprint`} onFim={avancar} />
      )}
      {sessao === 'CORRIDA' && (
        <>
          <Largada key={`${categoria}-C`} corrida={f.corrida} grid={f.gridCorrida} f={f} titulo={`${pista.nome} · ${nomeDaSessao(f, 'CORRIDA')}`} />
          {onConcluir && (
            <button type="button" className="largar concluir" onClick={onConcluir}>
              Concluir etapa e voltar ao campeonato
            </button>
          )}
        </>
      )}
    </div>
  );
}

function Largada({ corrida, grid, f, titulo, onFim }: { corrida: Corrida; grid: LinhaClassificacao[]; f: FimDeSemana; titulo: string; onFim?: () => void }) {
  const [largou, setLargou] = useState(false);
  if (largou) {
    return (
      <>
        <Transmissao corrida={corrida} titulo={titulo} />
        {onFim && (
          <button type="button" className="largar" onClick={onFim}>
            Próxima sessão
          </button>
        )}
      </>
    );
  }
  return (
    <>
      <div className="controles">
        <button type="button" className="largar" onClick={() => setLargou(true)}>
          Largar
        </button>
        <span className="dica">
          {corrida.voltasPrevistas} voltas · {textoAgua(corrida.agua[0] ?? 0)}
          {corrida.tipo === 'sprint' ? ' · sem parada obrigatória' : ' · obrigatório usar dois compostos no seco'}
        </span>
      </div>
      <TabelaGrid classificacao={corrida.tipo === 'sprint' && f.sprintQuali ? f.sprintQuali : f.quali} grid={grid} titulo="Grid de largada" />
      {corrida.tipo === 'principal' && <JogosNovos f={f} grid={grid} />}
    </>
  );
}

function TabelaTreino({ treino }: { treino: SessaoTreino }) {
  const melhor = treino.linhas[0]?.melhorVolta ?? null;
  return (
    <section className="painel">
      <h2>
        {treino.nome} · {textoAgua(treino.agua)}
      </h2>
      <table className="tabela">
        <thead>
          <tr>
            <th>Pos</th>
            <th>Piloto</th>
            <th>Equipe</th>
            <th>Melhor volta</th>
            <th>Diferença</th>
            <th>Voltas</th>
            <th>Pneu</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {treino.linhas.map((l, i) => {
            const eq = PILOTO.get(l.pilotoId)?.equipeId ?? '';
            return (
              <tr key={l.pilotoId}>
                <td>{i + 1}</td>
                <td>{nomePiloto(l.pilotoId)}</td>
                <td>
                  <span className="faixa" style={{ background: corEquipe(eq) }} /> {nomeEquipe(eq)}
                </td>
                <td>{l.melhorVolta !== null ? formatarTempo(l.melhorVolta) : 'sem tempo'}</td>
                <td>{l.melhorVolta !== null && melhor !== null && i > 0 ? `+${(l.melhorVolta - melhor).toFixed(3)}` : ''}</td>
                <td>{l.voltas}</td>
                <td style={{ color: PNEUS[l.composto].cor, fontWeight: 700 }}>{PNEUS[l.composto].sigla}</td>
                <td className="nota">{l.problema ?? ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="dica">Cada equipe roda com um programa diferente (combustível e pneu), então a tabela do treino engana. O que vale é o que as equipes aprendem.</p>
    </section>
  );
}

function LeituraPneus({ f }: { f: FimDeSemana }) {
  const compostos: Composto[] = [...COMPOSTOS_SECOS, 'intermediario', 'chuva'];
  const lp: PneusDoFimDeSemana = f.leitura;
  const referencia = Math.min(...COMPOSTOS_SECOS.map((k) => lp[k].ritmo));
  const equipes = Object.entries(f.conhecimento).sort((a, b) => b[1] - a[1]);
  return (
    <section className="painel">
      <h2>O que as equipes descobriram nos treinos</h2>
      <p className="dica">É uma leitura média do paddock, com erro. Quem rodou menos (chuva, problemas, fim de semana sprint) sabe menos, e pode errar a estratégia.</p>
      <table className="tabela">
        <thead>
          <tr>
            <th>Composto</th>
            <th>Ritmo</th>
            <th>Desgaste</th>
            <th>Vida</th>
            <th>Observação</th>
          </tr>
        </thead>
        <tbody>
          {compostos.map((k) => {
            const p = lp[k];
            const dif = p.ritmo - referencia;
            const seco = COMPOSTOS_SECOS.includes(k as never);
            return (
              <tr key={k}>
                <td style={{ color: PNEUS[k].cor, fontWeight: 700 }}>{PNEUS[k].nome}</td>
                <td>{!seco ? 'para pista molhada' : dif < 0.005 ? 'o mais rápido' : `+${dif.toFixed(2)}s/volta`}</td>
                <td>{p.desgaste.toFixed(3)}s/volta</td>
                <td>~{Math.round(p.vida)} voltas</td>
                <td>{p.nota ?? ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <h2>Quanto cada equipe aprendeu</h2>
      <div className="barras">
        {equipes.map(([id, v]) => (
          <div key={id} className="barra">
            <span>{EQUIPE.get(id)?.nome ?? id}</span>
            <span className="trilho">
              <span className="cheio" style={{ width: `${Math.round(v * 100)}%`, background: corEquipe(id) }} />
            </span>
            <span>{Math.round(v * 100)}%</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function JogosNovos({ f, grid }: { f: FimDeSemana; grid: LinhaClassificacao[] }) {
  return (
    <section className="painel">
      <h2>Jogos de pneus novos para a corrida</h2>
      <table className="tabela">
        <thead>
          <tr>
            <th>Piloto</th>
            {COMPOSTOS_SECOS.map((k) => (
              <th key={k} style={{ color: PNEUS[k].cor }}>
                {PNEUS[k].nome}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((l) => {
            const jogos = f.jogosNaLargada[l.pilotoId];
            return (
              <tr key={l.pilotoId}>
                <td>{nomePiloto(l.pilotoId)}</td>
                {COMPOSTOS_SECOS.map((k) => (
                  <td key={k}>{jogos ? jogos[k].filter((v) => v === 0).length : ''}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function TrocasDeMotor({ trocas }: { trocas: TrocaDeMotor[] }) {
  return (
    <section className="painel">
      <h2>Unidades de potência novas nesta etapa</h2>
      <ul>
        {trocas.map((t) => (
          <li key={t.pilotoId}>
            {nomePiloto(t.pilotoId)}: {t.unidade}ª unidade da temporada{t.punicao ? `, perde ${t.punicao} posições no grid` : ', dentro do limite'}
          </li>
        ))}
      </ul>
    </section>
  );
}

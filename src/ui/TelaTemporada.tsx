import { useMemo, useState } from 'react';
import {
  criarCampeonato,
  proximaRodada,
  registrarRodada,
  tabelaEquipes,
  tabelaPilotos,
  trocasDeMotor,
  type Campeonato,
  type Rodada,
} from '../engine/campeonato';
import { simularFimDeSemana } from '../engine/fimDeSemana';
import { buscarPista, PISTAS } from '../engine/pistas';
import { criarRng } from '../engine/rng';
import type { Categoria } from '../engine/types';
import { carregarCampeonato, salvarCampeonato } from './armazenamento';
import { corEquipe } from './cores';
import { CarroPixel, CorpoPiloto, Retrato } from './Pixel';
import { Podio } from './Transmissao';
import { EQUIPES, GRID, nomeEquipe, nomePiloto, novaSemente } from './dados';
import { TelaFimDeSemana } from './TelaFimDeSemana';

// Monta o fim de semana de uma etapa a partir da semente guardada: recarregar a página
// devolve exatamente o mesmo fim de semana.
function montarEtapa(c: Campeonato, rodada: Rodada, semente: number) {
  const rng = criarRng(semente);
  const motores = trocasDeMotor(c, GRID.F1, EQUIPES, rng);
  const pista = buscarPista(rodada.pistaId);
  const F1 = simularFimDeSemana({ pista, categoria: 'F1', pilotos: GRID.F1, equipes: EQUIPES, semente: Math.floor(rng() * 2 ** 32), sprint: rodada.sprint, punicoesDeGrid: motores.punicoes });
  const F2 = rodada.f2 ? simularFimDeSemana({ pista, categoria: 'F2', pilotos: GRID.F2, equipes: EQUIPES, semente: Math.floor(rng() * 2 ** 32), sprint: true }) : undefined;
  return { F1, F2, motores };
}

export function TelaTemporada() {
  const [campeonato, setCampeonatoBruto] = useState<Campeonato>(() => carregarCampeonato() ?? criarCampeonato(2026, PISTAS));
  const setCampeonato = (c: Campeonato) => {
    salvarCampeonato(c);
    setCampeonatoBruto(c);
  };
  const rodada = proximaRodada(campeonato);
  const semente = rodada ? campeonato.sementes[rodada.numero] : undefined;
  const etapa = useMemo(() => (rodada && semente !== undefined ? montarEtapa(campeonato, rodada, semente) : null), [campeonato, rodada, semente]);

  if (rodada && etapa) {
    const pista = buscarPista(rodada.pistaId);
    return (
      <TelaFimDeSemana
        key={rodada.numero}
        fins={{ F1: etapa.F1, F2: etapa.F2 }}
        titulo={`Etapa ${rodada.numero} · ${pista.nome}`}
        trocas={etapa.motores.trocas}
        onConcluir={() => setCampeonato(registrarRodada(campeonato, rodada.numero, etapa.F1, etapa.F2, etapa.motores.motores, etapa.motores.trocas))}
      />
    );
  }

  const comecar = () => {
    if (!rodada) return;
    setCampeonato({ ...campeonato, sementes: { ...campeonato.sementes, [rodada.numero]: novaSemente() } });
  };
  const recomecar = () => {
    if (window.confirm('Apagar o campeonato atual e começar de novo?')) setCampeonato(criarCampeonato(2026, PISTAS));
  };

  return (
    <div className="temporada">
      <section className="painel proxima-etapa">
        {rodada ? (
          <>
            <h2>
              Próxima etapa: {rodada.numero}/{campeonato.rodadas.length} · {buscarPista(rodada.pistaId).nome}
            </h2>
            <p className="dica">
              {rodada.sprint ? 'Fim de semana sprint: um treino, classificação sprint, sprint, classificação e corrida.' : 'Três treinos livres, classificação e corrida.'}
              {rodada.f2 ? ' A F2 também corre nesta etapa.' : ''}
            </p>
            <button type="button" className="largar" onClick={comecar}>
              Começar o fim de semana
            </button>
          </>
        ) : (
          <h2>Temporada encerrada. Campeão: {nomePiloto(tabelaPilotos(campeonato, 'F1')[0]?.pilotoId ?? '')}</h2>
        )}
      </section>
      <Tabelas campeonato={campeonato} />
      <Calendario campeonato={campeonato} />
      <button type="button" onClick={recomecar}>
        Recomeçar o campeonato
      </button>
    </div>
  );
}

function Tabelas({ campeonato }: { campeonato: Campeonato }) {
  const [categoria, setCategoria] = useState<Categoria>('F1');
  const [tipo, setTipo] = useState<'pilotos' | 'equipes' | 'grid'>('pilotos');
  const pilotos = tabelaPilotos(campeonato, categoria);
  const equipes = tabelaEquipes(campeonato, categoria);
  return (
    <section className="painel">
      <div className="abas">
        {(['F1', 'F2'] as const).map((c) => (
          <button key={c} type="button" className={c === categoria ? 'ativo' : ''} onClick={() => setCategoria(c)}>
            {c}
          </button>
        ))}
        <button type="button" className={tipo === 'pilotos' ? 'ativo' : ''} onClick={() => setTipo('pilotos')}>
          Pilotos
        </button>
        <button type="button" className={tipo === 'equipes' ? 'ativo' : ''} onClick={() => setTipo('equipes')}>
          Equipes
        </button>
        <button type="button" className={tipo === 'grid' ? 'ativo' : ''} onClick={() => setTipo('grid')}>
          Grid
        </button>
      </div>
      {tipo === 'grid' ? (
        <Galeria categoria={categoria} />
      ) : pilotos.length === 0 ? (
        <p className="dica">Nenhuma corrida disputada ainda.</p>
      ) : tipo === 'pilotos' ? (
        <>
        <Podio ids={pilotos.slice(0, 3).map((l) => l.pilotoId)} titulo="Líderes do campeonato" />
        <table className="tabela">
          <thead>
            <tr>
              <th>Pos</th>
              <th>Piloto</th>
              <th>Equipe</th>
              <th>Pontos</th>
              <th>Vitórias</th>
              <th>Pódios</th>
              <th>Poles</th>
            </tr>
          </thead>
          <tbody>
            {pilotos.map((l, i) => (
              <tr key={l.pilotoId}>
                <td>{i + 1}</td>
                <td>
                  <span className="com-retrato">
                    <Retrato pilotoId={l.pilotoId} /> {nomePiloto(l.pilotoId)}
                  </span>
                </td>
                <td>
                  <span className="faixa" style={{ background: corEquipe(l.equipeId) }} /> {nomeEquipe(l.equipeId)}
                </td>
                <td>
                  <strong>{l.pontos}</strong>
                </td>
                <td>{l.vitorias || ''}</td>
                <td>{l.podios || ''}</td>
                <td>{l.poles || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </>
      ) : (
        <table className="tabela">
          <thead>
            <tr>
              <th>Pos</th>
              <th>Equipe</th>
              <th>Pontos</th>
              <th>Vitórias</th>
            </tr>
          </thead>
          <tbody>
            {equipes.map((l, i) => (
              <tr key={l.equipeId}>
                <td>{i + 1}</td>
                <td>
                  <span className="faixa" style={{ background: corEquipe(l.equipeId) }} /> {nomeEquipe(l.equipeId)}
                </td>
                <td>
                  <strong>{l.pontos}</strong>
                </td>
                <td>{l.vitorias || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function Calendario({ campeonato }: { campeonato: Campeonato }) {
  const resultado = new Map(campeonato.resultados.map((r) => [r.rodada, r]));
  return (
    <section className="painel">
      <h2>Calendário 2026</h2>
      <table className="tabela">
        <thead>
          <tr>
            <th>Etapa</th>
            <th>Pista</th>
            <th>Data</th>
            <th>Formato</th>
            <th>Vencedor F1</th>
            <th>Vencedor F2</th>
          </tr>
        </thead>
        <tbody>
          {campeonato.rodadas.map((r) => {
            const res = resultado.get(r.numero);
            return (
              <tr key={r.numero}>
                <td>{r.numero}</td>
                <td>{buscarPista(r.pistaId).nome}</td>
                <td>{r.data ? new Date(`${r.data}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : ''}</td>
                <td>{[r.sprint ? 'Sprint' : '', r.f2 ? 'F2' : ''].filter(Boolean).join(' · ')}</td>
                <td>{res ? nomePiloto(res.F1.corrida[0]!.pilotoId) : ''}</td>
                <td>{res?.F2 ? nomePiloto(res.F2.corrida[0]!.pilotoId) : ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

// Garagem: cada equipe com o carro e os dois pilotos titulares.
function Galeria({ categoria }: { categoria: Categoria }) {
  const equipes = EQUIPES.filter((e) => e.categoria === categoria);
  return (
    <div className="galeria">
      {equipes.map((e) => {
        const pilotos = GRID[categoria].filter((p) => p.equipeId === e.id);
        return (
          <div key={e.id} className="cartao-equipe" style={{ borderTopColor: corEquipe(e.id) }}>
            <strong>{e.nome}</strong>
            <div className="cartao-corpo">
              <CarroPixel equipeId={e.id} pilotoId={pilotos[0]?.id ?? ''} tamanho={4} />
              <ul>
                {pilotos.map((p) => (
                  <li key={p.id}>
                    <CorpoPiloto pilotoId={p.id} tamanho={96} />
                    <span>{p.nome}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  );
}

import { useState } from 'react';
import { SPRINTS_2026 } from '../engine/campeonato';
import type { Clima } from '../engine/clima';
import { simularFimDeSemana, type FimDeSemana } from '../engine/fimDeSemana';
import { buscarPista, PISTAS } from '../engine/pistas';
import type { Categoria } from '../engine/types';
import { EQUIPES, GRID, novaSemente } from './dados';
import { TelaFimDeSemana } from './TelaFimDeSemana';

interface Config {
  categoria: Categoria;
  pistaId: string;
  clima: Clima | 'sorteado';
  formato: 'calendario' | 'normal' | 'sprint';
}

// Um fim de semana fora do campeonato, para testar pistas, chuva e formatos.
export function TelaAvulsa() {
  const [config, setConfig] = useState<Config>({ categoria: 'F1', pistaId: 'interlagos', clima: 'sorteado', formato: 'calendario' });
  const [fim, setFim] = useState<FimDeSemana | null>(null);

  const comecar = () => {
    const sprint = config.formato === 'calendario' ? SPRINTS_2026.includes(config.pistaId) : config.formato === 'sprint';
    setFim(
      simularFimDeSemana({
        pista: buscarPista(config.pistaId),
        categoria: config.categoria,
        pilotos: GRID[config.categoria],
        equipes: EQUIPES,
        semente: novaSemente(),
        sprint,
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
          comecar();
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
        {config.categoria === 'F1' && (
          <label>
            Formato
            <select value={config.formato} onChange={(e) => setConfig({ ...config, formato: e.target.value as Config['formato'] })}>
              <option value="calendario">Como no calendário</option>
              <option value="normal">Normal</option>
              <option value="sprint">Sprint</option>
            </select>
          </label>
        )}
        <button type="submit" className="largar">
          Novo fim de semana
        </button>
      </form>
      {fim ? (
        <TelaFimDeSemana key={fim.semente} fins={{ F1: fim }} titulo={buscarPista(fim.pistaId).nome} />
      ) : (
        <p className="dica">Escolha a pista e comece o fim de semana. Cada fim de semana é diferente: tempo, pneus, treinos, classificação e corrida.</p>
      )}
    </div>
  );
}

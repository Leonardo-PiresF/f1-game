import { useState } from 'react';
import { TelaAvulsa } from './TelaAvulsa';
import { TelaTemporada } from './TelaTemporada';

export function App() {
  const [tela, setTela] = useState<'temporada' | 'avulsa'>('temporada');
  return (
    <main className="app">
      <header className="topo">
        <h1>F1 Carreira</h1>
        <nav className="abas">
          <button type="button" className={tela === 'temporada' ? 'ativo' : ''} onClick={() => setTela('temporada')}>
            Campeonato 2026
          </button>
          <button type="button" className={tela === 'avulsa' ? 'ativo' : ''} onClick={() => setTela('avulsa')}>
            Fim de semana avulso
          </button>
        </nav>
      </header>
      {tela === 'temporada' ? <TelaTemporada /> : <TelaAvulsa />}
    </main>
  );
}

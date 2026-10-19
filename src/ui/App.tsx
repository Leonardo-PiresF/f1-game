import { useJogo } from './store';

export function App() {
  const { ano, semente, novoJogo } = useJogo();

  return (
    <main className="app">
      <h1>F1 Carreira</h1>
      <p>Simulador de carreira de F1. Em construção.</p>
      <p>
        Temporada {ano} · semente {semente}
      </p>
      <button type="button" onClick={() => novoJogo()}>
        Novo jogo
      </button>
    </main>
  );
}

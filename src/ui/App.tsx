import { TelaCorrida } from './TelaCorrida';

export function App() {
  return (
    <main className="app">
      <header className="topo">
        <h1>F1 Carreira</h1>
        <p>Simulador de uma corrida, primeira parte jogável. Temporada 2026.</p>
      </header>
      <TelaCorrida />
    </main>
  );
}

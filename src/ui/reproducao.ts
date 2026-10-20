import { useEffect, useRef, useState } from 'react';

export const VELOCIDADES = [10, 30, 60, 120];

// Relógio de uma reprodução (corrida ou sessão): toca, pausa, muda a velocidade e pula para o fim.
export function useReproducao(fim: number, velocidadeInicial = 30) {
  const [tempo, setTempo] = useState(0);
  const [tocando, setTocando] = useState(true);
  const [velocidade, setVelocidade] = useState(velocidadeInicial);
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

  const terminou = tempo >= fim;
  return {
    tempo,
    tocando,
    velocidade,
    terminou,
    setVelocidade,
    alternar: () => {
      if (terminou) setTempo(0);
      setTocando(terminou || !tocando);
    },
    pularParaOFim: () => setTempo(fim),
  };
}

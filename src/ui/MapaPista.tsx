import { useMemo } from 'react';
import type { Pista } from '../engine/types';
import { corEquipe } from './cores';
import type { LinhaTorre } from './relogio';
import { criarTracado, pontoNaVolta } from './tracado';

interface Props {
  pista: Pista;
  linhas: LinhaTorre[];
  siglas: Map<string, string>;
  equipeDe: Map<string, string>;
  segundoPiloto: Set<string>;
  mostrarNomes: boolean;
}

export function MapaPista({ pista, linhas, siglas, equipeDe, segundoPiloto, mostrarNomes }: Props) {
  const tracado = useMemo(() => criarTracado(pista.tracado), [pista]);
  const [lx, ly] = pontoNaVolta(tracado, 0);
  const [ax, ay] = pontoNaVolta(tracado, 0.002);
  const angulo = (Math.atan2(ay - ly, ax - lx) * 180) / Math.PI;
  const caixa = useMemo(() => {
    const xs = tracado.pontos.map((p) => p[0]);
    const ys = tracado.pontos.map((p) => p[1]);
    const m = 6;
    const x0 = Math.min(...xs) - m;
    const y0 = Math.min(...ys) - m;
    return `${x0} ${y0} ${Math.max(...xs) - x0 + m} ${Math.max(...ys) - y0 + m}`;
  }, [tracado]);

  // Desenha de trás para frente, para o líder ficar por cima.
  const ordem = [...linhas].reverse();

  return (
    <svg className="mapa" viewBox={caixa} role="img" aria-label={`Mapa de ${pista.nome}`}>
      <path d={tracado.caminho} className="mapa-asfalto" />
      <path d={tracado.caminho} className="mapa-linha" />
      <rect x={lx - 0.4} y={ly - 2.2} width={0.8} height={4.4} className="mapa-chegada" transform={`rotate(${angulo} ${lx} ${ly})`} />
      {ordem.map((l) => {
        const [x, y] = pontoNaVolta(tracado, l.distancia);
        const cor = corEquipe(equipeDe.get(l.pilotoId) ?? '');
        return (
          <g key={l.pilotoId} className={l.fora ? 'carro carro-fora' : 'carro'}>
            <circle cx={x} cy={y} r={1.3} fill={cor} className={segundoPiloto.has(l.pilotoId) ? 'carro-borda-2' : 'carro-borda-1'} />
            {mostrarNomes && !l.fora && (
              <text x={x + 1.8} y={y + 0.7} className="carro-nome">
                {siglas.get(l.pilotoId)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

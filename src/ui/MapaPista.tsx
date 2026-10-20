import { useMemo } from 'react';
import type { Pista } from '../engine/types';
import { corEquipe } from './cores';
import { caminhoDoBox, caminhoDoTrecho, criarTracado, ladoDeFora, pontoNaVolta, pontoNoBox } from './tracado';

export interface CarroNoMapa {
  pilotoId: string;
  distancia: number; // voltas (só a fração importa para o desenho)
  noBox: boolean;
  fora: boolean;
  apagado?: boolean; // na garagem, durante a classificação
}

interface Props {
  pista: Pista;
  linhas: CarroNoMapa[];
  siglas: Map<string, string>;
  equipeDe: Map<string, string>;
  segundoPiloto: Set<string>;
  mostrarNomes: boolean;
  safetyCar: number | null; // distância do safety car, quando está na pista
}

const BOX_PADRAO = { entrada: 0.975, saida: 0.03 };

export function MapaPista({ pista, linhas, siglas, equipeDe, segundoPiloto, mostrarNomes, safetyCar }: Props) {
  const tracado = useMemo(() => criarTracado(pista.tracado, 4), [pista]);
  const box = pista.box ?? BOX_PADRAO;
  const lado = useMemo(() => ladoDeFora(tracado), [tracado]);
  const desenho = useMemo(
    () => ({
      box: caminhoDoBox(tracado, box, lado),
      zonas: (pista.zonas ?? []).map((z) => caminhoDoTrecho(tracado, z.inicio, z.fim)),
    }),
    [tracado, box, lado, pista],
  );
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
  const sc = safetyCar === null ? null : pontoNaVolta(tracado, safetyCar);

  return (
    <svg className="mapa" viewBox={caixa} role="img" aria-label={`Mapa de ${pista.nome}`}>
      <path d={desenho.box} className="mapa-box" />
      <path d={tracado.caminho} className="mapa-asfalto" />
      {desenho.zonas.map((d, i) => (
        <path key={i} d={d} className="mapa-zona" />
      ))}
      <path d={tracado.caminho} className="mapa-linha" />
      <rect x={lx - 0.4} y={ly - 2.2} width={0.8} height={4.4} className="mapa-chegada" transform={`rotate(${angulo} ${lx} ${ly})`} />
      {sc && (
        <g className="safety-car">
          <rect x={sc[0] - 1.6} y={sc[1] - 1.1} width={3.2} height={2.2} rx={0.5} />
          <text x={sc[0]} y={sc[1] + 0.65}>
            SC
          </text>
        </g>
      )}
      {ordem.map((l) => {
        const [x, y] = l.noBox ? pontoNoBox(tracado, box, l.distancia, lado) : pontoNaVolta(tracado, l.distancia);
        const cor = corEquipe(equipeDe.get(l.pilotoId) ?? '');
        return (
          <g key={l.pilotoId} className={l.fora ? 'carro carro-fora' : l.apagado ? 'carro carro-garagem' : 'carro'}>
            <circle cx={x} cy={y} r={1.3} fill={cor} className={segundoPiloto.has(l.pilotoId) ? 'carro-borda-2' : 'carro-borda-1'} />
            {mostrarNomes && !l.fora && !l.apagado && (
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

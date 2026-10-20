import { useMemo } from 'react';
import type { Pista } from '../engine/types';
import { corEquipe } from './cores';
import { DefsCarros, idCarro } from './Pixel';
import { caminhoDoBox, caminhoDoTrecho, criarTracado, ladoDeFora, pontoDeslocado, pontoNaVolta, pontoNoBox, type Ponto } from './tracado';

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
  foco?: string | null; // piloto seguido pela câmera
  zoom?: boolean;
  onEscolher?: (pilotoId: string) => void;
}

const BOX_PADRAO = { entrada: 0.975, saida: 0.03 };
// Na câmera aproximada, a janela mostra 30 unidades no lado maior (a pista inteira tem 100).
const JANELA_ZOOM = 30;
// Carros a menos disso (em voltas, cerca de 20 m) andam lado a lado, um de cada lado da pista.
const LADO_A_LADO = 0.004;

export function MapaPista({ pista, linhas, siglas, equipeDe, segundoPiloto, mostrarNomes, safetyCar, foco = null, zoom = false, onEscolher }: Props) {
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
    return { x0, y0, w: Math.max(...xs) - x0 + m, h: Math.max(...ys) - y0 + m };
  }, [tracado]);
  const carros = useMemo(
    () => linhas.map((l) => ({ pilotoId: l.pilotoId, equipeId: equipeDe.get(l.pilotoId) ?? '', segundo: segundoPiloto.has(l.pilotoId) })),
    // Os carros só mudam quando muda a sessão, não a cada quadro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [equipeDe, segundoPiloto, linhas.length],
  );

  // Posição e direção de cada carro. Quem está colado em outro vai para o lado, como numa disputa.
  const posicoes = useMemo(() => {
    const naPista = linhas.filter((l) => !l.noBox && !l.fora).sort((a, b) => frac(a.distancia) - frac(b.distancia));
    const desvio = new Map<string, number>();
    for (let i = 1; i < naPista.length; i++) {
      const a = naPista[i - 1]!;
      const b = naPista[i]!;
      if (frac(b.distancia) - frac(a.distancia) < LADO_A_LADO && !desvio.has(a.pilotoId)) {
        desvio.set(a.pilotoId, -0.9);
        desvio.set(b.pilotoId, 0.9);
      }
    }
    const lugar = (l: CarroNoMapa, d: number): Ponto =>
      l.noBox ? pontoNoBox(tracado, box, d, lado) : pontoDeslocado(tracado, d, desvio.get(l.pilotoId) ?? 0);
    return new Map(
      linhas.map((l) => {
        const [x, y] = lugar(l, l.distancia);
        const [fx, fy] = lugar(l, l.distancia + 0.003);
        return [l.pilotoId, { x, y, giro: (Math.atan2(fy - y, fx - x) * 180) / Math.PI + 90 }];
      }),
    );
  }, [linhas, tracado, box, lado]);

  const alvo = foco ? posicoes.get(foco) : undefined;
  const k = zoom && alvo ? JANELA_ZOOM / Math.max(caixa.w, caixa.h) : 1;
  const vista =
    k < 1 && alvo ? `${alvo.x - (caixa.w * k) / 2} ${alvo.y - (caixa.h * k) / 2} ${caixa.w * k} ${caixa.h * k}` : `${caixa.x0} ${caixa.y0} ${caixa.w} ${caixa.h}`;

  // Desenha de trás para frente, para o líder ficar por cima.
  const ordem = [...linhas].reverse();
  const sc = safetyCar === null ? null : pontoNaVolta(tracado, safetyCar);

  return (
    <svg className={`mapa ${zoom && alvo ? 'mapa-zoom' : ''}`} viewBox={vista} role="img" aria-label={`Mapa de ${pista.nome}`}>
      <DefsCarros pilotos={carros} />
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
        const p = posicoes.get(l.pilotoId)!;
        const seguido = l.pilotoId === foco;
        const classe = ['carro', l.fora ? 'carro-fora' : l.apagado ? 'carro-garagem' : '', seguido ? 'carro-seguido' : ''].join(' ');
        return (
          <g key={l.pilotoId} className={classe} onClick={onEscolher ? () => onEscolher(l.pilotoId) : undefined}>
            {seguido && <circle cx={p.x} cy={p.y} r={2.6} className="carro-foco" style={{ stroke: corEquipe(equipeDe.get(l.pilotoId) ?? '') }} />}
            <use href={`#${idCarro(l.pilotoId)}`} transform={`translate(${p.x} ${p.y}) rotate(${p.giro})`} shapeRendering="crispEdges" />
            {mostrarNomes && !l.fora && !l.apagado && (
              <text x={p.x + 2.2 * Math.max(k * 1.4, 0.4)} y={p.y + 0.7 * Math.max(k * 1.4, 0.4)} className="carro-nome" style={{ fontSize: `${1.9 * Math.max(k * 1.4, 0.4)}px` }}>
                {siglas.get(l.pilotoId)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

const frac = (d: number) => ((d % 1) + 1) % 1;

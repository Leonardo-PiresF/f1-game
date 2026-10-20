import { memo } from 'react';
import { PILOTO } from './dados';
import { aparenciaDe, LADO_RETRATO, retangulos, spriteCarro, spriteRetrato, TAMANHO_CARRO, type Grade } from './pixel';

const cacheRetratos = new Map<string, Grade>();

function retratoDe(pilotoId: string): Grade {
  let g = cacheRetratos.get(pilotoId);
  if (!g) {
    const p = PILOTO.get(pilotoId);
    g = spriteRetrato(aparenciaDe(pilotoId, p?.nacionalidade), p?.equipeId ?? '');
    cacheRetratos.set(pilotoId, g);
  }
  return g;
}

export const capaceteDe = (pilotoId: string) => aparenciaDe(pilotoId, PILOTO.get(pilotoId)?.nacionalidade).capacete;

function Pixels({ grade }: { grade: Grade }) {
  return (
    <>
      {retangulos(grade).map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.cor} />
      ))}
    </>
  );
}

export const Retrato = memo(function Retrato({ pilotoId, tamanho = 24 }: { pilotoId: string; tamanho?: number }) {
  return (
    <svg
      className="retrato"
      width={tamanho}
      height={tamanho}
      viewBox={`0 0 ${LADO_RETRATO} ${LADO_RETRATO}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`Retrato de ${PILOTO.get(pilotoId)?.nome ?? pilotoId}`}
    >
      <Pixels grade={retratoDe(pilotoId)} />
    </svg>
  );
});

// Tamanho de um pixel do carro em unidades do mapa (a pista tem 4 de largura).
export const PIXEL_CARRO = 0.17;

export const idCarro = (pilotoId: string) => `carro-${pilotoId}`;

// Um <symbol> por carro, centrado na origem e com o bico para cima; o mapa só posiciona e gira.
export const DefsCarros = memo(function DefsCarros({ pilotos }: { pilotos: { pilotoId: string; equipeId: string; segundo: boolean }[] }) {
  const { largura, altura } = TAMANHO_CARRO;
  return (
    <defs>
      {pilotos.map((p) => (
        <g key={p.pilotoId} id={idCarro(p.pilotoId)} transform={`scale(${PIXEL_CARRO}) translate(${-largura / 2} ${-altura / 2})`}>
          <Pixels grade={spriteCarro(p.equipeId, capaceteDe(p.pilotoId), p.segundo)} />
        </g>
      ))}
    </defs>
  );
});

// Carro avulso (galeria), deitado com o bico para a direita.
export function CarroPixel({ equipeId, pilotoId, tamanho = 3, segundo = false }: { equipeId: string; pilotoId: string; tamanho?: number; segundo?: boolean }) {
  const { largura, altura } = TAMANHO_CARRO;
  return (
    <svg className="carro-pixel" width={altura * tamanho} height={largura * tamanho} viewBox={`0 0 ${altura} ${largura}`} shapeRendering="crispEdges" role="img" aria-label="Carro">
      <g transform={`translate(${altura} 0) rotate(90)`}>
        <Pixels grade={spriteCarro(equipeId, capaceteDe(pilotoId), segundo)} />
      </g>
    </svg>
  );
}

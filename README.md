# f1-game

Simulador de carreira de F1 em 2D, jogado no navegador. Projeto pessoal e de portfólio, sem fins comerciais e sem vínculo com a Fórmula 1, a FIA ou as equipes.

## Rodando localmente

Precisa de Node 22.

```bash
npm install
npm run dev        # abre o jogo em http://localhost:5173
npm test           # testes do motor de simulação
npm run lint
npm run build
```

## Organização

- `src/engine/`: motor de simulação em TypeScript puro, sem React, testável isolado. Toda aleatoriedade passa por `rng.ts` (com semente).
- `src/ui/`: telas em React e estado do jogo (Zustand).
- `src/data/`: dados do jogo em JSON, gerados pelos scripts.
- `scripts/`: scripts que buscam dados de F1 (Jolpica) e F2 (Wikipedia).

## Publicação

Cada push na `main` publica o jogo no GitHub Pages em https://leonardo-piresf.github.io/f1-game/.

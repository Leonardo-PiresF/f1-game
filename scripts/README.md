Scripts Node que buscam os dados do jogo. Rodam fora do jogo, de vez em quando, e o resultado é versionado no repositório.

```bash
npm run dados -- 2026
```

Gera em `dados/brutos/`:

- `f1-<ano>.json`: pilotos com equipe, pontos e vitórias, classificação de construtores e calendário com as pistas, da [API Jolpica](https://api.jolpi.ca).
- `f2-<ano>.json`: inscritos e classificação de pilotos, lidos da página do campeonato na Wikipedia em inglês.

Esses arquivos são a matéria-prima. O cálculo de overall vai transformá-los nos JSON que o jogo lê em `src/data/`.

Atrás de um proxy HTTP, rode com `NODE_USE_ENV_PROXY=1` para o `fetch` do Node usar as variáveis `HTTPS_PROXY`.

## Overall

```bash
npm run overall -- 2026
```

Lê `dados/brutos/` e gera `src/data/temporada-<ano>.json` (o que o jogo vai ler) e `dados/revisao-overall-<ano>.md`, uma tabela com as notas e os números que levaram a elas, para revisar o balanceamento. As fórmulas estão em `scripts/overall/calcular.ts`.

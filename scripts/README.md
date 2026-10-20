Scripts Node que buscam os dados do jogo. Rodam fora do jogo, de vez em quando, e o resultado é versionado no repositório.

```bash
npm run dados -- 2026
```

Gera em `dados/brutos/`:

- `f1-<ano>.json`: pilotos com equipe, pontos e vitórias, classificação de construtores e calendário com as pistas, da [API Jolpica](https://api.jolpi.ca).
- `f2-<ano>.json`: inscritos e classificação de pilotos, lidos da página do campeonato na Wikipedia em inglês.

Esses arquivos são a matéria-prima. O cálculo de overall vai transformá-los nos JSON que o jogo lê em `src/data/`.

Atrás de um proxy HTTP, rode com `NODE_USE_ENV_PROXY=1` para o `fetch` do Node usar as variáveis `HTTPS_PROXY`.

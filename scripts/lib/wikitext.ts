// Leitura mínima de wikitext: o suficiente para as tabelas de inscritos e
// de classificação das páginas de campeonato da Wikipedia.

export interface Celula {
  bruto: string; // conteúdo sem os atributos, com templates e links
  texto: string; // conteúdo limpo, só o texto visível
  rowspan: number;
}

// Texto da seção cujo título começa com `titulo`, até a próxima seção de mesmo nível ou acima.
export function extrairSecao(wikitext: string, titulo: string): string {
  const linhas = wikitext.split('\n');
  const inicio = linhas.findIndex((l) => /^=+/.test(l) && l.replace(/=/g, '').trim().startsWith(titulo));
  if (inicio < 0) throw new Error(`Seção "${titulo}" não encontrada`);
  const nivel = linhas[inicio]!.match(/^=+/)![0].length;
  const fim = linhas.findIndex((l, i) => i > inicio && /^=+/.test(l) && l.match(/^=+/)![0].length <= nivel);
  return linhas.slice(inicio + 1, fim < 0 ? undefined : fim).join('\n');
}

// Primeira tabela `{| class="wikitable"` do texto, sem contar tabelas aninhadas dentro dela.
export function extrairTabela(texto: string): string {
  const inicio = texto.search(/\{\|\s*class="wikitable/);
  if (inicio < 0) throw new Error('Tabela wikitable não encontrada');
  let profundidade = 0;
  const linhas = texto.slice(inicio).split('\n');
  const saida: string[] = [];
  for (const linha of linhas) {
    if (linha.trimStart().startsWith('{|')) profundidade++;
    saida.push(linha);
    if (linha.trimStart().startsWith('|}') && --profundidade === 0) break;
  }
  return saida.join('\n');
}

// Remove templates de nota e referências, que podem atravessar linhas, antes de quebrar a tabela.
function removerNotas(texto: string): string {
  let t = texto.replace(/<ref[^>]*\/>/g, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '');
  // {{efn|...}} pode ter templates dentro, então remove contando chaves.
  for (;;) {
    const i = t.search(/\{\{\s*efn/i);
    if (i < 0) return t;
    let profundidade = 0;
    let j = i;
    for (; j < t.length; j++) {
      if (t.startsWith('{{', j)) { profundidade++; j++; }
      else if (t.startsWith('}}', j)) { profundidade--; j++; if (profundidade === 0) break; }
    }
    t = t.slice(0, i) + t.slice(j + 1);
  }
}

// Posição do primeiro "|" fora de {{ }} e [[ ]], ou -1.
function primeiraBarraLivre(s: string): number {
  let chaves = 0;
  let colchetes = 0;
  for (let i = 0; i < s.length; i++) {
    if (s.startsWith('{{', i)) { chaves++; i++; }
    else if (s.startsWith('}}', i)) { chaves--; i++; }
    else if (s.startsWith('[[', i)) { colchetes++; i++; }
    else if (s.startsWith(']]', i)) { colchetes--; i++; }
    else if (s[i] === '|' && chaves === 0 && colchetes === 0) return i;
  }
  return -1;
}

export function limparTexto(bruto: string): string {
  return bruto
    .replace(/<span[^>]*>[\s\S]*?<\/span>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\{\{\s*flagicon\s*\|[^}]*\}\}/gi, '')
    .replace(/\{\{\s*Tooltip\s*\|([^|}]*)\|[^}]*\}\}/gi, '$1')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/'''?/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function lerCelula(linha: string): Celula {
  const conteudo = linha.slice(1);
  const barra = primeiraBarraLivre(conteudo);
  const temAtributos = barra >= 0 && /=|nowrap/.test(conteudo.slice(0, barra));
  const atributos = temAtributos ? conteudo.slice(0, barra) : '';
  const bruto = (temAtributos ? conteudo.slice(barra + 1) : conteudo).trim();
  const rowspan = Number(atributos.match(/rowspan\s*=\s*"?(\d+)/)?.[1] ?? '1');
  return { bruto, texto: limparTexto(bruto), rowspan };
}

// Linhas da tabela como listas de células, com rowspan já expandido.
// Linhas formadas só por células "!" (cabeçalho, fonte) são descartadas.
export function lerLinhas(tabela: string): Celula[][] {
  const blocos = removerNotas(tabela)
    .split(/\n\|-[^\n]*/)
    .map((bloco) =>
      bloco.split('\n').filter((l) => /^[|!]/.test(l) && !/^\{\||^\|\}/.test(l.trim())),
    )
    // Linhas só com "!" são cabeçalho ou rodapé de fonte.
    .filter((ls) => ls.some((l) => l.startsWith('|')))
    .map((ls) => ls.map(lerCelula));

  const pendentes: { celula: Celula; restantes: number }[] = [];
  const linhas: Celula[][] = [];
  for (const celulas of blocos) {
    const linha: Celula[] = [];
    let coluna = 0;
    const fila = [...celulas];
    while (fila.length > 0 || pendentes[coluna]?.restantes) {
      const pendente = pendentes[coluna];
      if (pendente && pendente.restantes > 0) {
        linha.push(pendente.celula);
        pendente.restantes--;
      } else {
        const celula = fila.shift()!;
        linha.push(celula);
        if (celula.rowspan > 1) pendentes[coluna] = { celula, restantes: celula.rowspan - 1 };
      }
      coluna++;
    }
    linhas.push(linha);
  }
  return linhas;
}

// Código de país do primeiro {{flagicon|XXX}} da célula.
export function bandeira(bruto: string): string | undefined {
  return bruto.match(/\{\{\s*flagicon\s*\|\s*([A-Za-z]+)/i)?.[1]?.toUpperCase();
}

// Título do primeiro [[link]] da célula, sem o texto de exibição.
export function link(bruto: string): string | undefined {
  return bruto.match(/\[\[([^\]|]+)/)?.[1]?.trim();
}

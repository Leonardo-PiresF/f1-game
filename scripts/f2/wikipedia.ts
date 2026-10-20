// Inscritos e classificação da F2 a partir do wikitext da página do campeonato.
import { criarId } from '../lib/texto.ts';
import { bandeira, extrairSecao, extrairTabela, lerLinhas, link } from '../lib/wikitext.ts';

export interface InscritoF2 {
  equipe: string;
  paisEquipe?: string;
  numero: number;
  piloto: string;
  idPiloto: string;
  nacionalidade?: string; // código de país, como na Wikipedia (BRA, GBR...)
  rodadas: string;
  wikipedia?: string; // título do artigo do piloto
}

export interface ClassificacaoF2 {
  posicao: number;
  piloto: string;
  idPiloto: string;
  nacionalidade?: string;
  resultados: string[]; // por corrida: "1", "Ret", "DNS"... ou "" se ainda não correu
  pontos: number;
}

export function lerInscritos(wikitext: string): InscritoF2[] {
  const tabela = extrairTabela(extrairSecao(wikitext, 'Entries'));
  return lerLinhas(tabela).map(([equipe, numero, piloto, rodadas]) => {
    if (!equipe || !numero || !piloto || !rodadas) throw new Error('Linha de inscritos incompleta');
    return {
      equipe: equipe.texto,
      paisEquipe: bandeira(equipe.bruto),
      numero: Number(numero.texto),
      piloto: piloto.texto,
      idPiloto: criarId(piloto.texto),
      nacionalidade: bandeira(piloto.bruto),
      rodadas: rodadas.texto,
      wikipedia: link(piloto.bruto),
    };
  });
}

export function lerClassificacao(wikitext: string): ClassificacaoF2[] {
  const tabela = extrairTabela(extrairSecao(wikitext, "Drivers' Championship standings"));
  // Descarta linhas que não são de piloto, como a de fontes no rodapé.
  const linhas = lerLinhas(tabela).filter((celulas) => /^\d+$/.test(celulas[0]?.texto ?? ''));
  return linhas.map((celulas) => {
    const [posicao, piloto, ...resto] = celulas;
    const pontos = resto.pop();
    if (!posicao || !piloto || !pontos) throw new Error('Linha de classificação incompleta');
    return {
      posicao: Number(posicao.texto),
      piloto: piloto.texto,
      idPiloto: criarId(piloto.texto),
      nacionalidade: bandeira(piloto.bruto),
      resultados: resto.map((c) => c.texto),
      pontos: Number(pontos.texto),
    };
  });
}

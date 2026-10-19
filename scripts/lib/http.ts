// Busca JSON com um User-Agent identificável (a Wikipedia exige) e espera
// quando o servidor responde 429, respeitando o Retry-After.

const USER_AGENT = 'f1-game/0.1 (https://github.com/Leonardo-PiresF/f1-game)';

export async function buscarJson<T>(url: string, tentativas = 5): Promise<T> {
  for (let i = 1; ; i++) {
    const resposta = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (resposta.ok) return (await resposta.json()) as T;
    if (resposta.status !== 429 || i >= tentativas) {
      throw new Error(`${resposta.status} ao buscar ${url}`);
    }
    const espera = Number(resposta.headers.get('retry-after') ?? '10');
    await new Promise((r) => setTimeout(r, espera * 1000));
  }
}

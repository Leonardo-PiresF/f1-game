// O campeonato fica salvo no navegador. Se o armazenamento não estiver disponível,
// o jogo continua funcionando, só não lembra o progresso.
import type { Campeonato } from '../engine/campeonato';

const CHAVE = 'f1-carreira:campeonato';

export function carregarCampeonato(): Campeonato | null {
  try {
    const texto = localStorage.getItem(CHAVE);
    if (!texto) return null;
    const c = JSON.parse(texto) as Campeonato;
    return c.versao === 1 ? c : null;
  } catch {
    return null;
  }
}

export function salvarCampeonato(c: Campeonato | null) {
  try {
    if (c) localStorage.setItem(CHAVE, JSON.stringify(c));
    else localStorage.removeItem(CHAVE);
  } catch {
    // sem armazenamento: segue sem salvar
  }
}

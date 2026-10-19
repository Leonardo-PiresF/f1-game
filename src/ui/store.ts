import { create } from 'zustand';

interface EstadoJogo {
  ano: number;
  semente: number;
  novoJogo: (semente?: number) => void;
}

export const useJogo = create<EstadoJogo>((set) => ({
  ano: 2026,
  semente: 1,
  novoJogo: (semente = Date.now()) => set({ ano: 2026, semente }),
}));

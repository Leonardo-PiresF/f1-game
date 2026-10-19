import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// O GitHub Pages serve o site em /f1-game/, então o build usa esse caminho base.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/f1-game/' : '/',
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
}));

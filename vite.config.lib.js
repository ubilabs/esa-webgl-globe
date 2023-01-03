import {resolve} from 'path';
import {defineConfig} from 'vite';

export default defineConfig({
  base: './',
  resolve: {
    alias: {'~': resolve(__dirname, 'src')}
  },
  build: {
    outDir: 'dist-module',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'globe',
      fileName: 'globe'
    }
  }
});

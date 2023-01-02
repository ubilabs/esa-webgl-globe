import path from 'path';
import {defineConfig} from 'vite';

const rootDir = path.resolve(__dirname, 'src');

export default defineConfig({
  base: './',
  resolve: {
    alias: {'~': rootDir}
  },
  build: {
    emptyOutDir: true,
    lib: {
      entry: path.resolve(rootDir, 'main.ts'),
      name: 'globe',
      fileName: 'globe'
    }
  }
});

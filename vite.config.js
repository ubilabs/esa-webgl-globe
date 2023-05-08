import {resolve, dirname} from 'node:path';
import {defineConfig} from 'vite';
import {glob} from 'glob';

const exampleFiles = glob.sync(resolve(__dirname, 'examples/**/index.html'));
const index = resolve(__dirname, 'index.html');
const input = exampleFiles.reduce(
  (all, filepath) => {
    const name = dirname(filepath).split('/').at(-1);
    all[name] = filepath;
    return all;
  },
  {index}
);

export default defineConfig({
  base: './',
  resolve: {alias: {'~': resolve(__dirname, 'src')}},
  define: {
    __IS_VITE_BUILD__: 'true'
  },
  build: {
    outDir: 'dist/examples',
    emptyOutDir: true,
    rollupOptions: {
      input
    }
  }
});

import {babel} from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import dts from 'rollup-plugin-dts';

const babelOptions = {
  extensions: ['.js', '.ts'],
  babelHelpers: 'bundled'
};

const terserOptions = {output: {comments: 'some'}};

export default [
  // esm bundle without dependencies (these are resolved
  // and handled by the embedding application)
  {
    input: 'src/index.ts',
    external: [/three.*/, '@probe.gl/stats', 'lru-cache'],
    plugins: [
      replace({__IS_VITE_BUILD__: 'false', preventAssignment: true}),
      typescript({tsconfig: './tsconfig.json'}),
      babel({
        presets: ['@babel/preset-modules'],
        babelrc: false,
        extensions: ['.js', '.ts'],
        babelHelpers: 'bundled'
      }),
      terser(terserOptions)
    ],
    output: {
      file: 'dist/esa-webgl-globe.esm.js',
      sourcemap: true,
      format: 'esm'
    }
  },

  // bundle the tile-selection worker with all dependencies
  {
    input: 'src/tile-selector/tile-selector-worker.ts',
    plugins: [
      replace({__IS_VITE_BUILD__: false, preventAssignment: true}),
      typescript({tsconfig: './tsconfig.json'}),
      babel({
        presets: ['@babel/preset-modules'],
        babelrc: false,
        extensions: ['.js', '.ts'],
        babelHelpers: 'bundled',
        compact: true
      }),
      nodeResolve(),
      terser(terserOptions)
    ],
    output: {
      file: 'dist/tile-selector-worker.js',
      format: 'umd',
      sourcemap: true
    }
  },

  // create single .d.ts files for both entrypoints
  {
    input: './dist/types/index.d.ts',
    output: [{file: 'dist/esa-webgl-globe.d.ts', format: 'es'}],
    plugins: [dts()]
  },
  {
    input: './dist/types/tile-selector/tile-selector-worker.d.ts',
    output: [{file: 'dist/tile-selector-worker.d.ts', format: 'es'}],
    plugins: [dts()]
  }
];

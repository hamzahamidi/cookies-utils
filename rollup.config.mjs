import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',
  output: [
    { file: 'dist/index.mjs', format: 'es', sourcemap: true },
    { file: 'dist/index.cjs', format: 'cjs', sourcemap: true, exports: 'named' },
    {
      file: 'dist/cookies-utils.min.js',
      format: 'iife',
      name: 'cookiesUtils',
      sourcemap: true,
      // Only the script tag build is minified, which is why rollup was chosen over
      // a bundler with a single per build minify setting.
      plugins: [terser()],
    },
  ],
  plugins: [typescript({ tsconfig: './tsconfig.build.json' })],
};

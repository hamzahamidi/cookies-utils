import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',
  output: [
    // sourcemap is off on every output: files is ["dist"], so a shipped map's
    // sources would point at ../src paths the consumer never receives.
    { file: 'dist/index.mjs', format: 'es', sourcemap: false },
    { file: 'dist/index.cjs', format: 'cjs', sourcemap: false, exports: 'named' },
    {
      file: 'dist/cookies-utils.min.js',
      format: 'iife',
      name: 'cookiesUtils',
      sourcemap: false,
      // Only the script tag build is minified, which is why rollup was chosen over
      // a bundler with a single per build minify setting.
      plugins: [terser()],
    },
  ],
  plugins: [typescript({ tsconfig: './tsconfig.build.json' })],
};

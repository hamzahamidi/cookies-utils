import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { rollup } from 'rollup';

const scratch = mkdtempSync(join(tmpdir(), 'cookies-utils-smoke-'));

function write(name, contents) {
  writeFileSync(join(scratch, name), contents);
}

try {
  const packOutput = JSON.parse(
    execFileSync('npm', ['pack', '--json', '--pack-destination', scratch], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    }),
  );
  const packed = Array.isArray(packOutput)
    ? packOutput[0]
    : (packOutput['cookies-utils'] ?? Object.values(packOutput)[0]);
  const files = new Set(packed.files.map(({ path }) => path));
  for (const path of [
    'dist/index.mjs',
    'dist/index.cjs',
    'dist/index.d.ts',
    'dist/index.d.cts',
    'dist/cookies-utils.min.js',
  ]) {
    assert(files.has(path), `packed package is missing ${path}`);
  }

  write('package.json', JSON.stringify({ name: 'smoke', version: '0.0.0', private: true }));
  execFileSync('npm', ['install', '--no-audit', '--no-fund', join(scratch, packed.filename)], {
    cwd: scratch,
    stdio: 'inherit',
  });

  const installedPackagePath = join(scratch, 'node_modules/cookies-utils/package.json');
  const packageJson = JSON.parse(readFileSync(installedPackagePath, 'utf8'));
  assert.equal(packageJson.sideEffects, false, 'sideEffects must remain false');
  for (const field of [
    'dependencies',
    'optionalDependencies',
    'peerDependencies',
    'bundledDependencies',
    'bundleDependencies',
  ]) {
    assert.equal(packageJson[field], undefined, `the package must not declare ${field}`);
  }

  write(
    'esm.mjs',
    [
      "import { CookieError, cookies, delete as remove, get, getAll, onChange } from 'cookies-utils';",
      "if (typeof get !== 'function' || typeof getAll !== 'function') throw new Error('ESM named reads are missing');",
      "if (typeof remove !== 'function' || typeof onChange !== 'function') throw new Error('ESM named writes are missing');",
      "if (typeof cookies.delete !== 'function' || typeof cookies.getAll !== 'function' || typeof cookies.onChange !== 'function') throw new Error('ESM namespace is incomplete');",
      "if (typeof CookieError !== 'function') throw new Error('ESM CookieError is missing');",
    ].join('\n'),
  );
  write(
    'cjs.cjs',
    [
      "const { CookieError, cookies, delete: remove, get, getAll, onChange } = require('cookies-utils');",
      "if (typeof get !== 'function' || typeof getAll !== 'function') throw new Error('CJS named reads are missing');",
      "if (typeof remove !== 'function' || typeof onChange !== 'function') throw new Error('CJS named writes are missing');",
      "if (typeof cookies.delete !== 'function' || typeof cookies.getAll !== 'function' || typeof cookies.onChange !== 'function') throw new Error('CJS namespace is incomplete');",
      "if (typeof CookieError !== 'function') throw new Error('CJS CookieError is missing');",
    ].join('\n'),
  );
  execFileSync('node', ['esm.mjs'], { cwd: scratch, stdio: 'inherit' });
  execFileSync('node', ['cjs.cjs'], { cwd: scratch, stdio: 'inherit' });

  const browserBundle = readFileSync(join(scratch, 'node_modules/cookies-utils/dist/cookies-utils.min.js'), 'utf8');
  const browserContext = {};
  runInNewContext(browserBundle, browserContext);
  assert.equal(typeof browserContext.cookiesUtils.get, 'function', 'browser bundle is missing get');
  assert.equal(typeof browserContext.cookiesUtils.getAll, 'function', 'browser bundle is missing getAll');
  assert.equal(typeof browserContext.cookiesUtils.cookies.onChange, 'function', 'browser bundle is missing onChange');

  write(
    'consumer.mts',
    [
      "import { CookieError, cookies, delete as remove, get, getAll, onChange, type CookieChange } from 'cookies-utils';",
      'const change: CookieChange = { changed: [], deleted: [] };',
      'void [CookieError, cookies, remove, get, getAll, onChange, change];',
    ].join('\n'),
  );
  write(
    'consumer.cts',
    [
      "import { CookieError, cookies, delete as remove, get, getAll, onChange, type CookieChange } from 'cookies-utils';",
      'const change: CookieChange = { changed: [], deleted: [] };',
      'void [CookieError, cookies, remove, get, getAll, onChange, change];',
    ].join('\n'),
  );
  write(
    'consumer.ts',
    [
      "import { CookieError, cookies, delete as remove, get, getAll, onChange, type CookieChange } from 'cookies-utils';",
      'const change: CookieChange = { changed: [], deleted: [] };',
      'void [CookieError, cookies, remove, get, getAll, onChange, change];',
    ].join('\n'),
  );
  write(
    'tsconfig.nodenext.json',
    JSON.stringify(
      {
        compilerOptions: {
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          target: 'ES2020',
          strict: true,
          noEmit: true,
        },
        files: ['consumer.mts', 'consumer.cts'],
      },
      null,
      2,
    ),
  );
  write(
    'tsconfig.bundler.json',
    JSON.stringify(
      {
        compilerOptions: {
          module: 'ESNext',
          moduleResolution: 'Bundler',
          target: 'ES2020',
          strict: true,
          noEmit: true,
        },
        files: ['consumer.ts'],
      },
      null,
      2,
    ),
  );

  const tsc = resolve('node_modules/typescript/bin/tsc');
  execFileSync('node', [tsc, '--project', 'tsconfig.nodenext.json'], {
    cwd: scratch,
    stdio: 'inherit',
  });
  execFileSync('node', [tsc, '--project', 'tsconfig.bundler.json'], {
    cwd: scratch,
    stdio: 'inherit',
  });

  write('tree-shake.mjs', "import { get } from 'cookies-utils';\nconsole.log(get);\n");
  const bundle = await rollup({
    input: join(scratch, 'tree-shake.mjs'),
    plugins: [
      {
        name: 'packed-package-resolver',
        resolveId(source) {
          return source === 'cookies-utils'
            ? join(scratch, 'node_modules/cookies-utils/dist/index.mjs')
            : null;
        },
      },
    ],
    treeshake: { moduleSideEffects: false },
  });
  const generated = await bundle.generate({ format: 'esm' });
  const treeShakenOutput = generated.output.map(({ code }) => code).join('\n');
  assert(treeShakenOutput.includes('async function get'), 'tree-shaken output lost the requested get export');
  assert(
    !treeShakenOutput.includes('Cookie change events require the native Cookie Store API'),
    'tree-shaken get import retained the unused change-event implementation',
  );
  await bundle.close();

  console.log('packed package smoke check passed');
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

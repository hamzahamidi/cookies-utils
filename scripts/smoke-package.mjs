import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const scratch = mkdtempSync(join(tmpdir(), 'cookies-utils-smoke-'));

try {
  const packed = execFileSync('npm', ['pack', '--pack-destination', scratch, '--silent'], {
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .pop();

  writeFileSync(
    join(scratch, 'package.json'),
    JSON.stringify({ name: 'smoke', version: '0.0.0', private: true }),
  );
  execFileSync('npm', ['install', '--no-audit', '--no-fund', join(scratch, packed)], {
    cwd: scratch,
    stdio: 'inherit',
  });

  // Importing must not throw in Node, which is the SSR safety guarantee.
  writeFileSync(
    join(scratch, 'esm.mjs'),
    [
      "import { cookies, get } from 'cookies-utils';",
      "if (typeof get !== 'function') throw new Error('ESM entry is missing get');",
      "if (typeof cookies.delete !== 'function') throw new Error('ESM entry is missing cookies.delete');",
      "console.log('esm ok');",
    ].join('\n'),
  );
  writeFileSync(
    join(scratch, 'cjs.cjs'),
    [
      "const { cookies, get } = require('cookies-utils');",
      "if (typeof get !== 'function') throw new Error('CJS entry is missing get');",
      "if (typeof cookies.delete !== 'function') throw new Error('CJS entry is missing cookies.delete');",
      "console.log('cjs ok');",
    ].join('\n'),
  );

  execFileSync('node', ['esm.mjs'], { cwd: scratch, stdio: 'inherit' });
  execFileSync('node', ['cjs.cjs'], { cwd: scratch, stdio: 'inherit' });
  console.log('package smoke check passed');
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

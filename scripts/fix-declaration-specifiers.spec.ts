import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const scriptPath = fileURLToPath(new URL('./fix-declaration-specifiers.mjs', import.meta.url));

let scratch: string | undefined;

afterEach(() => {
  if (scratch !== undefined) {
    rmSync(scratch, { recursive: true, force: true });
    scratch = undefined;
  }
});

describe('fix-declaration-specifiers', () => {
  it('rewrites an extensionless tsc emit on the first run', () => {
    scratch = mkdtempSync(join(tmpdir(), 'fix-declaration-specifiers-'));
    mkdirSync(join(scratch, 'dist'));
    writeFileSync(join(scratch, 'dist', 'index.d.ts'), "import type { Cookie } from './types';\n");

    execFileSync('node', [scriptPath], { cwd: scratch });

    expect(readFileSync(join(scratch, 'dist', 'index.d.ts'), 'utf8')).toContain("from './types.js'");
    expect(readFileSync(join(scratch, 'dist', 'index.d.cts'), 'utf8')).toContain("from './types.cjs'");
  });

  it('keeps the .d.cts twin pointed at .cjs on a second run with no fresh tsc emit', () => {
    scratch = mkdtempSync(join(tmpdir(), 'fix-declaration-specifiers-'));
    mkdirSync(join(scratch, 'dist'));
    writeFileSync(join(scratch, 'dist', 'index.d.ts'), "import type { Cookie } from './types';\n");

    execFileSync('node', [scriptPath], { cwd: scratch });
    // No tsc in between: the second run reads back the .js-suffixed specifier
    // this same script wrote, which is exactly the scenario that regressed.
    execFileSync('node', [scriptPath], { cwd: scratch });

    expect(readFileSync(join(scratch, 'dist', 'index.d.ts'), 'utf8')).toContain("from './types.js'");
    expect(readFileSync(join(scratch, 'dist', 'index.d.cts'), 'utf8')).toContain("from './types.cjs'");
  });
});

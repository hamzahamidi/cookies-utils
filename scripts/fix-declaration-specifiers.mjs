import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// tsc emits relative specifiers such as './types' with no extension. The package
// sets "type": "module", so a plain .d.ts is ESM as far as Node16/NodeNext
// resolution is concerned, and ESM resolution requires an explicit extension on
// relative specifiers. A require()-based consumer needs the opposite shape: a
// CommonJS-format declaration file, with specifiers pointing at CommonJS-format
// siblings, or its type-only imports fail with "cannot be imported with require".
// Each .d.ts therefore gets two twins: itself with .js specifiers (the import
// condition), and a .d.cts with .cjs specifiers (the require condition).
const RELATIVE_SPECIFIER = /from '(\.\.?\/[^']+)'/g;
const HAS_EXTENSION = /\.[cm]?[jt]sx?$|\.json$/;
const SELF_APPENDED_JS = /\.js$/;

function withExtension(source, extension) {
  return source.replace(RELATIVE_SPECIFIER, (whole, specifier) => {
    // A trailing .js can only be here because this script's own .js pass put
    // it there (tsc never emits one), so strip it before deciding whether the
    // specifier already carries an extension this run should leave alone.
    const bare = specifier.replace(SELF_APPENDED_JS, '');
    return HAS_EXTENSION.test(bare) ? whole : `from '${bare}${extension}'`;
  });
}

function declarationFiles(dir) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      found.push(...declarationFiles(full));
    } else if (name.endsWith('.d.ts')) {
      found.push(full);
    }
  }
  return found;
}

for (const file of declarationFiles('dist')) {
  const original = readFileSync(file, 'utf8');
  writeFileSync(file, withExtension(original, '.js'));
  writeFileSync(file.replace(/\.d\.ts$/, '.d.cts'), withExtension(original, '.cjs'));
}

import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';

const bundlePath = new URL('../dist/cookies-utils.min.js', import.meta.url);
const budget = 4096;
const size = gzipSync(readFileSync(bundlePath)).byteLength;

console.log(`Browser bundle: ${size} bytes gzipped (budget: ${budget} bytes)`);

if (size > budget) {
  throw new Error(`Browser bundle exceeds the ${budget}-byte gzip budget.`);
}

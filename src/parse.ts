export interface WirePair {
  name: string;
  value: string;
}

export function parse(header: string): WirePair[] {
  const pairs: WirePair[] = [];

  for (const segment of header.split(';')) {
    const pair = segment.trim();
    if (pair === '') continue;

    const separator = pair.indexOf('=');
    if (separator === -1) {
      pairs.push({ name: pair, value: '' });
    } else {
      pairs.push({ name: pair.slice(0, separator), value: pair.slice(separator + 1) });
    }
  }

  return pairs;
}

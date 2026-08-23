/** One name/value pair as found on the wire, before any decoding. */
export interface WirePair {
  name: string;
  value: string;
}

/**
 * Splits a raw Cookie header into wire level name/value pairs, in header order.
 * Never builds a RegExp from the header, so a name containing regex metacharacters
 * cannot change how parsing behaves.
 */
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

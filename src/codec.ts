/**
 * Percent encodes a cookie name or value for the wire. This and decode() are
 * the only encode/decode boundary in the library; backends never see raw text.
 */
export function encode(part: string): string {
  return encodeURIComponent(part);
}

/**
 * Percent decodes a cookie name or value read from the wire. encode(decode(x))
 * is not guaranteed to equal x: a foreign cookie can hold a lone '%', which
 * decodes unchanged here but re-encodes to '%25'.
 */
export function decode(part: string): string {
  try {
    return decodeURIComponent(part);
  } catch {
    // A cookie written by another party may hold a lone %, which throws URIError.
    return part;
  }
}

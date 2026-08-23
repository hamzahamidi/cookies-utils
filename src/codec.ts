export function encode(part: string): string {
  return encodeURIComponent(part);
}

export function decode(part: string): string {
  try {
    return decodeURIComponent(part);
  } catch {
    // A cookie written by another party may hold a lone %, which throws URIError.
    return part;
  }
}

import type { NormalizedAttributes, SameSite } from './types';

const SAME_SITE_LABELS: Record<SameSite, string> = {
  strict: 'Strict',
  lax: 'Lax',
  none: 'None',
};

export function serialize(
  encodedName: string,
  encodedValue: string,
  attributes: NormalizedAttributes,
): string {
  const parts = [`${encodedName}=${encodedValue}`];

  if (attributes.maxAge !== undefined) parts.push(`Max-Age=${attributes.maxAge}`);
  if (attributes.expires !== undefined) {
    parts.push(`Expires=${new Date(attributes.expires).toUTCString()}`);
  }
  if (attributes.path !== undefined) parts.push(`Path=${attributes.path}`);
  if (attributes.domain !== undefined) parts.push(`Domain=${attributes.domain}`);
  if (attributes.secure === true) parts.push('Secure');
  if (attributes.sameSite !== undefined) {
    parts.push(`SameSite=${SAME_SITE_LABELS[attributes.sameSite]}`);
  }
  if (attributes.partitioned === true) parts.push('Partitioned');

  return parts.join('; ');
}

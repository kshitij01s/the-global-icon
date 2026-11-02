import slugify from 'slugify';

export function toSlug(input: string): string {
  const slug = slugify(input, { lower: true, strict: true, trim: true });
  return slug || 'item';
}

/** Returns a slug that is unique according to the `exists` predicate. */
export async function uniqueSlug(
  input: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const base = toSlug(input).slice(0, 200);
  let candidate = base;
  let counter = 2;
  while (await exists(candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }
  return candidate;
}

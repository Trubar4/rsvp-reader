
export function computeOrpIndex(word: string): number {
  const len = [...word].length;
  if (len <= 3) return 0;
  if (len <= 5) return 1;
  if (len <= 9) return 2;
  return 3;
}

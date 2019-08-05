export default function filterUndefined<T>(arrayLike: ArrayLike<T | undefined>): T[] {
  return (
    Array.from(arrayLike)
    .filter(v => v) 
  ) as T[];
}

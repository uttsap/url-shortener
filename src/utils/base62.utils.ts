const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export function base62Encode(n: bigint): string {
  if (n === 0n) return alphabet[0];
  const base = BigInt(alphabet.length);
  let str = '';
  while (n > 0) {
    const rem = Number(n % base);
    str = alphabet[rem] + str;
    n = n / base;
  }
  return str;
}

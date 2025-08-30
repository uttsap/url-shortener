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

/**
 * Generate a base62 alias from an ID, minimum length with random padding
 */
export function generateAlias(n: bigint, minLength = 4): string {
  let alias = base62Encode(n);

  const extraLength = Math.max(0, minLength - alias.length);
  if (extraLength > 0) {
    const randomBytes = crypto.getRandomValues(new Uint8Array(extraLength));
    for (let i = 0; i < extraLength; i++) {
      const index = randomBytes[i] % alphabet.length;
      alias += alphabet[index];
    }
  }

  return alias;
}

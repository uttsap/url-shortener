import { randomBytes } from 'crypto';

const convertHexStringToNumber = (input: string): number => parseInt(input, 16);

const convertNumberToBase62 = (input: number): string => {
  const output: string[] = [];

  const base = 62;
  const characterSet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

  while (input > 0) {
    const r = Math.floor(input % base);
    input = Math.floor(input / base);

    output.unshift(characterSet[r] || '');
  }

  return output.join('');
};

const generateRandomBase62 = (length: number): string => {
  const randomInput = randomBytes(length).toString('hex');
  const hex = convertHexStringToNumber(randomInput);
  const output = convertNumberToBase62(hex);
  return output.substring(0, length);
};

export function generateUri(length: number = 16): string {
  return generateRandomBase62(length);
}

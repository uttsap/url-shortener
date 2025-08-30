import { base62Encode } from './base62.utils';

describe('base62Encode', () => {
  it('should encode zero correctly', () => {
    expect(base62Encode(BigInt(0))).toBe('0');
  });

  it('should encode small numbers correctly', () => {
    expect(base62Encode(BigInt(1))).toBe('1');
    expect(base62Encode(BigInt(10))).toBe('A');
    expect(base62Encode(BigInt(35))).toBe('Z');
    expect(base62Encode(BigInt(36))).toBe('a');
    expect(base62Encode(BigInt(61))).toBe('z');
  });

  it('should encode larger numbers correctly', () => {
    expect(base62Encode(BigInt(62))).toBe('10');
    expect(base62Encode(BigInt(123))).toBe('1z');
    expect(base62Encode(BigInt(3844))).toBe('100');
  });

  it('should handle very large numbers', () => {
    expect(base62Encode(BigInt('1234567890123456789'))).toBeDefined();
    expect(typeof base62Encode(BigInt('1234567890123456789'))).toBe('string');
  });

  it('should generate different encodings for different inputs', () => {
    const result1 = base62Encode(BigInt(100));
    const result2 = base62Encode(BigInt(101));
    expect(result1).not.toBe(result2);
  });
});

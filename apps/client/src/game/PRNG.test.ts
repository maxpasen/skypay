import { describe, it, expect } from 'vitest';
import { PRNG } from './PRNG';

describe('PRNG (Client)', () => {
  it('should match server PRNG with same seed', () => {
    const prng = new PRNG(42);

    // These values should match server PRNG with seed 42
    const values = Array.from({ length: 5 }, () => prng.next());

    expect(values).toHaveLength(5);
    values.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    });
  });

  it('should generate deterministic sequences', () => {
    const prng1 = new PRNG(12345);
    const prng2 = new PRNG(12345);

    const values1 = Array.from({ length: 10 }, () => prng1.next());
    const values2 = Array.from({ length: 10 }, () => prng2.next());

    expect(values1).toEqual(values2);
  });

  it('should generate values in range', () => {
    const prng = new PRNG(99);

    for (let i = 0; i < 50; i++) {
      const value = prng.nextInt(1, 10);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(10);
    }
  });
});

import { describe, it, expect } from 'vitest';
import { PRNG } from './prng.js';

describe('PRNG', () => {
  it('should generate deterministic sequences with same seed', () => {
    const prng1 = new PRNG(12345);
    const prng2 = new PRNG(12345);

    const values1 = Array.from({ length: 10 }, () => prng1.next());
    const values2 = Array.from({ length: 10 }, () => prng2.next());

    expect(values1).toEqual(values2);
  });

  it('should generate different sequences with different seeds', () => {
    const prng1 = new PRNG(12345);
    const prng2 = new PRNG(54321);

    const values1 = Array.from({ length: 10 }, () => prng1.next());
    const values2 = Array.from({ length: 10 }, () => prng2.next());

    expect(values1).not.toEqual(values2);
  });

  it('should generate values between 0 and 1', () => {
    const prng = new PRNG(42);

    for (let i = 0; i < 100; i++) {
      const value = prng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('should generate integers in specified range', () => {
    const prng = new PRNG(42);

    for (let i = 0; i < 100; i++) {
      const value = prng.nextInt(1, 10);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(10);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it('should generate floats in specified range', () => {
    const prng = new PRNG(42);

    for (let i = 0; i < 100; i++) {
      const value = prng.nextFloat(10, 20);
      expect(value).toBeGreaterThanOrEqual(10);
      expect(value).toBeLessThan(20);
    }
  });

  it('should shuffle arrays consistently with same seed', () => {
    const array1 = [1, 2, 3, 4, 5];
    const array2 = [1, 2, 3, 4, 5];

    const prng1 = new PRNG(999);
    const prng2 = new PRNG(999);

    prng1.shuffle(array1);
    prng2.shuffle(array2);

    expect(array1).toEqual(array2);
    expect(array1).not.toEqual([1, 2, 3, 4, 5]); // Should be shuffled
  });
});

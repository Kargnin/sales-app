import { describe, it, expect } from 'vitest';
import { haversineDistance, isWithinTolerance } from '../utils/gps.js';

describe('GPS Utilities', () => {
  describe('haversineDistance', () => {
    it('returns 0 for identical coordinates', () => {
      const d = haversineDistance(19.076, 72.8777, 19.076, 72.8777);
      expect(d).toBeCloseTo(0, 1);
    });

    it('calculates known distance between Mumbai and Pune (~148km)', () => {
      const d = haversineDistance(19.076, 72.8777, 18.5204, 73.8567);
      // Approx 120-150 km
      expect(d).toBeGreaterThan(100_000);
      expect(d).toBeLessThan(200_000);
    });

    it('calculates short distance accurately (~30m)', () => {
      // Two points approximately 30m apart
      const d = haversineDistance(19.0760, 72.8777, 19.07627, 72.8777);
      expect(d).toBeGreaterThan(20);
      expect(d).toBeLessThan(40);
    });
  });

  describe('isWithinTolerance', () => {
    it('returns true for distance within default tolerance (50m)', () => {
      expect(isWithinTolerance(30)).toBe(true);
      expect(isWithinTolerance(50)).toBe(true);
    });

    it('returns false for distance exceeding default tolerance', () => {
      expect(isWithinTolerance(51)).toBe(false);
      expect(isWithinTolerance(100)).toBe(false);
    });

    it('respects custom tolerance', () => {
      expect(isWithinTolerance(75, 100)).toBe(true);
      expect(isWithinTolerance(101, 100)).toBe(false);
    });
  });
});

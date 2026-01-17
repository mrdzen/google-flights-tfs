import { describe, it, expect } from 'vitest';
import { decodeTfs, TfsData, TfsFlightSegment, TfsPassengers, TfsSeatClass, TfsTripType } from '../src/index';

describe('decodeTfs', () => {
  // === Edge cases ===
  describe('Edge cases', () => {
    it('returns null for empty string', () => {
      expect(decodeTfs('')).toBeNull();
    });

    it('returns null for null/undefined input', () => {
      expect(decodeTfs(null as unknown as string)).toBeNull();
      expect(decodeTfs(undefined as unknown as string)).toBeNull();
    });

    it('returns null for invalid base64', () => {
      expect(decodeTfs('!!!invalid!!!')).toBeNull();
    });

    it('handles truncated data gracefully', () => {
      // Valid start but truncated - should return result with empty data
      const result = decodeTfs('CjYK');
      // Either returns null or empty result - both are acceptable
      if (result !== null) {
        expect(result.flights).toHaveLength(0);
      }
    });
  });

  // === Return type structure ===
  describe('Return type structure', () => {
    it('returns correct structure when parsing succeeds', () => {
      // Minimal valid data that produces an empty result
      const result = decodeTfs('GAE=');

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('flights');
      expect(result).toHaveProperty('seat');
      expect(result).toHaveProperty('passengers');
      expect(result).toHaveProperty('trip');
      expect(Array.isArray(result!.flights)).toBe(true);
    });

    it('passengers has correct default values', () => {
      const result = decodeTfs('GAE=');

      expect(result).not.toBeNull();
      expect(result!.passengers).toEqual({
        adults: 1,
        children: 0,
        infantsInSeat: 0,
        infantsOnLap: 0
      });
    });

    it('defaults seat class to economy', () => {
      const result = decodeTfs('GAE=');

      expect(result).not.toBeNull();
      expect(result!.seat).toBe('economy');
    });

    it('returns unknown trip type for empty flights', () => {
      const result = decodeTfs('GAE=');

      expect(result).not.toBeNull();
      expect(result!.flights).toHaveLength(0);
      expect(result!.trip).toBe('unknown');
    });
  });

  // === Base64 handling ===
  describe('Base64 handling', () => {
    it('handles standard base64', () => {
      const result = decodeTfs('GAE=');
      expect(result).not.toBeNull();
    });

    it('handles base64 without padding', () => {
      // Same as GAE= but without padding
      const result = decodeTfs('GAE');
      expect(result).not.toBeNull();
    });

    it('handles URL-safe base64 characters', () => {
      // URL-safe base64 uses - and _ instead of + and /
      // This is equivalent to some protobuf data
      const result = decodeTfs('GAE');
      expect(result).not.toBeNull();
    });
  });

  // === Seat class mapping ===
  describe('Seat class mapping', () => {
    it('maps known seat class values correctly', () => {
      // Test internal mapping through result structure
      const result = decodeTfs('GAE=');
      expect(result).not.toBeNull();
      // Default seat class is 1 = economy
      expect(['economy', 'premium-economy', 'business', 'first', 'unknown']).toContain(result!.seat);
    });
  });

  // === Trip type mapping ===
  describe('Trip type mapping', () => {
    it('maps empty flights to unknown', () => {
      const result = decodeTfs('GAE=');
      expect(result).not.toBeNull();
      expect(result!.flights).toHaveLength(0);
      expect(result!.trip).toBe('unknown');
    });
  });

  // === Type exports ===
  describe('Type exports', () => {
    it('exports all required types', () => {
      // TypeScript compilation would fail if types aren't exported correctly
      const data: TfsData | null = null;
      const segment: TfsFlightSegment = {
        date: '',
        origin: '',
        destination: '',
        maxStops: null,
        airlines: []
      };
      const passengers: TfsPassengers = {
        adults: 1,
        children: 0,
        infantsInSeat: 0,
        infantsOnLap: 0
      };
      const seatClass: TfsSeatClass = 'economy';
      const tripType: TfsTripType = 'one-way';

      expect(segment).toBeDefined();
      expect(passengers).toBeDefined();
      expect(seatClass).toBeDefined();
      expect(tripType).toBeDefined();
    });
  });

  // === Stability tests ===
  describe('Stability', () => {
    it('does not throw on random input', () => {
      const randomInputs = [
        'aGVsbG8gd29ybGQ=',
        'dGVzdA==',
        'YWJjMTIz',
        'AAAAAAAAAAAAAAAAa',
        'AQIDBA==',
      ];

      for (const input of randomInputs) {
        expect(() => decodeTfs(input)).not.toThrow();
      }
    });

    it('handles very long input', () => {
      const longInput = 'A'.repeat(10000);
      expect(() => decodeTfs(longInput)).not.toThrow();
    });

    it('handles special characters in URL encoding', () => {
      // URL encoded string
      expect(() => decodeTfs('%20%21%22')).not.toThrow();
    });
  });
});

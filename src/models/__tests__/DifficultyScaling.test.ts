/**
 * Tests for Difficulty Scaling functionality
 * Verifies requirements: 6.5, 7.4
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { GameConfigManager, DEFAULT_CONFIG } from '../GameConfig';

describe('Difficulty Scaling', () => {
  let configManager: GameConfigManager;

  beforeEach(() => {
    configManager = new GameConfigManager();
  });

  describe('Speed Calculation', () => {
    test('should calculate correct trolley speed for segment 0', () => {
      const speed = configManager.calculateTrolleySpeed(0);
      expect(speed).toBe(DEFAULT_CONFIG.trolley.baseSpeed);
    });

    test('should increase speed by 3% per segment', () => {
      const baseSpeed = DEFAULT_CONFIG.trolley.baseSpeed;
      const speedIncrease = DEFAULT_CONFIG.trolley.speedIncrease;
      
      const speed1 = configManager.calculateTrolleySpeed(1);
      const speed2 = configManager.calculateTrolleySpeed(2);
      const speed10 = configManager.calculateTrolleySpeed(10);
      
      expect(speed1).toBeCloseTo(baseSpeed * (1 + speedIncrease), 5);
      expect(speed2).toBeCloseTo(baseSpeed * Math.pow(1 + speedIncrease, 2), 5);
      expect(speed10).toBeCloseTo(baseSpeed * Math.pow(1 + speedIncrease, 10), 5);
    });

    test('should handle negative segment numbers', () => {
      const speed = configManager.calculateTrolleySpeed(-1);
      // Should handle gracefully, likely returning base speed or similar
      expect(typeof speed).toBe('number');
      expect(speed).toBeGreaterThan(0);
    });

    test('should handle large segment numbers', () => {
      const speed = configManager.calculateTrolleySpeed(100);
      expect(typeof speed).toBe('number');
      expect(speed).toBeGreaterThan(DEFAULT_CONFIG.trolley.baseSpeed);
    });
  });

  describe('High-Speed Mode Detection', () => {
    test('should not be in high-speed mode initially', () => {
      const isHighSpeed = configManager.isHighSpeedMode(0);
      expect(isHighSpeed).toBe(false);
    });

    test('should detect high-speed mode when trolley reaches 5x base speed', () => {
      // Calculate which segment reaches 5x speed
      const baseSpeed = DEFAULT_CONFIG.trolley.baseSpeed;
      const speedIncrease = DEFAULT_CONFIG.trolley.speedIncrease;
      const targetMultiplier = DEFAULT_CONFIG.difficulty.barrierIncreaseThreshold; // 5.0
      
      // Find segment where speed >= 5x base speed
      let segment = 0;
      let currentSpeed = baseSpeed;
      
      while (currentSpeed < baseSpeed * targetMultiplier && segment < 1000) {
        segment++;
        currentSpeed = baseSpeed * Math.pow(1 + speedIncrease, segment);
      }
      
      // Should be in high-speed mode at this segment
      const isHighSpeed = configManager.isHighSpeedMode(segment);
      expect(isHighSpeed).toBe(true);
      
      // Should not be in high-speed mode one segment before
      if (segment > 0) {
        const isHighSpeedBefore = configManager.isHighSpeedMode(segment - 1);
        expect(isHighSpeedBefore).toBe(false);
      }
    });

    test('should remain in high-speed mode after threshold', () => {
      // Find a segment well beyond the threshold
      const baseSpeed = DEFAULT_CONFIG.trolley.baseSpeed;
      const speedIncrease = DEFAULT_CONFIG.trolley.speedIncrease;
      const targetMultiplier = DEFAULT_CONFIG.difficulty.barrierIncreaseThreshold * 2; // 10x speed
      
      let segment = 0;
      let currentSpeed = baseSpeed;
      
      while (currentSpeed < baseSpeed * targetMultiplier && segment < 1000) {
        segment++;
        currentSpeed = baseSpeed * Math.pow(1 + speedIncrease, segment);
      }
      
      const isHighSpeed = configManager.isHighSpeedMode(segment);
      expect(isHighSpeed).toBe(true);
    });
  });

  describe('Barrier Count Scaling', () => {
    test('should return 1 barrier in normal mode', () => {
      const barrierCount = configManager.getBarrierCount(0);
      expect(barrierCount).toBe(1);
    });

    test('should return 2-4 barriers in high-speed mode', () => {
      // Find a segment in high-speed mode
      let segment = 0;
      while (!configManager.isHighSpeedMode(segment) && segment < 1000) {
        segment++;
      }
      
      // Test multiple times due to randomness
      const barrierCounts = Array.from({ length: 100 }, () => 
        configManager.getBarrierCount(segment)
      );
      
      // All counts should be between 2 and 4
      barrierCounts.forEach(count => {
        expect(count).toBeGreaterThanOrEqual(DEFAULT_CONFIG.difficulty.highSpeedMinBarriers);
        expect(count).toBeLessThanOrEqual(DEFAULT_CONFIG.difficulty.highSpeedMaxBarriers);
      });
      
      // Should have some variation (not all the same)
      const uniqueCounts = new Set(barrierCounts);
      expect(uniqueCounts.size).toBeGreaterThan(1);
      
      // Should include both min and max values over many iterations
      expect(barrierCounts).toContain(DEFAULT_CONFIG.difficulty.highSpeedMinBarriers);
      expect(barrierCounts).toContain(DEFAULT_CONFIG.difficulty.highSpeedMaxBarriers);
    });

    test('should consistently return correct range for high-speed segments', () => {
      // Test multiple high-speed segments
      const highSpeedSegments = [];
      for (let i = 0; i < 200; i++) {
        if (configManager.isHighSpeedMode(i)) {
          highSpeedSegments.push(i);
        }
        if (highSpeedSegments.length >= 10) break;
      }
      
      expect(highSpeedSegments.length).toBeGreaterThan(0);
      
      highSpeedSegments.forEach(segment => {
        const barrierCount = configManager.getBarrierCount(segment);
        expect(barrierCount).toBeGreaterThanOrEqual(2);
        expect(barrierCount).toBeLessThanOrEqual(4);
      });
    });
  });

  describe('Dynamic Difficulty Adjustment', () => {
    test('should adjust speed increase', () => {
      const newSpeedIncrease = 0.05; // 5% instead of 3%
      configManager.adjustDifficulty({ speedIncrease: newSpeedIncrease });
      
      const speed1 = configManager.calculateTrolleySpeed(1);
      const expectedSpeed = DEFAULT_CONFIG.trolley.baseSpeed * (1 + newSpeedIncrease);
      
      expect(speed1).toBeCloseTo(expectedSpeed, 5);
    });

    test('should adjust barrier threshold', () => {
      const newThreshold = 3.0; // 3x instead of 5x
      configManager.adjustDifficulty({ barrierThreshold: newThreshold });
      
      // Should enter high-speed mode earlier
      let segment = 0;
      while (!configManager.isHighSpeedMode(segment) && segment < 100) {
        segment++;
      }
      
      // Should reach high-speed mode at a lower segment than default
      expect(segment).toBeLessThan(50); // Should be much earlier than with 5x threshold
    });

    test('should adjust max people per track', () => {
      const newMaxPeople = 3;
      configManager.adjustDifficulty({ maxPeoplePerTrack: newMaxPeople });
      
      const distribution = configManager.getPeopleDistribution();
      expect(distribution.maxPeoplePerTrack).toBe(newMaxPeople);
    });

    test('should clamp speed increase to valid range', () => {
      // Test negative value
      configManager.adjustDifficulty({ speedIncrease: -0.1 });
      let speed = configManager.calculateTrolleySpeed(1);
      expect(speed).toBe(DEFAULT_CONFIG.trolley.baseSpeed); // Should be clamped to 0
      
      // Test value > 1
      configManager.adjustDifficulty({ speedIncrease: 1.5 });
      speed = configManager.calculateTrolleySpeed(1);
      expect(speed).toBe(DEFAULT_CONFIG.trolley.baseSpeed * 2); // Should be clamped to 1 (100% increase)
    });

    test('should clamp barrier threshold to valid range', () => {
      // Test very low threshold
      configManager.adjustDifficulty({ barrierThreshold: 0.5 });
      
      // Should be clamped to minimum valid value (1.01)
      // At segment 0, speed is baseSpeed (5.0), threshold is 1.01, so 5.0 * 1.01 = 5.05
      // Since baseSpeed (5.0) < 5.05, should not be in high-speed mode yet
      expect(configManager.isHighSpeedMode(0)).toBe(false);
      
      // But should enter high-speed mode very quickly (at segment 1)
      expect(configManager.isHighSpeedMode(1)).toBe(true);
    });

    test('should clamp max people per track to valid range', () => {
      // Test negative value
      configManager.adjustDifficulty({ maxPeoplePerTrack: -5 });
      const distribution = configManager.getPeopleDistribution();
      expect(distribution.maxPeoplePerTrack).toBe(1); // Should be clamped to 1
    });
  });

  describe('Configuration Persistence', () => {
    test('should export and import configuration', () => {
      // Modify configuration
      configManager.adjustDifficulty({
        speedIncrease: 0.05,
        barrierThreshold: 3.0,
        maxPeoplePerTrack: 3
      });
      
      // Export configuration
      const exportedConfig = configManager.exportToJSON();
      expect(typeof exportedConfig).toBe('string');
      
      // Create new manager and import
      const newManager = new GameConfigManager();
      newManager.loadFromJSON(exportedConfig);
      
      // Should have same settings
      const speed1 = newManager.calculateTrolleySpeed(1);
      const expectedSpeed = DEFAULT_CONFIG.trolley.baseSpeed * 1.05;
      expect(speed1).toBeCloseTo(expectedSpeed, 5);
      
      const distribution = newManager.getPeopleDistribution();
      expect(distribution.maxPeoplePerTrack).toBe(3);
    });

    test('should handle invalid JSON gracefully', () => {
      expect(() => {
        configManager.loadFromJSON('invalid json');
      }).toThrow('Invalid configuration JSON');
    });

    test('should reset to default configuration', () => {
      // Modify configuration
      configManager.adjustDifficulty({ speedIncrease: 0.1 });
      
      // Reset to default
      configManager.resetToDefault();
      
      // Should be back to default values
      const speed1 = configManager.calculateTrolleySpeed(1);
      const expectedSpeed = DEFAULT_CONFIG.trolley.baseSpeed * (1 + DEFAULT_CONFIG.trolley.speedIncrease);
      expect(speed1).toBeCloseTo(expectedSpeed, 5);
    });
  });

  describe('Edge Cases and Validation', () => {
    test('should handle extreme segment numbers', () => {
      // Large but reasonable segment number
      const largeSegment = 1000;
      const speed = configManager.calculateTrolleySpeed(largeSegment);
      expect(typeof speed).toBe('number');
      expect(speed).toBeGreaterThan(0);
      
      // For very large segments, speed might be Infinity due to exponential growth
      // This is actually expected behavior, so we'll test for that
      if (isFinite(speed)) {
        expect(speed).toBeGreaterThan(DEFAULT_CONFIG.trolley.baseSpeed);
      } else {
        expect(speed).toBe(Infinity);
      }
      
      const isHighSpeed = configManager.isHighSpeedMode(largeSegment);
      expect(typeof isHighSpeed).toBe('boolean');
      expect(isHighSpeed).toBe(true); // Should definitely be in high-speed mode
      
      const barrierCount = configManager.getBarrierCount(largeSegment);
      expect(typeof barrierCount).toBe('number');
      expect(barrierCount).toBeGreaterThan(0);
      expect(barrierCount).toBeGreaterThanOrEqual(2);
      expect(barrierCount).toBeLessThanOrEqual(4);
    });

    test('should handle zero segment number', () => {
      const speed = configManager.calculateTrolleySpeed(0);
      expect(speed).toBe(DEFAULT_CONFIG.trolley.baseSpeed);
      
      const isHighSpeed = configManager.isHighSpeedMode(0);
      expect(isHighSpeed).toBe(false);
      
      const barrierCount = configManager.getBarrierCount(0);
      expect(barrierCount).toBe(1);
    });

    test('should maintain consistency across multiple calls', () => {
      const segment = 50;
      
      // Speed should be consistent
      const speed1 = configManager.calculateTrolleySpeed(segment);
      const speed2 = configManager.calculateTrolleySpeed(segment);
      expect(speed1).toBe(speed2);
      
      // High-speed mode should be consistent
      const isHighSpeed1 = configManager.isHighSpeedMode(segment);
      const isHighSpeed2 = configManager.isHighSpeedMode(segment);
      expect(isHighSpeed1).toBe(isHighSpeed2);
    });
  });

  describe('Integration with Game Progression', () => {
    test('should show realistic progression curve', () => {
      const segments = Array.from({ length: 100 }, (_, i) => i);
      const speeds = segments.map(s => configManager.calculateTrolleySpeed(s));
      const barrierCounts = segments.map(s => configManager.getBarrierCount(s));
      
      // Speed should be monotonically increasing
      for (let i = 1; i < speeds.length; i++) {
        expect(speeds[i]).toBeGreaterThan(speeds[i - 1]);
      }
      
      // Should transition from 1 barrier to 2-4 barriers at some point
      const normalModeBarriers = barrierCounts.filter(count => count === 1);
      const highSpeedModeBarriers = barrierCounts.filter(count => count >= 2);
      
      expect(normalModeBarriers.length).toBeGreaterThan(0);
      expect(highSpeedModeBarriers.length).toBeGreaterThan(0);
      
      // First segments should be normal mode
      expect(barrierCounts[0]).toBe(1);
      expect(barrierCounts[1]).toBe(1);
      expect(barrierCounts[2]).toBe(1);
      
      // Later segments should be high-speed mode
      expect(barrierCounts[barrierCounts.length - 1]).toBeGreaterThanOrEqual(2);
      expect(barrierCounts[barrierCounts.length - 2]).toBeGreaterThanOrEqual(2);
    });

    test('should provide smooth difficulty transition', () => {
      // Find the transition point
      let transitionSegment = -1;
      for (let i = 0; i < 200; i++) {
        if (configManager.isHighSpeedMode(i)) {
          transitionSegment = i;
          break;
        }
      }
      
      expect(transitionSegment).toBeGreaterThan(0);
      
      // Speed just before and after transition should be close
      const speedBefore = configManager.calculateTrolleySpeed(transitionSegment - 1);
      const speedAfter = configManager.calculateTrolleySpeed(transitionSegment);
      
      const speedDifference = speedAfter - speedBefore;
      const relativeIncrease = speedDifference / speedBefore;
      
      // Should be a small incremental increase (3% by default)
      expect(relativeIncrease).toBeCloseTo(DEFAULT_CONFIG.trolley.speedIncrease, 3);
    });
  });
});
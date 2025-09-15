import { describe, test, expect, beforeEach } from 'vitest';
import { GameConfigManager, DEFAULT_CONFIG, GameConfig } from '../GameConfig';

describe('GameConfig', () => {
  let configManager: GameConfigManager;

  beforeEach(() => {
    configManager = new GameConfigManager();
  });

  describe('Default Configuration', () => {
    test('should have valid default configuration', () => {
      const config = configManager.getConfig();
      
      expect(config.tracks.count).toBe(5);
      expect(config.tracks.width).toBe(2.0);
      expect(config.tracks.segmentLength).toBe(25.0);
      
      expect(config.trolley.baseSpeed).toBe(7.0);
      expect(config.trolley.speedIncrease).toBe(0.0103); // 1.03% (Requirement 7.1)
      expect(config.trolley.maxSpeedMultiplier).toBe(7.0); // 7x (Requirement 7.4)
      
      expect(config.difficulty.barrierIncreaseThreshold).toBe(7.0); // 7x speed (Requirement 6.5)
      expect(config.difficulty.highSpeedMinBarriers).toBe(2);
      expect(config.difficulty.highSpeedMaxBarriers).toBe(4);
    });

    test('should return a copy of config to prevent external modification', () => {
      const config1 = configManager.getConfig();
      const config2 = configManager.getConfig();
      
      expect(config1).not.toBe(config2); // Different objects
      expect(config1).toEqual(config2); // Same content
      
      config1.trolley.baseSpeed = 999;
      expect(configManager.getConfig().trolley.baseSpeed).toBe(7.0); // Unchanged
    });
  });

  describe('Configuration Updates', () => {
    test('should update partial configuration', () => {
      configManager.updateConfig({
        trolley: {
          baseSpeed: 10.0,
          speedIncrease: 0.05
        }
      });
      
      const config = configManager.getConfig();
      expect(config.trolley.baseSpeed).toBe(10.0);
      expect(config.trolley.speedIncrease).toBe(0.05);
      expect(config.trolley.maxSpeedMultiplier).toBe(7.0); // Should remain unchanged
    });

    test('should merge nested configuration updates', () => {
      configManager.updateConfig({
        difficulty: {
          maxPeoplePerTrack: 10
        }
      });
      
      const config = configManager.getConfig();
      expect(config.difficulty.maxPeoplePerTrack).toBe(10);
      expect(config.difficulty.minPeoplePerTrack).toBe(1); // Should remain unchanged
      expect(config.difficulty.guaranteedSinglePersonTrack).toBe(true); // Should remain unchanged
    });
  });

  describe('Speed Calculations', () => {
    test('should calculate trolley speed correctly', () => {
      // Requirement 7.1: 3% increase per segment
      const baseSpeed = configManager.getConfig().trolley.baseSpeed;
      
      // Segment 0: base speed
      expect(configManager.calculateTrolleySpeed(0)).toBe(baseSpeed);
      
      // Segment 1: base speed * 1.03
      expect(configManager.calculateTrolleySpeed(1)).toBeCloseTo(baseSpeed * 1.03);
      
      // Segment 2: base speed * 1.03^2
      expect(configManager.calculateTrolleySpeed(2)).toBeCloseTo(baseSpeed * Math.pow(1.03, 2));
      
      // Segment 10: base speed * 1.03^10
      expect(configManager.calculateTrolleySpeed(10)).toBeCloseTo(baseSpeed * Math.pow(1.03, 10));
    });

    test('should handle custom speed increase rate', () => {
      configManager.updateConfig({
        trolley: {
          speedIncrease: 0.1 // 10% increase
        }
      });
      
      const baseSpeed = configManager.getConfig().trolley.baseSpeed;
      expect(configManager.calculateTrolleySpeed(1)).toBeCloseTo(baseSpeed * 1.1);
      expect(configManager.calculateTrolleySpeed(2)).toBeCloseTo(baseSpeed * Math.pow(1.1, 2));
    });
  });

  describe('High Speed Mode Detection', () => {
    test('should detect high speed mode correctly', () => {
      // Requirement 7.4: High speed mode at 7x base speed
      const baseSpeed = 7.0;
      const threshold = 7.0; // 7x multiplier
      const speedIncrease = 0.03;
      
      // Calculate segment where speed reaches 5x base speed
      // baseSpeed * (1.03)^n >= baseSpeed * 5
      // (1.03)^n >= 5
      // n >= log(5) / log(1.03)
      const segmentFor5x = Math.ceil(Math.log(5) / Math.log(1.03));
      
      expect(configManager.isHighSpeedMode(segmentFor5x - 1)).toBe(false);
      expect(configManager.isHighSpeedMode(segmentFor5x)).toBe(true);
      expect(configManager.isHighSpeedMode(segmentFor5x + 10)).toBe(true);
    });

    test('should handle custom threshold', () => {
      configManager.updateConfig({
        difficulty: {
          barrierIncreaseThreshold: 2.0 // 2x base speed threshold
        }
      });
      
      // At 2x threshold, should reach high speed mode much earlier
      const segmentFor2x = Math.ceil(Math.log(2) / Math.log(1.03));
      
      expect(configManager.isHighSpeedMode(segmentFor2x - 1)).toBe(false);
      expect(configManager.isHighSpeedMode(segmentFor2x)).toBe(true);
    });
  });

  describe('Barrier Count Logic', () => {
    test('should return 1 barrier in normal mode', () => {
      // Early segments should have 1 barrier
      expect(configManager.getBarrierCount(0)).toBe(1);
      expect(configManager.getBarrierCount(1)).toBe(1);
      expect(configManager.getBarrierCount(10)).toBe(1);
    });

    test('should return 2-4 barriers in high speed mode', () => {
      // Requirement 6.5: 2-4 barriers at high speed
      const highSpeedSegment = Math.ceil(Math.log(5) / Math.log(1.03));
      
      for (let i = 0; i < 100; i++) { // Test multiple times due to randomness
        const barrierCount = configManager.getBarrierCount(highSpeedSegment);
        expect(barrierCount).toBeGreaterThanOrEqual(2);
        expect(barrierCount).toBeLessThanOrEqual(4);
      }
    });

    test('should respect custom barrier count ranges', () => {
      configManager.updateConfig({
        difficulty: {
          barrierIncreaseThreshold: 1.1, // Very low threshold
          highSpeedMinBarriers: 3,
          highSpeedMaxBarriers: 6
        }
      });
      
      // Should be in high speed mode immediately
      for (let i = 0; i < 50; i++) {
        const barrierCount = configManager.getBarrierCount(5);
        expect(barrierCount).toBeGreaterThanOrEqual(3);
        expect(barrierCount).toBeLessThanOrEqual(6);
      }
    });
  });

  describe('People Distribution', () => {
    test('should return correct people distribution settings', () => {
      const distribution = configManager.getPeopleDistribution();
      
      expect(distribution.minPeoplePerTrack).toBe(1);
      expect(distribution.maxPeoplePerTrack).toBe(5);
      expect(distribution.guaranteedSinglePersonTrack).toBe(true);
    });

    test('should reflect configuration updates', () => {
      configManager.updateConfig({
        difficulty: {
          minPeoplePerTrack: 2,
          maxPeoplePerTrack: 8,
          guaranteedSinglePersonTrack: false
        }
      });
      
      const distribution = configManager.getPeopleDistribution();
      expect(distribution.minPeoplePerTrack).toBe(2);
      expect(distribution.maxPeoplePerTrack).toBe(8);
      expect(distribution.guaranteedSinglePersonTrack).toBe(false);
    });
  });

  describe('Dynamic Difficulty Adjustment', () => {
    test('should adjust speed increase', () => {
      configManager.adjustDifficulty({ speedIncrease: 0.05 });
      expect(configManager.getConfig().trolley.speedIncrease).toBe(0.05);
    });

    test('should adjust barrier threshold', () => {
      configManager.adjustDifficulty({ barrierThreshold: 3.0 });
      expect(configManager.getConfig().difficulty.barrierIncreaseThreshold).toBe(3.0);
    });

    test('should adjust max people per track', () => {
      configManager.adjustDifficulty({ maxPeoplePerTrack: 8 });
      expect(configManager.getConfig().difficulty.maxPeoplePerTrack).toBe(8);
    });

    test('should clamp speed increase to valid range', () => {
      configManager.adjustDifficulty({ speedIncrease: -0.1 });
      expect(configManager.getConfig().trolley.speedIncrease).toBe(0);
      
      configManager.adjustDifficulty({ speedIncrease: 1.5 });
      expect(configManager.getConfig().trolley.speedIncrease).toBe(1);
    });

    test('should enforce minimum values for other settings', () => {
      configManager.adjustDifficulty({ barrierThreshold: 0.5 });
      expect(configManager.getConfig().difficulty.barrierIncreaseThreshold).toBe(1.01);
      
      configManager.adjustDifficulty({ maxPeoplePerTrack: 0 });
      expect(configManager.getConfig().difficulty.maxPeoplePerTrack).toBe(1);
    });
  });

  describe('JSON Serialization', () => {
    test('should export configuration to JSON', () => {
      const json = configManager.exportToJSON();
      const parsed = JSON.parse(json);
      
      expect(parsed.trolley.baseSpeed).toBe(7.0);
      expect(parsed.trolley.speedIncrease).toBe(0.0103);
      expect(parsed.difficulty.barrierIncreaseThreshold).toBe(7.0);
    });

    test('should load configuration from JSON', () => {
      const customConfig = {
        trolley: {
          baseSpeed: 8.0,
          speedIncrease: 0.04
        },
        difficulty: {
          maxPeoplePerTrack: 7
        }
      };
      
      configManager.loadFromJSON(JSON.stringify(customConfig));
      
      const config = configManager.getConfig();
      expect(config.trolley.baseSpeed).toBe(8.0);
      expect(config.trolley.speedIncrease).toBe(0.04);
      expect(config.difficulty.maxPeoplePerTrack).toBe(7);
      expect(config.trolley.maxSpeedMultiplier).toBe(7.0); // Should remain default
    });

    test('should handle invalid JSON gracefully', () => {
      expect(() => {
        configManager.loadFromJSON('invalid json');
      }).toThrow('Invalid configuration JSON');
    });
  });

  describe('Configuration Validation', () => {
    test('should validate track configuration', () => {
      expect(() => {
        configManager.updateConfig({
          tracks: { count: 0 }
        });
      }).toThrow('Track count must be at least 1');
      
      expect(() => {
        configManager.updateConfig({
          tracks: { width: -1 }
        });
      }).toThrow('Track width must be positive');
    });

    test('should validate trolley configuration', () => {
      expect(() => {
        configManager.updateConfig({
          trolley: { baseSpeed: -1 }
        });
      }).toThrow('Base speed must be positive');
      
      expect(() => {
        configManager.updateConfig({
          trolley: { speedIncrease: 1.5 }
        });
      }).toThrow('Speed increase must be between 0 and 1');
    });

    test('should validate difficulty configuration', () => {
      expect(() => {
        configManager.updateConfig({
          difficulty: { minPeoplePerTrack: -1 }
        });
      }).toThrow('Minimum people per track cannot be negative');
      
      expect(() => {
        configManager.updateConfig({
          difficulty: { 
            minPeoplePerTrack: 5,
            maxPeoplePerTrack: 3
          }
        });
      }).toThrow('Maximum people per track must be >= minimum people per track');
    });

    test('should validate barrier configuration', () => {
      expect(() => {
        configManager.updateConfig({
          difficulty: { barrierIncreaseThreshold: 0.5 }
        });
      }).toThrow('Barrier increase threshold must be greater than 1');
      
      expect(() => {
        configManager.updateConfig({
          difficulty: { 
            highSpeedMinBarriers: 5,
            highSpeedMaxBarriers: 3
          }
        });
      }).toThrow('High speed maximum barriers must be >= minimum barriers');
    });
  });

  describe('Reset Functionality', () => {
    test('should reset to default configuration', () => {
      // Modify configuration
      configManager.updateConfig({
        trolley: { baseSpeed: 20.0 },
        difficulty: { maxPeoplePerTrack: 10 }
      });
      
      // Verify it's changed
      expect(configManager.getConfig().trolley.baseSpeed).toBe(20.0);
      
      // Reset and verify
      configManager.resetToDefault();
      const config = configManager.getConfig();
      
      expect(config.trolley.baseSpeed).toBe(DEFAULT_CONFIG.trolley.baseSpeed);
      expect(config.difficulty.maxPeoplePerTrack).toBe(DEFAULT_CONFIG.difficulty.maxPeoplePerTrack);
    });
  });

  describe('Constructor with Initial Config', () => {
    test('should accept initial configuration', () => {
      const customConfig = {
        trolley: {
          baseSpeed: 7.0
        }
      };
      
      const manager = new GameConfigManager(customConfig);
      expect(manager.getConfig().trolley.baseSpeed).toBe(7.0);
      expect(manager.getConfig().trolley.speedIncrease).toBe(0.03); // Should use default
    });

    test('should validate initial configuration', () => {
      expect(() => {
        new GameConfigManager({
          trolley: { baseSpeed: -1 }
        });
      }).toThrow('Base speed must be positive');
    });
  });
});
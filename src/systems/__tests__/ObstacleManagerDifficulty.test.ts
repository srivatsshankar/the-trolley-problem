/**
 * Tests for ObstacleManager difficulty scaling functionality
 * Verifies requirements: 6.5, 7.4
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { ObstacleManager } from '../ObstacleManager';
import { GameConfigManager } from '../../models/GameConfig';
import { TrackSegment } from '../TrackGenerator';
import { Track } from '../../models/Track';

// Mock Three.js for testing
vi.mock('three', () => ({
  Vector3: vi.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
    x, y, z,
    clone: vi.fn().mockReturnThis(),
    copy: vi.fn().mockReturnThis(),
    distanceTo: vi.fn().mockReturnValue(1.0),
    set: vi.fn().mockReturnThis()
  })),
  Scene: vi.fn().mockImplementation(() => ({
    add: vi.fn(),
    remove: vi.fn()
  })),
  Box3: vi.fn().mockImplementation(() => ({
    setFromObject: vi.fn(),
    intersectsBox: vi.fn().mockReturnValue(false),
    containsPoint: vi.fn().mockReturnValue(false),
    expandByScalar: vi.fn().mockReturnThis(),
    clone: vi.fn().mockReturnThis()
  }))
}));

// Mock Obstacle class
vi.mock('../../models/Obstacle', () => ({
  createRandomObstacle: vi.fn().mockImplementation((position) => ({
    id: Math.floor(Math.random() * 1000),
    type: Math.random() > 0.5 ? 'rock' : 'trolley',
    position: position,
    getGroup: vi.fn().mockReturnValue({ userData: { type: 'obstacle' } }),
    getCenter: vi.fn().mockReturnValue(position),
    getSize: vi.fn().mockReturnValue({ width: 1.0, height: 0.8, length: 1.0 }),
    checkCollision: vi.fn().mockReturnValue(false),
    checkPointCollision: vi.fn().mockReturnValue(false),
    setVisible: vi.fn(),
    dispose: vi.fn()
  })),
  createObstacle: vi.fn().mockImplementation((type, position) => ({
    id: Math.floor(Math.random() * 1000),
    type: type,
    position: position,
    getGroup: vi.fn().mockReturnValue({ userData: { type: 'obstacle' } }),
    getCenter: vi.fn().mockReturnValue(position),
    getSize: vi.fn().mockReturnValue({ width: 1.0, height: 0.8, length: 1.0 }),
    checkCollision: vi.fn().mockReturnValue(false),
    checkPointCollision: vi.fn().mockReturnValue(false),
    setVisible: vi.fn(),
    dispose: vi.fn()
  }))
}));

describe('ObstacleManager Difficulty Scaling', () => {
  let obstacleManager: ObstacleManager;
  let mockScene: THREE.Scene;
  let mockConfigManager: GameConfigManager;
  let mockTrackSegment: TrackSegment;

  beforeEach(() => {
    mockScene = new THREE.Scene();
    mockConfigManager = new GameConfigManager();
    obstacleManager = new ObstacleManager(mockScene, mockConfigManager);

    // Create mock track segment with 5 tracks
    const mockTracks: Track[] = Array.from({ length: 5 }, (_, i) => ({
      id: i,
      position: new THREE.Vector3(i * 2, 0, 0),
      geometry: {} as any,
      material: {} as any,
      mesh: {} as any
    }));

    mockTrackSegment = {
      id: 1,
      tracks: mockTracks,
      position: new THREE.Vector3(0, 0, 0),
      startZ: 0,
      endZ: 10,
      isVisible: true,
      isGenerated: true
    };

    vi.clearAllMocks();
  });

  describe('Normal Mode Obstacle Generation', () => {
    test('should generate 1 obstacle in early segments', () => {
      const result = obstacleManager.generateObstaclesForSegment(mockTrackSegment, 0);

      expect(result.obstacles).toHaveLength(1);
      expect(result.barrierCount).toBe(1);
      expect(result.affectedTracks).toHaveLength(1);
      expect(result.affectedTracks[0]).toBeGreaterThanOrEqual(0);
      expect(result.affectedTracks[0]).toBeLessThan(5);
    });

    test('should generate 1 obstacle consistently in normal mode', () => {
      const normalModeSegments = [0, 1, 2, 3, 4, 5];
      
      normalModeSegments.forEach(segment => {
        // Ensure we're in normal mode
        expect(mockConfigManager.isHighSpeedMode(segment)).toBe(false);
        
        const result = obstacleManager.generateObstaclesForSegment(mockTrackSegment, segment);
        expect(result.obstacles).toHaveLength(1);
        expect(result.barrierCount).toBe(1);
        expect(result.affectedTracks).toHaveLength(1);
      });
    });
  });

  describe('High-Speed Mode Obstacle Generation', () => {
    test('should generate 2-4 obstacles in high-speed segments', () => {
      // Find a segment that's in high-speed mode
      let highSpeedSegment = 0;
      while (!mockConfigManager.isHighSpeedMode(highSpeedSegment) && highSpeedSegment < 200) {
        highSpeedSegment++;
      }

      expect(mockConfigManager.isHighSpeedMode(highSpeedSegment)).toBe(true);

      const result = obstacleManager.generateObstaclesForSegment(mockTrackSegment, highSpeedSegment);

      expect(result.obstacles.length).toBeGreaterThanOrEqual(2);
      expect(result.obstacles.length).toBeLessThanOrEqual(4);
      expect(result.barrierCount).toBeGreaterThanOrEqual(2);
      expect(result.barrierCount).toBeLessThanOrEqual(4);
      expect(result.affectedTracks).toHaveLength(result.barrierCount);
    });

    test('should show variation in high-speed obstacle counts', () => {
      // Find multiple high-speed segments
      const highSpeedSegments = [];
      for (let i = 0; i < 200; i++) {
        if (mockConfigManager.isHighSpeedMode(i)) {
          highSpeedSegments.push(i);
        }
        if (highSpeedSegments.length >= 20) break;
      }

      expect(highSpeedSegments.length).toBeGreaterThan(0);

      const obstacleCounts = highSpeedSegments.map(segment => {
        const result = obstacleManager.generateObstaclesForSegment(mockTrackSegment, segment);
        return result.obstacles.length;
      });

      // Should have variation in counts
      const uniqueCounts = new Set(obstacleCounts);
      expect(uniqueCounts.size).toBeGreaterThan(1);

      // All counts should be in valid range
      obstacleCounts.forEach(count => {
        expect(count).toBeGreaterThanOrEqual(2);
        expect(count).toBeLessThanOrEqual(4);
      });
    });
  });

  describe('Difficulty Transition', () => {
    test('should transition from 1 to 2-4 obstacles at threshold', () => {
      // Find the transition point
      let transitionSegment = -1;
      for (let i = 0; i < 200; i++) {
        if (mockConfigManager.isHighSpeedMode(i)) {
          transitionSegment = i;
          break;
        }
      }

      expect(transitionSegment).toBeGreaterThan(0);

      // Test segment before transition
      const beforeResult = obstacleManager.generateObstaclesForSegment(mockTrackSegment, transitionSegment - 1);
      expect(beforeResult.obstacles).toHaveLength(1);

      // Test segment at transition
      const atResult = obstacleManager.generateObstaclesForSegment(mockTrackSegment, transitionSegment);
      expect(atResult.obstacles.length).toBeGreaterThanOrEqual(2);
      expect(atResult.obstacles.length).toBeLessThanOrEqual(4);
    });

    test('should maintain high obstacle count after transition', () => {
      // Find a segment well into high-speed mode
      let highSpeedSegment = 0;
      while (!mockConfigManager.isHighSpeedMode(highSpeedSegment) && highSpeedSegment < 200) {
        highSpeedSegment++;
      }
      highSpeedSegment += 10; // Go further into high-speed mode

      const results = Array.from({ length: 10 }, (_, i) => 
        obstacleManager.generateObstaclesForSegment(mockTrackSegment, highSpeedSegment + i)
      );

      results.forEach(result => {
        expect(result.obstacles.length).toBeGreaterThanOrEqual(2);
        expect(result.obstacles.length).toBeLessThanOrEqual(4);
      });
    });
  });

  describe('Track Selection Logic', () => {
    test('should select different tracks for multiple obstacles', () => {
      // Find a high-speed segment
      let highSpeedSegment = 0;
      while (!mockConfigManager.isHighSpeedMode(highSpeedSegment) && highSpeedSegment < 200) {
        highSpeedSegment++;
      }

      const result = obstacleManager.generateObstaclesForSegment(mockTrackSegment, highSpeedSegment);

      if (result.obstacles.length > 1) {
        // Should have unique track assignments
        const uniqueTracks = new Set(result.affectedTracks);
        expect(uniqueTracks.size).toBe(result.affectedTracks.length);

        // All tracks should be valid indices
        result.affectedTracks.forEach(trackIndex => {
          expect(trackIndex).toBeGreaterThanOrEqual(0);
          expect(trackIndex).toBeLessThan(5);
        });
      }
    });

    test('should not exceed available tracks', () => {
      // Test with maximum possible obstacles (4) on 5 tracks
      let highSpeedSegment = 0;
      while (!mockConfigManager.isHighSpeedMode(highSpeedSegment) && highSpeedSegment < 200) {
        highSpeedSegment++;
      }

      // Generate many results to potentially get 4 obstacles
      const results = Array.from({ length: 100 }, () => 
        obstacleManager.generateObstaclesForSegment(mockTrackSegment, highSpeedSegment)
      );

      results.forEach(result => {
        expect(result.obstacles.length).toBeLessThanOrEqual(5); // Can't exceed track count
        expect(result.affectedTracks.length).toBeLessThanOrEqual(5);
        
        // Should not have duplicate tracks
        const uniqueTracks = new Set(result.affectedTracks);
        expect(uniqueTracks.size).toBe(result.affectedTracks.length);
      });
    });
  });

  describe('Dynamic Difficulty Adjustment', () => {
    test('should respond to adjusted barrier threshold', () => {
      // Lower the threshold to enter high-speed mode earlier
      mockConfigManager.adjustDifficulty({ barrierThreshold: 2.0 });

      // Find new transition point
      let newTransitionSegment = -1;
      for (let i = 0; i < 50; i++) {
        if (mockConfigManager.isHighSpeedMode(i)) {
          newTransitionSegment = i;
          break;
        }
      }

      expect(newTransitionSegment).toBeGreaterThan(-1);
      expect(newTransitionSegment).toBeLessThan(50); // Should be much earlier

      const result = obstacleManager.generateObstaclesForSegment(mockTrackSegment, newTransitionSegment);
      expect(result.obstacles.length).toBeGreaterThanOrEqual(2);
    });

    test('should respond to adjusted speed increase', () => {
      // Increase speed growth rate
      mockConfigManager.adjustDifficulty({ speedIncrease: 0.1 }); // 10% instead of 3%

      // Should reach high-speed mode earlier
      let transitionSegment = -1;
      for (let i = 0; i < 100; i++) {
        if (mockConfigManager.isHighSpeedMode(i)) {
          transitionSegment = i;
          break;
        }
      }

      expect(transitionSegment).toBeGreaterThan(-1);
      
      const result = obstacleManager.generateObstaclesForSegment(mockTrackSegment, transitionSegment);
      expect(result.obstacles.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Edge Cases', () => {
    test('should handle single track segment', () => {
      const singleTrackSegment = {
        ...mockTrackSegment,
        tracks: [mockTrackSegment.tracks[0]]
      };

      const result = obstacleManager.generateObstaclesForSegment(singleTrackSegment, 0);
      expect(result.obstacles).toHaveLength(0);
      expect(result.barrierCount).toBe(0);
      expect(result.affectedTracks).toHaveLength(0);
    });

    test('should handle empty track segment', () => {
      const emptySegment = {
        ...mockTrackSegment,
        tracks: []
      };

      const result = obstacleManager.generateObstaclesForSegment(emptySegment, 0);
      expect(result.obstacles).toHaveLength(0);
      expect(result.barrierCount).toBe(0);
      expect(result.affectedTracks).toHaveLength(0);
    });

    test('should handle extreme segment numbers', () => {
      const extremeSegment = 1000;
      const result = obstacleManager.generateObstaclesForSegment(mockTrackSegment, extremeSegment);

      // Should be in high-speed mode
      expect(mockConfigManager.isHighSpeedMode(extremeSegment)).toBe(true);
      expect(result.obstacles.length).toBeGreaterThanOrEqual(2);
      expect(result.obstacles.length).toBeLessThanOrEqual(4);
    });
  });

  describe('Integration with Game Progression', () => {
    test('should show realistic obstacle progression over time', () => {
      const segments = Array.from({ length: 100 }, (_, i) => i);
      const results = segments.map(segment => 
        obstacleManager.generateObstaclesForSegment(mockTrackSegment, segment)
      );

      const obstacleCounts = results.map(r => r.obstacles.length);

      // Early segments should have 1 obstacle
      expect(obstacleCounts[0]).toBe(1);
      expect(obstacleCounts[1]).toBe(1);
      expect(obstacleCounts[2]).toBe(1);

      // Later segments should have more obstacles
      const laterCounts = obstacleCounts.slice(-10);
      laterCounts.forEach(count => {
        expect(count).toBeGreaterThanOrEqual(2);
        expect(count).toBeLessThanOrEqual(4);
      });

      // Should have a clear transition point
      const normalModeCounts = obstacleCounts.filter(count => count === 1);
      const highSpeedModeCounts = obstacleCounts.filter(count => count >= 2);

      expect(normalModeCounts.length).toBeGreaterThan(0);
      expect(highSpeedModeCounts.length).toBeGreaterThan(0);
    });

    test('should maintain consistent difficulty scaling logic', () => {
      // Test that obstacle generation matches config manager expectations
      const testSegments = [0, 10, 20, 50, 100];

      testSegments.forEach(segment => {
        const expectedBarrierCount = mockConfigManager.getBarrierCount(segment);
        const result = obstacleManager.generateObstaclesForSegment(mockTrackSegment, segment);

        expect(result.barrierCount).toBe(expectedBarrierCount);
        expect(result.obstacles.length).toBe(expectedBarrierCount);
      });
    });
  });
});
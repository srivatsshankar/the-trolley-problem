/**
 * Tests for ObstacleManager class
 * Verifies requirements: 6.1, 6.2, 6.5, 7.4
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { ObstacleManager } from '../ObstacleManager';
import { GameConfigManager } from '../../models/GameConfig';
import { TrackSegment } from '../TrackGenerator';
import { Track } from '../../models/Track';
import { Obstacle, ObstacleType } from '../../models/Obstacle';

// Mock Three.js for testing
vi.mock('three');
vi.mock('../../models/Obstacle');

describe('ObstacleManager', () => {
  let obstacleManager: ObstacleManager;
  let mockScene: THREE.Scene;
  let mockConfigManager: GameConfigManager;
  let mockTrackSegment: TrackSegment;

  beforeEach(() => {
    mockScene = new THREE.Scene();
    mockConfigManager = new GameConfigManager();
    obstacleManager = new ObstacleManager(mockScene, mockConfigManager);

    // Create mock track segment with 5 tracks
    const mockTracks: Track[] = [];
    for (let i = 0; i < 5; i++) {
      const mockTrack = {
        id: i,
        position: new THREE.Vector3(i * 2, 0, 0),
        mesh: new THREE.Mesh(),
        dispose: vi.fn()
      } as unknown as Track;
      mockTracks.push(mockTrack);
    }

    mockTrackSegment = {
      id: 0,
      tracks: mockTracks,
      position: new THREE.Vector3(0, 0, 0),
      startZ: 0,
      endZ: 10,
      isVisible: true,
      isGenerated: true
    };

    vi.clearAllMocks();
  });

  describe('Obstacle Generation', () => {
    test('should generate obstacles for multi-track segment', () => {
      const result = obstacleManager.generateObstaclesForSegment(mockTrackSegment, 0);

      expect(result.obstacles.length).toBeGreaterThan(0);
      expect(result.barrierCount).toBeGreaterThan(0);
      expect(result.affectedTracks.length).toBeGreaterThan(0);
      expect(result.affectedTracks.length).toBe(result.obstacles.length);
    });

    test('should not generate obstacles for single-track segment', () => {
      // Create single-track segment
      const singleTrackSegment: TrackSegment = {
        ...mockTrackSegment,
        tracks: [mockTrackSegment.tracks[0]] // Only one track
      };

      const result = obstacleManager.generateObstaclesForSegment(singleTrackSegment, 0);

      expect(result.obstacles.length).toBe(0);
      expect(result.barrierCount).toBe(0);
      expect(result.affectedTracks.length).toBe(0);
    });

    test('should generate exactly 1 barrier for normal speed segments', () => {
      // Mock config manager to return normal speed (not high speed)
      vi.spyOn(mockConfigManager, 'getBarrierCount').mockReturnValue(1);

      const result = obstacleManager.generateObstaclesForSegment(mockTrackSegment, 0);

      expect(result.barrierCount).toBe(1);
      expect(result.obstacles.length).toBe(1);
      expect(result.affectedTracks.length).toBe(1);
    });

    test('should generate 2-4 barriers for high speed segments', () => {
      // Mock config manager to return high speed barrier count
      const highSpeedBarrierCount = 3;
      vi.spyOn(mockConfigManager, 'getBarrierCount').mockReturnValue(highSpeedBarrierCount);

      const result = obstacleManager.generateObstaclesForSegment(mockTrackSegment, 10);

      expect(result.barrierCount).toBe(highSpeedBarrierCount);
      expect(result.obstacles.length).toBe(highSpeedBarrierCount);
      expect(result.affectedTracks.length).toBe(highSpeedBarrierCount);
      expect(result.barrierCount).toBeGreaterThanOrEqual(2);
      expect(result.barrierCount).toBeLessThanOrEqual(4);
    });

    test('should place obstacles on different tracks', () => {
      // Generate multiple barriers
      vi.spyOn(mockConfigManager, 'getBarrierCount').mockReturnValue(3);

      const result = obstacleManager.generateObstaclesForSegment(mockTrackSegment, 5);

      // All affected tracks should be different
      const uniqueTracks = new Set(result.affectedTracks);
      expect(uniqueTracks.size).toBe(result.affectedTracks.length);
    });

    test('should add obstacles to scene', () => {
      const addSpy = vi.spyOn(mockScene, 'add');

      obstacleManager.generateObstaclesForSegment(mockTrackSegment, 0);

      expect(addSpy).toHaveBeenCalled();
    });
  });

  describe('Obstacle Retrieval', () => {
    beforeEach(() => {
      // Generate some obstacles for testing
      obstacleManager.generateObstaclesForSegment(mockTrackSegment, 0);
    });

    test('should retrieve obstacles for specific segment', () => {
      const obstacles = obstacleManager.getObstaclesForSegment(0);
      expect(obstacles.length).toBeGreaterThan(0);
    });

    test('should return empty array for segment with no obstacles', () => {
      const obstacles = obstacleManager.getObstaclesForSegment(999);
      expect(obstacles.length).toBe(0);
    });

    test('should check if track has obstacle', () => {
      // Generate obstacles and check if any track has an obstacle
      const result = obstacleManager.generateObstaclesForSegment(mockTrackSegment, 1);
      
      if (result.affectedTracks.length > 0) {
        const trackWithObstacle = result.affectedTracks[0];
        const trackWithoutObstacle = [0, 1, 2, 3, 4].find(t => !result.affectedTracks.includes(t))!;

        expect(obstacleManager.hasObstacleOnTrack(1, trackWithObstacle)).toBe(true);
        expect(obstacleManager.hasObstacleOnTrack(1, trackWithoutObstacle)).toBe(false);
      }
    });

    test('should get obstacle at specific track position', () => {
      const result = obstacleManager.generateObstaclesForSegment(mockTrackSegment, 2);
      
      if (result.affectedTracks.length > 0) {
        const trackWithObstacle = result.affectedTracks[0];
        const obstacle = obstacleManager.getObstacleAtTrack(2, trackWithObstacle);
        expect(obstacle).toBeDefined();
        expect(obstacle).toBeInstanceOf(Obstacle);
      }
    });
  });

  describe('Collision Detection', () => {
    beforeEach(() => {
      obstacleManager.generateObstaclesForSegment(mockTrackSegment, 0);
    });

    test('should detect collision with bounding box', () => {
      const testBoundingBox = new THREE.Box3(
        new THREE.Vector3(-1, -1, -1),
        new THREE.Vector3(1, 1, 1)
      );

      // Mock obstacle collision detection
      const mockObstacle = {
        checkCollision: vi.fn().mockReturnValue(true)
      } as unknown as Obstacle;

      // Add mock obstacle to manager's internal map
      (obstacleManager as any).obstacles.set('0_0', mockObstacle);

      const collidedObstacle = obstacleManager.checkCollisionWithObstacles(testBoundingBox);
      expect(collidedObstacle).toBe(mockObstacle);
    });

    test('should detect point collision', () => {
      const testPoint = new THREE.Vector3(0, 0, 0);

      // Mock obstacle point collision detection
      const mockObstacle = {
        checkPointCollision: vi.fn().mockReturnValue(true)
      } as unknown as Obstacle;

      // Add mock obstacle to manager's internal map
      (obstacleManager as any).obstacles.set('0_0', mockObstacle);

      const collidedObstacle = obstacleManager.checkPointCollisionWithObstacles(testPoint, 0.1);
      expect(collidedObstacle).toBe(mockObstacle);
    });

    test('should return null when no collision detected', () => {
      const testBoundingBox = new THREE.Box3(
        new THREE.Vector3(100, 100, 100),
        new THREE.Vector3(101, 101, 101)
      );

      const collidedObstacle = obstacleManager.checkCollisionWithObstacles(testBoundingBox);
      expect(collidedObstacle).toBeNull();
    });
  });

  describe('Obstacle Cleanup', () => {
    test('should remove obstacles for specific segment', () => {
      // Generate obstacles
      obstacleManager.generateObstaclesForSegment(mockTrackSegment, 0);
      
      // Verify obstacles exist
      expect(obstacleManager.getObstaclesForSegment(0).length).toBeGreaterThan(0);

      // Remove obstacles
      obstacleManager.removeObstaclesForSegment(0);

      // Verify obstacles are removed
      expect(obstacleManager.getObstaclesForSegment(0).length).toBe(0);
    });

    test('should remove obstacles from scene during cleanup', () => {
      const removeSpy = vi.spyOn(mockScene, 'remove');
      
      obstacleManager.generateObstaclesForSegment(mockTrackSegment, 0);
      obstacleManager.removeObstaclesForSegment(0);

      expect(removeSpy).toHaveBeenCalled();
    });

    test('should dispose obstacle resources during cleanup', () => {
      // Mock obstacle with dispose method
      const mockObstacle = {
        getGroup: vi.fn().mockReturnValue(new THREE.Group()),
        dispose: vi.fn()
      } as unknown as Obstacle;

      // Add mock obstacle to manager's internal map
      (obstacleManager as any).obstacles.set('0_0', mockObstacle);

      obstacleManager.removeObstaclesForSegment(0);

      expect(mockObstacle.dispose).toHaveBeenCalled();
    });

    test('should clear all obstacles', () => {
      // Generate obstacles in multiple segments
      obstacleManager.generateObstaclesForSegment(mockTrackSegment, 0);
      obstacleManager.generateObstaclesForSegment(mockTrackSegment, 1);

      expect(obstacleManager.getObstacleStats().totalObstacles).toBeGreaterThan(0);

      obstacleManager.clearAllObstacles();

      expect(obstacleManager.getObstacleStats().totalObstacles).toBe(0);
    });
  });

  describe('Obstacle Visibility', () => {
    test('should update obstacle visibility based on distance', () => {
      // Generate obstacles
      obstacleManager.generateObstaclesForSegment(mockTrackSegment, 0);

      // Mock obstacle with setVisible method
      const mockObstacle = {
        getCenter: vi.fn().mockReturnValue(new THREE.Vector3(0, 0, 0)),
        setVisible: vi.fn()
      } as unknown as Obstacle;

      // Add mock obstacle to manager's internal map
      (obstacleManager as any).obstacles.set('0_0', mockObstacle);

      const currentPosition = new THREE.Vector3(0, 0, 0);
      const viewDistance = 50;

      obstacleManager.updateObstacleVisibility(currentPosition, viewDistance);

      expect(mockObstacle.setVisible).toHaveBeenCalledWith(true);
    });

    test('should hide obstacles beyond view distance', () => {
      // Mock obstacle far away
      const mockObstacle = {
        getCenter: vi.fn().mockReturnValue(new THREE.Vector3(0, 0, 100)),
        setVisible: vi.fn()
      } as unknown as Obstacle;

      // Add mock obstacle to manager's internal map
      (obstacleManager as any).obstacles.set('0_0', mockObstacle);

      const currentPosition = new THREE.Vector3(0, 0, 0);
      const viewDistance = 50;

      obstacleManager.updateObstacleVisibility(currentPosition, viewDistance);

      expect(mockObstacle.setVisible).toHaveBeenCalledWith(false);
    });
  });

  describe('Obstacle Statistics', () => {
    test('should provide accurate obstacle statistics', () => {
      // Generate obstacles
      obstacleManager.generateObstaclesForSegment(mockTrackSegment, 0);
      obstacleManager.generateObstaclesForSegment(mockTrackSegment, 1);

      const stats = obstacleManager.getObstacleStats();

      expect(stats.totalObstacles).toBeGreaterThan(0);
      expect(stats.obstaclesByType).toBeDefined();
      expect(stats.obstaclesBySection).toBeDefined();
      // Both segments 0 and 1 are in section 0
      expect(stats.obstaclesBySection[0]).toBeGreaterThan(0);
    });

    test('should count obstacles by type correctly', () => {
      // Mock obstacles with specific types
      const rockObstacle = { type: 'rock' as ObstacleType } as Obstacle;
      const trolleyObstacle = { type: 'trolley' as ObstacleType } as Obstacle;

      // Add mock obstacles to manager's internal map using section-based keys
      (obstacleManager as any).obstacles.set('section_0_track_0', rockObstacle);
      (obstacleManager as any).obstacles.set('section_0_track_1', trolleyObstacle);

      const stats = obstacleManager.getObstacleStats();

      expect(stats.obstaclesByType.rock).toBe(1);
      expect(stats.obstaclesByType.trolley).toBe(1);
    });
  });

  describe('Test Utilities', () => {
    test('should create test obstacle', () => {
      const position = new THREE.Vector3(1, 2, 3);
      const obstacle = obstacleManager.createTestObstacle(0, 0, 'rock', position);

      expect(obstacle).toBeDefined();
      expect(obstacleManager.hasObstacleOnTrack(0, 0)).toBe(true);
    });
  });

  describe('Nearby Obstacles', () => {
    test('should find obstacles near position', () => {
      // Mock obstacle at specific position
      const mockObstacle = {
        getCenter: vi.fn().mockReturnValue(new THREE.Vector3(5, 0, 0))
      } as unknown as Obstacle;

      // Add mock obstacle to manager's internal map
      (obstacleManager as any).obstacles.set('0_0', mockObstacle);

      const nearbyObstacles = obstacleManager.getObstaclesNearPosition(
        new THREE.Vector3(0, 0, 0),
        10 // Max distance
      );

      expect(nearbyObstacles.length).toBe(1);
      expect(nearbyObstacles[0]).toBe(mockObstacle);
    });

    test('should not find obstacles beyond max distance', () => {
      // Mock obstacle far away
      const mockObstacle = {
        getCenter: vi.fn().mockReturnValue(new THREE.Vector3(100, 0, 0))
      } as unknown as Obstacle;

      // Add mock obstacle to manager's internal map
      (obstacleManager as any).obstacles.set('0_0', mockObstacle);

      const nearbyObstacles = obstacleManager.getObstaclesNearPosition(
        new THREE.Vector3(0, 0, 0),
        10 // Max distance
      );

      expect(nearbyObstacles.length).toBe(0);
    });
  });

  describe('Resource Management', () => {
    test('should dispose all resources', () => {
      // Generate obstacles
      obstacleManager.generateObstaclesForSegment(mockTrackSegment, 0);

      expect(() => obstacleManager.dispose()).not.toThrow();
      expect(obstacleManager.getObstacleStats().totalObstacles).toBe(0);
    });
  });
});
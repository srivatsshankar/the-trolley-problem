/**
 * Unit tests for TrolleyController
 * Tests requirements: 7.1, 7.2, 5.5, 5.3, 8.4, 8.2, 8.3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TrolleyController } from '../systems/TrolleyController';
import { GameConfig } from '../models/GameConfig';
import * as THREE from 'three';

// Mock Three.js objects
vi.mock('three', async () => {
  const actual = await vi.importActual('three');
  return {
    ...actual,
    Vector3: vi.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
      x, y, z,
      clone: vi.fn().mockReturnThis(),
      copy: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      add: vi.fn().mockReturnThis(),
      sub: vi.fn().mockReturnThis(),
      multiplyScalar: vi.fn().mockReturnThis(),
      length: vi.fn().mockReturnValue(1),
      normalize: vi.fn().mockReturnThis(),
      distanceTo: vi.fn().mockReturnValue(1),
    })),
    MathUtils: {
      lerp: vi.fn((a, b, t) => a + (b - a) * t),
    },
  };
});

// Mock collision detection
vi.mock('../systems/CollisionDetection', () => ({
  createCollisionDetection: vi.fn(() => ({
    updateTrolleyBoundingBox: vi.fn(),
    checkObstacleCollisions: vi.fn(() => []),
    checkPeopleCollisions: vi.fn(() => []),
    isNearCollision: vi.fn(() => false),
    dispose: vi.fn(),
  })),
}));

// Mock trolley model
vi.mock('../models/Trolley', () => ({
  createTrolley: vi.fn(() => ({
    update: vi.fn(),
    setPosition: vi.fn(),
    showDirectionIndicator: vi.fn(),
    getGroup: vi.fn(() => ({ position: { copy: vi.fn() } })),
    dispose: vi.fn(),
  })),
}));

describe('TrolleyController', () => {
  let trolleyController: TrolleyController;
  let mockConfig: GameConfig;

  beforeEach(() => {
    mockConfig = {
      tracks: {
        count: 5,
        width: 2.0,
        segmentLength: 10.0,
      },
      trolley: {
        baseSpeed: 5.0,
        speedIncrease: 0.03, // 3% increase per segment
        maxSpeedMultiplier: 5.0,
      },
      difficulty: {
        minPeoplePerTrack: 1,
        maxPeoplePerTrack: 5,
        barrierIncreaseThreshold: 5.0,
      },
      rendering: {
        viewDistance: 50.0,
        maxVisibleSegments: 10,
      },
    };

    trolleyController = new TrolleyController(mockConfig);
  });

  describe('Initialization', () => {
    it('should initialize with correct default values', () => {
      expect(trolleyController.currentTrack).toBe(1);
      expect(trolleyController.targetTrack).toBe(1);
      expect(trolleyController.speed).toBe(mockConfig.trolley.baseSpeed);
      expect(trolleyController.baseSpeed).toBe(mockConfig.trolley.baseSpeed);
      expect(trolleyController.segmentsPassed).toBe(0);
      expect(trolleyController.isTransitioning).toBe(false);
      expect(trolleyController.transitionProgress).toBe(0);
    });

    it('should calculate track positions correctly', () => {
      const positions = trolleyController.getTrackPositions();
      expect(positions).toHaveLength(5);
      
      // For 5 tracks with width 2.0, positions should be [-4, -2, 0, 2, 4]
      const expectedPositions = [-4, -2, 0, 2, 4];
      positions.forEach((pos, index) => {
        expect(pos).toBeCloseTo(expectedPositions[index], 2);
      });
    });

    it('should start trolley on center track (track 1)', () => {
      const position = trolleyController.position;
      const centerTrackPosition = trolleyController.getTrackPosition(1);
      expect(position.x).toBe(centerTrackPosition);
    });
  });

  describe('Track Switching', () => {
    it('should switch to valid track numbers', () => {
      trolleyController.switchToTrack(3);
      
      expect(trolleyController.targetTrack).toBe(3);
      expect(trolleyController.isTransitioning).toBe(true);
      expect(trolleyController.transitionProgress).toBe(0);
    });

    it('should reject invalid track numbers', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      trolleyController.switchToTrack(0); // Invalid
      expect(trolleyController.targetTrack).toBe(1); // Should remain unchanged
      expect(trolleyController.isTransitioning).toBe(false);
      
      trolleyController.switchToTrack(6); // Invalid
      expect(trolleyController.targetTrack).toBe(1); // Should remain unchanged
      expect(trolleyController.isTransitioning).toBe(false);
      
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      consoleSpy.mockRestore();
    });

    it('should not start transition if already on target track', () => {
      expect(trolleyController.currentTrack).toBe(1);
      
      trolleyController.switchToTrack(1); // Same track
      expect(trolleyController.isTransitioning).toBe(false);
    });

    it('should handle multiple track switches during transition', () => {
      trolleyController.switchToTrack(3);
      expect(trolleyController.targetTrack).toBe(3);
      
      trolleyController.switchToTrack(5);
      expect(trolleyController.targetTrack).toBe(5);
      expect(trolleyController.transitionProgress).toBe(0); // Should reset
    });
  });

  describe('Speed Management', () => {
    it('should increase speed by 3% per segment', () => {
      const initialSpeed = trolleyController.speed;
      
      trolleyController.increaseSpeed();
      expect(trolleyController.speed).toBeCloseTo(initialSpeed * 1.03, 5);
      expect(trolleyController.segmentsPassed).toBe(1);
      
      trolleyController.increaseSpeed();
      expect(trolleyController.speed).toBeCloseTo(initialSpeed * Math.pow(1.03, 2), 5);
      expect(trolleyController.segmentsPassed).toBe(2);
    });

    it('should calculate speed multiplier correctly', () => {
      expect(trolleyController.getSpeedMultiplier()).toBe(1.0);
      
      trolleyController.increaseSpeed();
      expect(trolleyController.getSpeedMultiplier()).toBeCloseTo(1.03, 5);
      
      // Increase speed multiple times to reach high speed
      for (let i = 0; i < 50; i++) {
        trolleyController.increaseSpeed();
      }
      
      expect(trolleyController.getSpeedMultiplier()).toBeGreaterThan(4.0);
    });

    it('should detect high-speed threshold correctly', () => {
      expect(trolleyController.isHighSpeed()).toBe(false);
      
      // Increase speed until we reach the threshold
      while (!trolleyController.isHighSpeed()) {
        trolleyController.increaseSpeed();
      }
      
      expect(trolleyController.getSpeedMultiplier()).toBeGreaterThanOrEqual(
        mockConfig.difficulty.barrierIncreaseThreshold
      );
    });

    it('should allow manual speed setting', () => {
      trolleyController.setSpeed(10.0);
      expect(trolleyController.speed).toBe(10.0);
      
      trolleyController.setSpeed(-5.0); // Should clamp to 0
      expect(trolleyController.speed).toBe(0);
    });
  });

  describe('Position and Movement', () => {
    it('should update forward position based on speed and delta time', () => {
      const initialZ = trolleyController.position.z;
      const deltaTime = 0.016; // ~60 FPS
      
      trolleyController.update(deltaTime);
      
      const expectedZ = initialZ + mockConfig.trolley.baseSpeed * deltaTime;
      expect(trolleyController.position.z).toBeCloseTo(expectedZ, 5);
    });

    it('should handle track transition animation', () => {
      trolleyController.switchToTrack(3);
      
      const deltaTime = 0.5; // Half second
      trolleyController.update(deltaTime);
      
      expect(trolleyController.transitionProgress).toBeCloseTo(0.5, 2);
      expect(trolleyController.isTransitioning).toBe(true);
      expect(trolleyController.currentTrack).toBe(1); // Should still be original track
      
      // Complete the transition
      trolleyController.update(0.5);
      expect(trolleyController.transitionProgress).toBe(1.0);
      expect(trolleyController.isTransitioning).toBe(false);
      expect(trolleyController.currentTrack).toBe(3);
    });

    it('should interpolate position smoothly during transition', () => {
      const startPosition = trolleyController.getTrackPosition(1);
      const endPosition = trolleyController.getTrackPosition(3);
      
      trolleyController.switchToTrack(3);
      trolleyController.update(0.5); // 50% progress
      
      // Position should be between start and end
      const currentX = trolleyController.position.x;
      expect(currentX).toBeGreaterThan(Math.min(startPosition, endPosition));
      expect(currentX).toBeLessThan(Math.max(startPosition, endPosition));
    });

    it('should allow manual position setting', () => {
      const newPosition = new THREE.Vector3(5, 2, 10);
      trolleyController.setPosition(newPosition);
      
      const position = trolleyController.position;
      expect(position.x).toBe(5);
      expect(position.y).toBe(2);
      expect(position.z).toBe(10);
    });
  });

  describe('State Management', () => {
    it('should return complete state information', () => {
      trolleyController.switchToTrack(4);
      trolleyController.increaseSpeed();
      
      const state = trolleyController.getState();
      
      expect(state.currentTrack).toBe(1);
      expect(state.targetTrack).toBe(4);
      expect(state.speed).toBeCloseTo(mockConfig.trolley.baseSpeed * 1.03, 5);
      expect(state.isTransitioning).toBe(true);
      expect(state.transitionProgress).toBe(0);
      expect(state.position).toBeDefined();
    });

    it('should reset to initial state', () => {
      // Modify state
      trolleyController.switchToTrack(5);
      trolleyController.increaseSpeed();
      trolleyController.increaseSpeed();
      trolleyController.setPosition(new THREE.Vector3(10, 5, 20));
      
      // Reset
      trolleyController.reset();
      
      expect(trolleyController.currentTrack).toBe(1);
      expect(trolleyController.targetTrack).toBe(1);
      expect(trolleyController.speed).toBe(mockConfig.trolley.baseSpeed);
      expect(trolleyController.segmentsPassed).toBe(0);
      expect(trolleyController.isTransitioning).toBe(false);
      expect(trolleyController.transitionProgress).toBe(0);
      
      const position = trolleyController.position;
      expect(position.x).toBe(trolleyController.getTrackPosition(1));
      expect(position.y).toBe(0);
      expect(position.z).toBe(0);
    });
  });

  describe('Collision Detection', () => {
    it('should check collisions with obstacles and people', () => {
      const mockObstacles = [{ id: 1 }, { id: 2 }];
      const mockPeople = [{ id: 1 }, { id: 2 }, { id: 3 }];
      
      const collisions = trolleyController.checkCollisions(mockObstacles as any, mockPeople as any);
      
      expect(Array.isArray(collisions)).toBe(true);
      // Collision detection is mocked to return empty array
      expect(collisions).toHaveLength(0);
    });

    it('should check for nearby collisions with warning distance', () => {
      const mockObstacles = [{ id: 1 }];
      const mockPeople = [{ id: 1 }];
      const warningDistance = 3.0;
      
      const isNear = trolleyController.isNearCollision(mockObstacles as any, mockPeople as any, warningDistance);
      
      expect(typeof isNear).toBe('boolean');
      // Mocked to return false
      expect(isNear).toBe(false);
    });

    it('should handle empty collision arrays', () => {
      const collisions = trolleyController.checkCollisions([], []);
      expect(collisions).toHaveLength(0);
      
      const isNear = trolleyController.isNearCollision([], []);
      expect(isNear).toBe(false);
    });
  });

  describe('Track Position Utilities', () => {
    it('should return correct track position for valid track numbers', () => {
      for (let i = 1; i <= 5; i++) {
        expect(() => trolleyController.getTrackPosition(i)).not.toThrow();
        expect(typeof trolleyController.getTrackPosition(i)).toBe('number');
      }
    });

    it('should throw error for invalid track numbers', () => {
      expect(() => trolleyController.getTrackPosition(0)).toThrow();
      expect(() => trolleyController.getTrackPosition(6)).toThrow();
      expect(() => trolleyController.getTrackPosition(-1)).toThrow();
    });

    it('should return all track positions', () => {
      const positions = trolleyController.getTrackPositions();
      expect(positions).toHaveLength(mockConfig.tracks.count);
      expect(Array.isArray(positions)).toBe(true);
    });
  });

  describe('3D Model Integration', () => {
    it('should create and manage trolley 3D model', () => {
      const trolley = trolleyController.createTrolley();
      expect(trolley).toBeDefined();
      expect(trolleyController.getTrolley()).toBe(trolley);
    });

    it('should get trolley group for scene integration', () => {
      trolleyController.createTrolley();
      const group = trolleyController.getTrolleyGroup();
      expect(group).toBeDefined();
    });

    it('should handle mesh setting', () => {
      const mockMesh = {
        position: {
          copy: vi.fn(),
        },
      };
      
      expect(() => trolleyController.setMesh(mockMesh as any)).not.toThrow();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle zero delta time', () => {
      const initialPosition = trolleyController.position.z;
      trolleyController.update(0);
      expect(trolleyController.position.z).toBe(initialPosition);
    });

    it('should handle negative delta time', () => {
      const initialPosition = trolleyController.position.z;
      trolleyController.update(-0.016);
      // Position should move backward
      expect(trolleyController.position.z).toBeLessThan(initialPosition);
    });

    it('should handle very large delta time', () => {
      const initialPosition = trolleyController.position.z;
      trolleyController.update(10.0); // 10 seconds
      expect(trolleyController.position.z).toBeGreaterThan(initialPosition);
    });

    it('should complete transition immediately with large delta time', () => {
      trolleyController.switchToTrack(5);
      trolleyController.update(10.0); // Much larger than transition duration
      
      expect(trolleyController.isTransitioning).toBe(false);
      expect(trolleyController.currentTrack).toBe(5);
      expect(trolleyController.transitionProgress).toBe(1.0);
    });

    it('should handle collision detection without trolley model', () => {
      // Don't create trolley model
      const collisions = trolleyController.checkCollisions([{} as any], [{} as any]);
      expect(collisions).toHaveLength(0);
      
      const isNear = trolleyController.isNearCollision([{} as any], [{} as any]);
      expect(isNear).toBe(false);
    });
  });

  describe('Performance and Resource Management', () => {
    it('should dispose resources properly', () => {
      trolleyController.createTrolley();
      expect(() => trolleyController.dispose()).not.toThrow();
    });

    it('should handle multiple dispose calls safely', () => {
      trolleyController.createTrolley();
      trolleyController.dispose();
      expect(() => trolleyController.dispose()).not.toThrow();
    });

    it('should get collision detection system', () => {
      const collisionDetection = trolleyController.getCollisionDetection();
      expect(collisionDetection).toBeDefined();
    });
  });

  describe('Smooth Step Function', () => {
    it('should provide smooth interpolation during transitions', () => {
      trolleyController.switchToTrack(3);
      
      // Test smooth step at different progress points
      const progressPoints = [0, 0.25, 0.5, 0.75, 1.0];
      const positions: number[] = [];
      
      for (const progress of progressPoints) {
        trolleyController.switchToTrack(3); // Reset transition
        trolleyController.update(progress * 1.0); // 1.0 is transition duration
        positions.push(trolleyController.position.x);
      }
      
      // Positions should be monotonically increasing (or decreasing)
      for (let i = 1; i < positions.length; i++) {
        if (positions[0] < positions[positions.length - 1]) {
          expect(positions[i]).toBeGreaterThanOrEqual(positions[i - 1]);
        } else {
          expect(positions[i]).toBeLessThanOrEqual(positions[i - 1]);
        }
      }
    });
  });
});
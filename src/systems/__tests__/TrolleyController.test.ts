/**
 * Unit tests for TrolleyController
 * Tests requirements: 7.1, 7.2, 5.5, 5.3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { TrolleyController } from '../TrolleyController';
import { DEFAULT_CONFIG, GameConfig } from '../../models/GameConfig';

describe('TrolleyController', () => {
  let trolleyController: TrolleyController;
  let config: GameConfig;

  beforeEach(() => {
    config = { ...DEFAULT_CONFIG };
    trolleyController = new TrolleyController(config);
  });

  describe('Initialization', () => {
    it('should initialize with correct default values', () => {
      expect(trolleyController.currentTrack).toBe(1);
      expect(trolleyController.targetTrack).toBe(1);
      expect(trolleyController.speed).toBe(config.trolley.baseSpeed);
      expect(trolleyController.baseSpeed).toBe(config.trolley.baseSpeed);
      expect(trolleyController.segmentsPassed).toBe(0);
      expect(trolleyController.isTransitioning).toBe(false);
      expect(trolleyController.transitionProgress).toBe(0);
    });

    it('should position trolley on center track initially', () => {
      const position = trolleyController.position;
      expect(position.x).toBe(-4); // Track 1 should be at x=-4
      expect(position.y).toBe(0);
      expect(position.z).toBe(2); // Start on the first track segment
    });

    it('should calculate track positions correctly', () => {
      const trackPositions = trolleyController.getTrackPositions();
      expect(trackPositions).toHaveLength(5);
      
      // For 5 tracks with width 2.0, positions should be [-4, -2, 0, 2, 4]
      expect(trackPositions[0]).toBe(-4);
      expect(trackPositions[1]).toBe(-2);
      expect(trackPositions[2]).toBe(0);
      expect(trackPositions[3]).toBe(2);
      expect(trackPositions[4]).toBe(4);
    });
  });

  describe('Movement and Updates', () => {
    it('should move forward continuously', () => {
      const initialZ = trolleyController.position.z;
      const deltaTime = 0.016; // ~60 FPS
      
      trolleyController.update(deltaTime);
      
      const newZ = trolleyController.position.z;
      expect(newZ).toBeGreaterThan(initialZ);
      expect(newZ).toBe(initialZ + config.trolley.baseSpeed * deltaTime);
    });

    it('should maintain forward movement during track transitions', () => {
      trolleyController.switchToTrack(3);
      const initialZ = trolleyController.position.z;
      const deltaTime = 0.016;
      
      trolleyController.update(deltaTime);
      
      const newZ = trolleyController.position.z;
      expect(newZ).toBeGreaterThan(initialZ);
    });

    it('should update mesh position when mesh is set', () => {
      const mockMesh = new THREE.Object3D();
      trolleyController.setMesh(mockMesh);
      
      trolleyController.update(0.016);
      
      expect(mockMesh.position.z).toBeGreaterThan(0);
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
      
      trolleyController.switchToTrack(0);
      expect(trolleyController.targetTrack).toBe(1);
      expect(trolleyController.isTransitioning).toBe(false);
      
      trolleyController.switchToTrack(6);
      expect(trolleyController.targetTrack).toBe(1);
      expect(trolleyController.isTransitioning).toBe(false);
      
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      consoleSpy.mockRestore();
    });

    it('should not start transition if already on target track', () => {
      expect(trolleyController.currentTrack).toBe(1);
      
      trolleyController.switchToTrack(1);
      
      expect(trolleyController.isTransitioning).toBe(false);
    });

    it('should complete track transition smoothly', () => {
      trolleyController.switchToTrack(5);
      
      // Simulate transition over time
      const deltaTime = 0.1;
      let totalTime = 0;
      
      while (trolleyController.isTransitioning && totalTime < 2.0) {
        trolleyController.update(deltaTime);
        totalTime += deltaTime;
      }
      
      expect(trolleyController.isTransitioning).toBe(false);
      expect(trolleyController.currentTrack).toBe(5);
      expect(trolleyController.transitionProgress).toBe(1);
      
      // Should be at track 5 position
      const expectedX = trolleyController.getTrackPosition(5);
      expect(trolleyController.position.x).toBeCloseTo(expectedX, 5);
    });

    it('should use smooth interpolation during transition', () => {
      trolleyController.switchToTrack(3);
      
      const startX = trolleyController.position.x;
      const endX = trolleyController.getTrackPosition(3);
      
      // Update partway through transition (25% progress)
      trolleyController.update(0.25); // 0.25 seconds of 1.0 second transition
      
      const currentX = trolleyController.position.x;
      const linearInterpolation = startX + (endX - startX) * 0.25;
      
      // Should be between start and end, but not exactly linear due to smooth step
      expect(currentX).toBeGreaterThan(startX);
      expect(currentX).toBeLessThan(endX);
      expect(currentX).not.toBeCloseTo(linearInterpolation, 5); // Not linear interpolation
    });
  });

  describe('Speed Management', () => {
    it('should increase speed by 3% per segment', () => {
      const initialSpeed = trolleyController.speed;
      
      trolleyController.increaseSpeed();
      
      const expectedSpeed = initialSpeed * 1.03;
      expect(trolleyController.speed).toBeCloseTo(expectedSpeed, 5);
      expect(trolleyController.segmentsPassed).toBe(1);
    });

    it('should compound speed increases correctly', () => {
      const initialSpeed = trolleyController.speed;
      
      trolleyController.increaseSpeed(); // 1.03x
      trolleyController.increaseSpeed(); // 1.03^2x
      trolleyController.increaseSpeed(); // 1.03^3x
      
      const expectedSpeed = initialSpeed * Math.pow(1.03, 3);
      expect(trolleyController.speed).toBeCloseTo(expectedSpeed, 5);
      expect(trolleyController.segmentsPassed).toBe(3);
    });

    it('should calculate speed multiplier correctly', () => {
      trolleyController.increaseSpeed();
      trolleyController.increaseSpeed();
      
      const multiplier = trolleyController.getSpeedMultiplier();
      expect(multiplier).toBeCloseTo(Math.pow(1.03, 2), 5);
    });

    it('should detect high-speed mode correctly', () => {
      expect(trolleyController.isHighSpeed()).toBe(false);
      
      // Increase speed to reach 5x threshold
      const targetMultiplier = config.difficulty.barrierIncreaseThreshold;
      const segmentsNeeded = Math.ceil(Math.log(targetMultiplier) / Math.log(1.03));
      
      for (let i = 0; i < segmentsNeeded; i++) {
        trolleyController.increaseSpeed();
      }
      
      expect(trolleyController.isHighSpeed()).toBe(true);
    });

    it('should allow manual speed setting', () => {
      const newSpeed = 15.0;
      trolleyController.setSpeed(newSpeed);
      
      expect(trolleyController.speed).toBe(newSpeed);
    });

    it('should not allow negative speeds', () => {
      trolleyController.setSpeed(-5.0);
      
      expect(trolleyController.speed).toBe(0);
    });
  });

  describe('State Management', () => {
    it('should return correct state object', () => {
      trolleyController.switchToTrack(4);
      trolleyController.increaseSpeed();
      
      const state = trolleyController.getState();
      
      expect(state.currentTrack).toBe(1);
      expect(state.targetTrack).toBe(4);
      expect(state.speed).toBeGreaterThan(config.trolley.baseSpeed);
      expect(state.isTransitioning).toBe(true);
      expect(state.transitionProgress).toBe(0);
      expect(state.position).toBeInstanceOf(THREE.Vector3);
    });

    it('should reset to initial state correctly', () => {
      // Modify state
      trolleyController.switchToTrack(5);
      trolleyController.increaseSpeed();
      trolleyController.increaseSpeed();
      trolleyController.update(0.5);
      
      // Reset
      trolleyController.reset();
      
      expect(trolleyController.currentTrack).toBe(1);
      expect(trolleyController.targetTrack).toBe(1);
      expect(trolleyController.speed).toBe(config.trolley.baseSpeed);
      expect(trolleyController.segmentsPassed).toBe(0);
      expect(trolleyController.isTransitioning).toBe(false);
      expect(trolleyController.transitionProgress).toBe(0);
      
      const position = trolleyController.position;
      expect(position.x).toBe(-4); // Track 1 position
      expect(position.y).toBe(0);
      expect(position.z).toBe(2); // Start on the first track segment
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

  describe('Track Position Utilities', () => {
    it('should return correct track position for valid track numbers', () => {
      expect(trolleyController.getTrackPosition(1)).toBe(-4);
      expect(trolleyController.getTrackPosition(2)).toBe(-2);
      expect(trolleyController.getTrackPosition(3)).toBe(0);
      expect(trolleyController.getTrackPosition(4)).toBe(2);
      expect(trolleyController.getTrackPosition(5)).toBe(4);
    });

    it('should throw error for invalid track numbers', () => {
      expect(() => trolleyController.getTrackPosition(0)).toThrow();
      expect(() => trolleyController.getTrackPosition(6)).toThrow();
    });

    it('should return copy of track positions array', () => {
      const positions1 = trolleyController.getTrackPositions();
      const positions2 = trolleyController.getTrackPositions();
      
      expect(positions1).toEqual(positions2);
      expect(positions1).not.toBe(positions2); // Different array instances
    });
  });

  describe('Collision Detection', () => {
    it('should return empty collision results initially', () => {
      const collisions = trolleyController.checkCollisions();
      
      expect(collisions).toEqual([]);
    });
  });

  describe('Mesh Integration', () => {
    it('should update mesh position when mesh is set', () => {
      const mockMesh = new THREE.Object3D();
      trolleyController.setMesh(mockMesh);
      
      const newPosition = new THREE.Vector3(1, 2, 3);
      trolleyController.setPosition(newPosition);
      
      expect(mockMesh.position.x).toBe(1);
      expect(mockMesh.position.y).toBe(2);
      expect(mockMesh.position.z).toBe(3);
    });

    it('should update mesh position during reset', () => {
      const mockMesh = new THREE.Object3D();
      mockMesh.position.set(10, 10, 10);
      
      trolleyController.setMesh(mockMesh);
      trolleyController.reset();
      
      expect(mockMesh.position.x).toBe(-4); // Track 1 position
      expect(mockMesh.position.y).toBe(0);
      expect(mockMesh.position.z).toBe(2); // Start on the first track segment
    });
  });

  describe('Trolley 3D Model Integration', () => {
    it('should create and integrate 3D trolley model', () => {
      const trolley = trolleyController.createTrolley();
      
      expect(trolley).toBeDefined();
      expect(trolleyController.getTrolley()).toBe(trolley);
      expect(trolleyController.getTrolleyGroup()).toBe(trolley.getGroup());
    });

    it('should update trolley model position and animations', () => {
      const trolley = trolleyController.createTrolley();
      const updateSpy = vi.spyOn(trolley, 'update');
      const setPositionSpy = vi.spyOn(trolley, 'setPosition');
      
      trolleyController.update(0.016);
      
      expect(updateSpy).toHaveBeenCalledWith(0.016, trolleyController.speed);
      expect(setPositionSpy).toHaveBeenCalledWith(trolleyController.position);
    });

    it('should show direction indicators when switching tracks', () => {
      const trolley = trolleyController.createTrolley();
      const indicatorSpy = vi.spyOn(trolley, 'showDirectionIndicator');
      
      trolleyController.switchToTrack(4); // Moving right (track 1 to 4)
      expect(indicatorSpy).toHaveBeenCalledWith('right');
      
      // Complete the transition first
      trolleyController.update(1.5); // Complete transition
      
      trolleyController.switchToTrack(2); // Moving left (track 4 to 2)
      expect(indicatorSpy).toHaveBeenCalledWith('left');
    });

    it('should reset trolley model when controller resets', () => {
      const trolley = trolleyController.createTrolley();
      const setPositionSpy = vi.spyOn(trolley, 'setPosition');
      const indicatorSpy = vi.spyOn(trolley, 'showDirectionIndicator');
      
      trolleyController.reset();
      
      expect(setPositionSpy).toHaveBeenCalledWith(trolleyController.position);
      expect(indicatorSpy).toHaveBeenCalledWith('none');
    });

    it('should dispose of trolley model resources', () => {
      const trolley = trolleyController.createTrolley();
      const disposeSpy = vi.spyOn(trolley, 'dispose');
      
      trolleyController.dispose();
      
      expect(disposeSpy).toHaveBeenCalled();
      expect(trolleyController.getTrolley()).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small delta times', () => {
      const initialZ = trolleyController.position.z;
      trolleyController.update(0.001);
      
      expect(trolleyController.position.z).toBeGreaterThan(initialZ);
    });

    it('should handle large delta times', () => {
      trolleyController.switchToTrack(5);
      trolleyController.update(2.0); // Larger than transition duration
      
      expect(trolleyController.isTransitioning).toBe(false);
      expect(trolleyController.currentTrack).toBe(5);
    });

    it('should handle multiple track switches during transition', () => {
      trolleyController.switchToTrack(3);
      trolleyController.update(0.5); // Partway through transition
      
      trolleyController.switchToTrack(5); // Switch target mid-transition
      
      expect(trolleyController.targetTrack).toBe(5);
      expect(trolleyController.isTransitioning).toBe(true);
      expect(trolleyController.transitionProgress).toBe(0); // Reset progress
    });
  });
});
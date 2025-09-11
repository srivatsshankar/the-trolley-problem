/**
 * Integration test for Obstacle system
 * Verifies requirements: 6.1, 6.2
 */

import { describe, test, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { ObstacleManager } from '../ObstacleManager';
import { GameConfigManager } from '../../models/GameConfig';
import { createObstacle, createRandomObstacle } from '../../models/Obstacle';

describe('Obstacle System Integration', () => {
  let scene: THREE.Scene;
  let configManager: GameConfigManager;
  let obstacleManager: ObstacleManager;

  beforeEach(() => {
    scene = new THREE.Scene();
    configManager = new GameConfigManager();
    obstacleManager = new ObstacleManager(scene, configManager);
  });

  test('should create obstacles with correct types', () => {
    const position = new THREE.Vector3(0, 0, 0);
    
    // Test rock obstacle creation
    const rockObstacle = createObstacle('rock', position);
    expect(rockObstacle.type).toBe('rock');
    expect(rockObstacle.position).toEqual(position);
    expect(rockObstacle.id).toBeGreaterThanOrEqual(0);
    
    // Test trolley obstacle creation
    const trolleyObstacle = createObstacle('trolley', position);
    expect(trolleyObstacle.type).toBe('trolley');
    expect(trolleyObstacle.position).toEqual(position);
    expect(trolleyObstacle.id).toBeGreaterThanOrEqual(0);
    
    // IDs should be unique
    expect(rockObstacle.id).not.toBe(trolleyObstacle.id);
  });

  test('should create random obstacles with valid types', () => {
    const position = new THREE.Vector3(1, 2, 3);
    const validTypes = ['rock', 'trolley'];
    
    // Create multiple random obstacles to test randomness
    for (let i = 0; i < 10; i++) {
      const obstacle = createRandomObstacle(position);
      expect(validTypes).toContain(obstacle.type);
      expect(obstacle.position).toEqual(position);
    }
  });

  test('should generate obstacles for track segments', () => {
    // Create mock track segment with 5 tracks
    const mockTracks = [];
    for (let i = 0; i < 5; i++) {
      mockTracks.push({
        id: i,
        position: new THREE.Vector3(i * 2, 0, 0),
        mesh: new THREE.Mesh()
      });
    }

    const mockSegment = {
      id: 0,
      tracks: mockTracks,
      position: new THREE.Vector3(0, 0, 0),
      startZ: 0,
      endZ: 10,
      isVisible: true,
      isGenerated: true
    };

    const result = obstacleManager.generateObstaclesForSegment(mockSegment, 0);

    // Should generate at least one obstacle for normal speed
    expect(result.obstacles.length).toBeGreaterThan(0);
    expect(result.barrierCount).toBeGreaterThan(0);
    expect(result.affectedTracks.length).toBe(result.obstacles.length);
    
    // All affected tracks should be valid track indices (0-4)
    result.affectedTracks.forEach(trackIndex => {
      expect(trackIndex).toBeGreaterThanOrEqual(0);
      expect(trackIndex).toBeLessThan(5);
    });
  });

  test('should handle obstacle collision detection', () => {
    const position = new THREE.Vector3(0, 0, 0);
    const obstacle = createObstacle('rock', position);

    // Test bounding box collision
    const overlappingBox = new THREE.Box3(
      new THREE.Vector3(-0.1, -0.1, -0.1),
      new THREE.Vector3(0.1, 0.1, 0.1)
    );
    
    const nonOverlappingBox = new THREE.Box3(
      new THREE.Vector3(10, 10, 10),
      new THREE.Vector3(11, 11, 11)
    );

    expect(obstacle.checkCollision(overlappingBox)).toBe(true);
    expect(obstacle.checkCollision(nonOverlappingBox)).toBe(false);

    // Test point collision
    const nearPoint = new THREE.Vector3(0, 0, 0);
    const farPoint = new THREE.Vector3(100, 100, 100);

    expect(obstacle.checkPointCollision(nearPoint, 1.0)).toBe(true);
    expect(obstacle.checkPointCollision(farPoint, 1.0)).toBe(false);
  });

  test('should manage obstacle lifecycle correctly', () => {
    const position = new THREE.Vector3(0, 0, 0);
    const obstacle = createObstacle('rock', position);

    // Initially not disposed
    expect(obstacle.isObstacleDisposed()).toBe(false);

    // Should be able to get properties
    expect(obstacle.getCenter()).toEqual(position);
    expect(obstacle.getSize()).toBeDefined();
    expect(obstacle.getGroup()).toBeDefined();

    // Should dispose properly
    obstacle.dispose();
    expect(obstacle.isObstacleDisposed()).toBe(true);

    // Should handle multiple dispose calls
    expect(() => obstacle.dispose()).not.toThrow();
  });

  test('should clone obstacles correctly', () => {
    const originalPosition = new THREE.Vector3(1, 2, 3);
    const newPosition = new THREE.Vector3(4, 5, 6);
    const original = createObstacle('trolley', originalPosition);

    const cloned = original.clone(newPosition);

    expect(cloned.type).toBe(original.type);
    expect(cloned.position).toEqual(newPosition);
    expect(cloned.id).not.toBe(original.id);
    expect(cloned.getSize()).toEqual(original.getSize());
  });

  test('should verify obstacle requirements are met', () => {
    // Requirement 6.1: Create Obstacle class with rock and trolley barrier types
    const rockObstacle = createObstacle('rock', new THREE.Vector3(0, 0, 0));
    const trolleyObstacle = createObstacle('trolley', new THREE.Vector3(0, 0, 0));
    
    expect(rockObstacle.type).toBe('rock');
    expect(trolleyObstacle.type).toBe('trolley');
    
    // Both should have proper 3D models (meshes)
    expect(rockObstacle.mesh).toBeDefined();
    expect(trolleyObstacle.mesh).toBeDefined();
    
    // Both should have materials
    expect(rockObstacle.mesh.material).toBeDefined();
    expect(trolleyObstacle.mesh.material).toBeDefined();

    // Requirement 6.2: Random obstacle type selection
    const randomObstacle = createRandomObstacle(new THREE.Vector3(0, 0, 0));
    expect(['rock', 'trolley']).toContain(randomObstacle.type);
  });

  test('should verify obstacle placement logic', () => {
    // Create mock segment for testing placement
    const mockTracks = [];
    for (let i = 0; i < 5; i++) {
      mockTracks.push({
        id: i,
        position: new THREE.Vector3(i * 2, 0, 0),
        mesh: new THREE.Mesh()
      });
    }

    const mockSegment = {
      id: 0,
      tracks: mockTracks,
      position: new THREE.Vector3(0, 0, 0),
      startZ: 0,
      endZ: 10,
      isVisible: true,
      isGenerated: true
    };

    // Generate obstacles for segment
    const result = obstacleManager.generateObstaclesForSegment(mockSegment, 0);

    // Should place exactly one barrier per segment initially (normal speed)
    expect(result.barrierCount).toBe(1);
    expect(result.obstacles.length).toBe(1);
    
    // Should track which tracks have obstacles
    const trackWithObstacle = result.affectedTracks[0];
    expect(obstacleManager.hasObstacleOnTrack(0, trackWithObstacle)).toBe(true);
    
    // Should be able to retrieve the obstacle
    const retrievedObstacle = obstacleManager.getObstacleAtTrack(0, trackWithObstacle);
    expect(retrievedObstacle).toBeDefined();
    expect(retrievedObstacle).toBe(result.obstacles[0]);
  });

  test('should handle obstacle cleanup', () => {
    // Create mock segment and generate obstacles
    const mockTracks = [];
    for (let i = 0; i < 5; i++) {
      mockTracks.push({
        id: i,
        position: new THREE.Vector3(i * 2, 0, 0),
        mesh: new THREE.Mesh()
      });
    }

    const mockSegment = {
      id: 0,
      tracks: mockTracks,
      position: new THREE.Vector3(0, 0, 0),
      startZ: 0,
      endZ: 10,
      isVisible: true,
      isGenerated: true
    };

    obstacleManager.generateObstaclesForSegment(mockSegment, 0);
    
    // Verify obstacles exist
    expect(obstacleManager.getObstaclesForSegment(0).length).toBeGreaterThan(0);
    
    // Remove obstacles
    obstacleManager.removeObstaclesForSegment(0);
    
    // Verify obstacles are removed
    expect(obstacleManager.getObstaclesForSegment(0).length).toBe(0);
  });
});
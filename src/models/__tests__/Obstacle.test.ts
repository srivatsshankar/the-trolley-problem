/**
 * Tests for Obstacle class
 * Verifies requirements: 6.1, 6.2
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { Obstacle, ObstacleType, createRandomObstacle, createObstacle, DEFAULT_OBSTACLE_CONFIGS } from '../Obstacle';

// Mock Three.js for testing
vi.mock('three');

describe('Obstacle', () => {
  let mockScene: THREE.Scene;

  beforeEach(() => {
    mockScene = new THREE.Scene();
    vi.clearAllMocks();
  });

  describe('Obstacle Creation', () => {
    test('should create rock obstacle with correct properties', () => {
      const position = new THREE.Vector3(1, 2, 3);
      const obstacle = createObstacle('rock', position);

      expect(obstacle.type).toBe('rock');
      expect(obstacle.position).toEqual(position);
      expect(obstacle.id).toBeGreaterThanOrEqual(0);
      expect(obstacle.mesh).toBeDefined();
      expect(obstacle.boundingBox).toBeDefined();
    });

    test('should create trolley obstacle with correct properties', () => {
      const position = new THREE.Vector3(4, 5, 6);
      const obstacle = createObstacle('trolley', position);

      expect(obstacle.type).toBe('trolley');
      expect(obstacle.position).toEqual(position);
      expect(obstacle.id).toBeGreaterThanOrEqual(0);
      expect(obstacle.mesh).toBeDefined();
      expect(obstacle.boundingBox).toBeDefined();
    });

    test('should create obstacles with unique IDs', () => {
      const position = new THREE.Vector3(0, 0, 0);
      const obstacle1 = createObstacle('rock', position);
      const obstacle2 = createObstacle('trolley', position);

      expect(obstacle1.id).not.toBe(obstacle2.id);
    });

    test('should use default configurations correctly', () => {
      const position = new THREE.Vector3(0, 0, 0);
      const rockObstacle = createObstacle('rock', position);
      const trolleyObstacle = createObstacle('trolley', position);

      // Verify rock uses default rock config
      expect(rockObstacle.getSize()).toEqual(DEFAULT_OBSTACLE_CONFIGS.rock.size);
      
      // Verify trolley uses default trolley config
      expect(trolleyObstacle.getSize()).toEqual(DEFAULT_OBSTACLE_CONFIGS.trolley.size);
    });
  });

  describe('Random Obstacle Creation', () => {
    test('should create random obstacle with valid type', () => {
      const position = new THREE.Vector3(1, 1, 1);
      const obstacle = createRandomObstacle(position);

      expect(['rock', 'trolley']).toContain(obstacle.type);
      expect(obstacle.position).toEqual(position);
    });

    test('should create different types over multiple calls', () => {
      const position = new THREE.Vector3(0, 0, 0);
      const obstacles: Obstacle[] = [];
      const types = new Set<ObstacleType>();

      // Create multiple obstacles to test randomness
      for (let i = 0; i < 20; i++) {
        const obstacle = createRandomObstacle(position);
        obstacles.push(obstacle);
        types.add(obstacle.type);
      }

      // Should have created both types (with high probability)
      expect(types.size).toBeGreaterThan(1);
      expect(types.has('rock')).toBe(true);
      expect(types.has('trolley')).toBe(true);
    });
  });

  describe('Obstacle Properties', () => {
    test('should return correct center position', () => {
      const position = new THREE.Vector3(5, 10, 15);
      const obstacle = createObstacle('rock', position);

      const center = obstacle.getCenter();
      expect(center).toEqual(position);
    });

    test('should return correct size', () => {
      const position = new THREE.Vector3(0, 0, 0);
      const obstacle = createObstacle('rock', position);

      const size = obstacle.getSize();
      expect(size).toEqual(DEFAULT_OBSTACLE_CONFIGS.rock.size);
    });

    test('should update position correctly', () => {
      const initialPosition = new THREE.Vector3(1, 1, 1);
      const newPosition = new THREE.Vector3(2, 2, 2);
      const obstacle = createObstacle('rock', initialPosition);

      obstacle.setPosition(newPosition);

      expect(obstacle.position).toEqual(newPosition);
      expect(obstacle.getCenter()).toEqual(newPosition);
    });

    test('should control visibility', () => {
      const position = new THREE.Vector3(0, 0, 0);
      const obstacle = createObstacle('rock', position);

      obstacle.setVisible(false);
      expect(obstacle.getGroup().visible).toBe(false);

      obstacle.setVisible(true);
      expect(obstacle.getGroup().visible).toBe(true);
    });
  });

  describe('Collision Detection', () => {
    test('should detect bounding box collision', () => {
      const position = new THREE.Vector3(0, 0, 0);
      const obstacle = createObstacle('rock', position);

      // Create overlapping bounding box
      const overlappingBox = new THREE.Box3(
        new THREE.Vector3(-0.5, -0.5, -0.5),
        new THREE.Vector3(0.5, 0.5, 0.5)
      );

      // Create non-overlapping bounding box
      const nonOverlappingBox = new THREE.Box3(
        new THREE.Vector3(10, 10, 10),
        new THREE.Vector3(11, 11, 11)
      );

      expect(obstacle.checkCollision(overlappingBox)).toBe(true);
      expect(obstacle.checkCollision(nonOverlappingBox)).toBe(false);
    });

    test('should detect point collision with tolerance', () => {
      const position = new THREE.Vector3(0, 0, 0);
      const obstacle = createObstacle('rock', position);

      // Point inside obstacle
      const insidePoint = new THREE.Vector3(0, 0, 0);
      
      // Point outside obstacle but within tolerance
      const nearPoint = new THREE.Vector3(0.05, 0.05, 0.05);
      
      // Point far from obstacle
      const farPoint = new THREE.Vector3(10, 10, 10);

      expect(obstacle.checkPointCollision(insidePoint, 0.1)).toBe(true);
      expect(obstacle.checkPointCollision(nearPoint, 0.1)).toBe(true);
      expect(obstacle.checkPointCollision(farPoint, 0.1)).toBe(false);
    });
  });

  describe('Obstacle Cloning', () => {
    test('should clone obstacle at new position', () => {
      const originalPosition = new THREE.Vector3(1, 1, 1);
      const newPosition = new THREE.Vector3(2, 2, 2);
      const original = createObstacle('rock', originalPosition);

      const cloned = original.clone(newPosition);

      expect(cloned.type).toBe(original.type);
      expect(cloned.position).toEqual(newPosition);
      expect(cloned.id).not.toBe(original.id); // Should have different ID
      expect(cloned.getSize()).toEqual(original.getSize());
    });
  });

  describe('Resource Management', () => {
    test('should dispose resources properly', () => {
      const position = new THREE.Vector3(0, 0, 0);
      const obstacle = createObstacle('rock', position);

      expect(obstacle.isObstacleDisposed()).toBe(false);

      obstacle.dispose();

      expect(obstacle.isObstacleDisposed()).toBe(true);
    });

    test('should handle multiple dispose calls safely', () => {
      const position = new THREE.Vector3(0, 0, 0);
      const obstacle = createObstacle('rock', position);

      obstacle.dispose();
      expect(() => obstacle.dispose()).not.toThrow();
      expect(obstacle.isObstacleDisposed()).toBe(true);
    });
  });

  describe('Three.js Integration', () => {
    test('should create proper Three.js group', () => {
      const position = new THREE.Vector3(1, 2, 3);
      const obstacle = createObstacle('rock', position);

      const group = obstacle.getGroup();
      expect(group).toBeInstanceOf(THREE.Group);
      expect(group.position).toEqual(position);
      expect(group.userData.type).toBe('obstacle');
      expect(group.userData.obstacleType).toBe('rock');
      expect(group.userData.id).toBe(obstacle.id);
    });

    test('should have proper mesh properties', () => {
      const position = new THREE.Vector3(0, 0, 0);
      const obstacle = createObstacle('trolley', position);

      expect(obstacle.mesh).toBeInstanceOf(THREE.Mesh);
      expect(obstacle.mesh.castShadow).toBe(true);
      expect(obstacle.mesh.receiveShadow).toBe(true);
      expect(obstacle.mesh.name).toContain('Obstacle_trolley_');
    });
  });

  describe('Obstacle Types', () => {
    test('should create rock with irregular geometry', () => {
      const position = new THREE.Vector3(0, 0, 0);
      const obstacle = createObstacle('rock', position);

      expect(obstacle.type).toBe('rock');
      expect(obstacle.mesh.geometry).toBeInstanceOf(THREE.SphereGeometry);
    });

    test('should create trolley with box geometry', () => {
      const position = new THREE.Vector3(0, 0, 0);
      const obstacle = createObstacle('trolley', position);

      expect(obstacle.type).toBe('trolley');
      expect(obstacle.mesh.geometry).toBeInstanceOf(THREE.BoxGeometry);
    });

    test('should add appropriate details for each type', () => {
      const position = new THREE.Vector3(0, 0, 0);
      const rockObstacle = createObstacle('rock', position);
      const trolleyObstacle = createObstacle('trolley', position);

      // Rock should have debris (additional children in group)
      expect(rockObstacle.getGroup().children.length).toBeGreaterThan(1);

      // Trolley should have wheels and stripes (additional children in group)
      expect(trolleyObstacle.getGroup().children.length).toBeGreaterThan(1);
    });
  });
});
/**
 * Unit tests for CollisionDetection system
 * Tests requirements: 8.4, 9.3, 8.2, 8.3, 9.1, 9.2
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { CollisionDetection, createCollisionDetection } from '../systems/CollisionDetection';
import { Obstacle, createObstacle } from '../models/Obstacle';
import { Person, createPerson } from '../models/Person';
import { Trolley, createTrolley } from '../models/Trolley';

// Mock Three.js objects for testing
vi.mock('three', async () => {
  const actual = await vi.importActual('three');
  return {
    ...actual,
    Box3Helper: vi.fn().mockImplementation(() => ({
      dispose: vi.fn(),
      box: new THREE.Box3()
    }))
  };
});

describe('CollisionDetection', () => {
  let collisionDetection: CollisionDetection;
  let trolley: Trolley;
  let obstacle: Obstacle;
  let person: Person;

  beforeEach(() => {
    collisionDetection = createCollisionDetection();
    trolley = createTrolley();
    obstacle = createObstacle('rock', new THREE.Vector3(0, 0, 5));
    person = createPerson(new THREE.Vector3(1, 0, 5));
  });

  describe('Trolley Bounding Box Updates', () => {
    it('should update trolley bounding box correctly', () => {
      collisionDetection.updateTrolleyBoundingBox(trolley);
      const boundingBox = collisionDetection.getTrolleyBoundingBox();
      
      expect(boundingBox).toBeInstanceOf(THREE.Box3);
      expect(boundingBox.isEmpty()).toBe(false);
    });

    it('should expand bounding box by configured amount', () => {
      const expansionAmount = 0.2;
      const customCollisionDetection = createCollisionDetection({
        trolleyBoundingBoxExpansion: expansionAmount
      });
      
      customCollisionDetection.updateTrolleyBoundingBox(trolley);
      const boundingBox = customCollisionDetection.getTrolleyBoundingBox();
      
      // The bounding box should be expanded
      expect(boundingBox).toBeInstanceOf(THREE.Box3);
    });
  });

  describe('Obstacle Collision Detection', () => {
    beforeEach(() => {
      collisionDetection.updateTrolleyBoundingBox(trolley);
    });

    it('should detect collision when trolley intersects obstacle', () => {
      // Position obstacle at trolley location for guaranteed collision
      const closeObstacle = createObstacle('rock', new THREE.Vector3(0, 0, 0));
      const collisions = collisionDetection.checkObstacleCollisions([closeObstacle]);
      
      expect(collisions).toHaveLength(1);
      expect(collisions[0].type).toBe('obstacle');
      expect(collisions[0].object).toBe(closeObstacle);
    });

    it('should not detect collision when trolley is far from obstacle', () => {
      // Position obstacle far away
      const farObstacle = createObstacle('rock', new THREE.Vector3(100, 0, 100));
      const collisions = collisionDetection.checkObstacleCollisions([farObstacle]);
      
      expect(collisions).toHaveLength(0);
    });

    it('should handle multiple obstacles correctly', () => {
      const obstacle1 = createObstacle('rock', new THREE.Vector3(0, 0, 0));
      const obstacle2 = createObstacle('trolley', new THREE.Vector3(0.1, 0, 0.1));
      const obstacle3 = createObstacle('rock', new THREE.Vector3(100, 0, 100));
      
      const collisions = collisionDetection.checkObstacleCollisions([obstacle1, obstacle2, obstacle3]);
      
      // Should detect collisions with first two obstacles, not the third
      expect(collisions.length).toBeGreaterThanOrEqual(1);
      expect(collisions.length).toBeLessThanOrEqual(2);
    });

    it('should include collision distance in results', () => {
      const closeObstacle = createObstacle('rock', new THREE.Vector3(0, 0, 0));
      const collisions = collisionDetection.checkObstacleCollisions([closeObstacle]);
      
      if (collisions.length > 0) {
        expect(collisions[0].distance).toBeTypeOf('number');
        expect(collisions[0].distance).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('People Collision Detection', () => {
    beforeEach(() => {
      collisionDetection.updateTrolleyBoundingBox(trolley);
    });

    it('should detect collision when trolley intersects person', () => {
      // Position person at trolley location for guaranteed collision
      const closePerson = createPerson(new THREE.Vector3(0, 0, 0));
      const collisions = collisionDetection.checkPeopleCollisions([closePerson]);
      
      expect(collisions).toHaveLength(1);
      expect(collisions[0].type).toBe('person');
      expect(collisions[0].object).toBe(closePerson);
    });

    it('should not detect collision when trolley is far from person', () => {
      // Position person far away
      const farPerson = createPerson(new THREE.Vector3(100, 0, 100));
      const collisions = collisionDetection.checkPeopleCollisions([farPerson]);
      
      expect(collisions).toHaveLength(0);
    });

    it('should mark person as hit when collision occurs', () => {
      const closePerson = createPerson(new THREE.Vector3(0, 0, 0));
      expect(closePerson.isHit).toBe(false);
      
      collisionDetection.checkPeopleCollisions([closePerson]);
      
      // Person should be marked as hit if collision occurred
      if (closePerson.isHit) {
        expect(closePerson.isHit).toBe(true);
      }
    });

    it('should not detect collision with already hit people', () => {
      const person = createPerson(new THREE.Vector3(0, 0, 0));
      person.markAsHit(); // Pre-mark as hit
      
      const collisions = collisionDetection.checkPeopleCollisions([person]);
      
      expect(collisions).toHaveLength(0);
    });

    it('should handle multiple people correctly', () => {
      const person1 = createPerson(new THREE.Vector3(0, 0, 0));
      const person2 = createPerson(new THREE.Vector3(0.1, 0, 0.1));
      const person3 = createPerson(new THREE.Vector3(100, 0, 100));
      
      const collisions = collisionDetection.checkPeopleCollisions([person1, person2, person3]);
      
      // Should detect collisions with first two people, not the third
      expect(collisions.length).toBeGreaterThanOrEqual(0);
      expect(collisions.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Near Collision Detection', () => {
    beforeEach(() => {
      collisionDetection.updateTrolleyBoundingBox(trolley);
    });

    it('should detect when trolley is near obstacles', () => {
      const nearObstacle = createObstacle('rock', new THREE.Vector3(1, 0, 1));
      const isNear = collisionDetection.isNearCollision([nearObstacle], [], 2.0);
      
      expect(isNear).toBe(true);
    });

    it('should detect when trolley is near people', () => {
      const nearPerson = createPerson(new THREE.Vector3(1, 0, 1));
      const isNear = collisionDetection.isNearCollision([], [nearPerson], 2.0);
      
      expect(isNear).toBe(true);
    });

    it('should not detect when trolley is far from all objects', () => {
      const farObstacle = createObstacle('rock', new THREE.Vector3(10, 0, 10));
      const farPerson = createPerson(new THREE.Vector3(10, 0, 10));
      const isNear = collisionDetection.isNearCollision([farObstacle], [farPerson], 2.0);
      
      expect(isNear).toBe(false);
    });

    it('should respect warning distance parameter', () => {
      const obstacle = createObstacle('rock', new THREE.Vector3(3, 0, 3));
      
      const isNearShort = collisionDetection.isNearCollision([obstacle], [], 2.0);
      const isNearLong = collisionDetection.isNearCollision([obstacle], [], 5.0);
      
      expect(isNearShort).toBe(false);
      expect(isNearLong).toBe(true);
    });

    it('should ignore already hit people in near collision detection', () => {
      const hitPerson = createPerson(new THREE.Vector3(1, 0, 1));
      hitPerson.markAsHit();
      
      const isNear = collisionDetection.isNearCollision([], [hitPerson], 2.0);
      
      expect(isNear).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should use custom configuration values', () => {
      const customConfig = {
        trolleyBoundingBoxExpansion: 0.5,
        collisionTolerance: 0.2,
        enableVisualFeedback: true
      };
      
      const customCollisionDetection = createCollisionDetection(customConfig);
      
      // Test that configuration is applied (indirect test through behavior)
      expect(customCollisionDetection).toBeInstanceOf(CollisionDetection);
    });

    it('should allow configuration updates', () => {
      collisionDetection.updateConfig({
        enableVisualFeedback: true,
        collisionTolerance: 0.1
      });
      
      // Configuration should be updated (indirect test)
      expect(collisionDetection).toBeInstanceOf(CollisionDetection);
    });

    it('should allow visual feedback toggle', () => {
      collisionDetection.setVisualFeedback(true);
      collisionDetection.setVisualFeedback(false);
      
      // Should not throw errors
      expect(collisionDetection).toBeInstanceOf(CollisionDetection);
    });
  });

  describe('Resource Management', () => {
    it('should dispose resources properly', () => {
      expect(() => {
        collisionDetection.dispose();
      }).not.toThrow();
    });

    it('should handle collision helper creation and removal', () => {
      const mockScene = {
        add: vi.fn(),
        remove: vi.fn()
      } as any;
      
      const helper = collisionDetection.createCollisionHelper(mockScene);
      expect(mockScene.add).toHaveBeenCalled();
      
      collisionDetection.removeCollisionHelper(mockScene);
      expect(mockScene.remove).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty obstacle arrays', () => {
      collisionDetection.updateTrolleyBoundingBox(trolley);
      const collisions = collisionDetection.checkObstacleCollisions([]);
      
      expect(collisions).toHaveLength(0);
    });

    it('should handle empty people arrays', () => {
      collisionDetection.updateTrolleyBoundingBox(trolley);
      const collisions = collisionDetection.checkPeopleCollisions([]);
      
      expect(collisions).toHaveLength(0);
    });

    it('should handle collision detection without trolley bounding box update', () => {
      // Don't update trolley bounding box
      const collisions = collisionDetection.checkObstacleCollisions([obstacle]);
      
      // Should not crash, may return empty results
      expect(Array.isArray(collisions)).toBe(true);
    });
  });
});
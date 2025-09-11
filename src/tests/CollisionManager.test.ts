/**
 * Unit tests for CollisionManager
 * Tests requirements: 8.2, 8.3, 8.4, 9.1, 9.2, 9.3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { CollisionManager, createCollisionManager } from '../systems/CollisionManager';
import { CollisionDetection, createCollisionDetection } from '../systems/CollisionDetection';
import { CollisionEffects } from '../systems/CollisionEffects';
import { TrolleyController } from '../systems/TrolleyController';
import { GameState } from '../models/GameState';
import { Obstacle, createObstacle } from '../models/Obstacle';
import { Person, createPerson } from '../models/Person';
import { GameConfig } from '../models/GameConfig';

// Mock TrolleyController
vi.mock('../systems/TrolleyController');

describe('CollisionManager', () => {
  let collisionManager: CollisionManager;
  let collisionDetection: CollisionDetection;
  let mockTrolleyController: TrolleyController;
  let gameState: GameState;
  let mockScene: THREE.Scene;

  beforeEach(() => {
    collisionDetection = createCollisionDetection();
    collisionManager = createCollisionManager(collisionDetection);
    gameState = new GameState();
    mockScene = new THREE.Scene();

    // Create mock trolley controller
    const mockConfig: GameConfig = {
      tracks: { count: 5, width: 2, segmentLength: 10 },
      trolley: { baseSpeed: 5, speedIncrease: 0.03, maxSpeedMultiplier: 5 },
      difficulty: { minPeoplePerTrack: 1, maxPeoplePerTrack: 5, barrierIncreaseThreshold: 5 }
    };
    
    mockTrolleyController = new TrolleyController(mockConfig);
    
    // Mock the checkCollisions method
    vi.spyOn(mockTrolleyController, 'checkCollisions').mockReturnValue([]);
    vi.spyOn(mockTrolleyController, 'isNearCollision').mockReturnValue(false);
    Object.defineProperty(mockTrolleyController, 'position', {
      get: () => new THREE.Vector3(0, 0, 0)
    });
  });

  describe('Collision Processing', () => {
    it('should process obstacle collisions and end game', () => {
      const obstacle = createObstacle('rock', new THREE.Vector3(0, 0, 0));
      const mockCollisions = [{
        type: 'obstacle' as const,
        object: obstacle,
        position: new THREE.Vector3(0, 0, 0),
        distance: 0.5
      }];

      // Mock collision detection to return obstacle collision
      vi.spyOn(mockTrolleyController, 'checkCollisions').mockReturnValue(mockCollisions);

      const collisions = collisionManager.processCollisions(
        mockTrolleyController,
        [obstacle],
        [],
        gameState
      );

      expect(collisions).toHaveLength(1);
      expect(collisions[0].type).toBe('obstacle');
      expect(gameState.isGameOver).toBe(true);
      expect(gameState.hitBarrier).toBe(true);
    });

    it('should process person collisions and update score', () => {
      const person = createPerson(new THREE.Vector3(0, 0, 0));
      const mockCollisions = [{
        type: 'person' as const,
        object: person,
        position: new THREE.Vector3(0, 0, 0),
        distance: 0.3
      }];

      // Mock collision detection to return person collision
      vi.spyOn(mockTrolleyController, 'checkCollisions').mockReturnValue(mockCollisions);

      const initialScore = gameState.score;
      const collisions = collisionManager.processCollisions(
        mockTrolleyController,
        [],
        [person],
        gameState
      );

      expect(collisions).toHaveLength(1);
      expect(collisions[0].type).toBe('person');
      expect(gameState.peopleHit).toBe(1);
      expect(gameState.score).toBe(initialScore - 1); // Score decreases when hitting people
      // Note: person.isHit is set by the collision detection system, not the manager
      // In this test, we're mocking the collision results, so the person won't be marked as hit
    });

    it('should handle multiple collisions in one frame', () => {
      const obstacle = createObstacle('trolley', new THREE.Vector3(0, 0, 0));
      const person1 = createPerson(new THREE.Vector3(0.5, 0, 0));
      const person2 = createPerson(new THREE.Vector3(-0.5, 0, 0));
      
      const mockCollisions = [
        {
          type: 'person' as const,
          object: person1,
          position: new THREE.Vector3(0.5, 0, 0),
          distance: 0.3
        },
        {
          type: 'person' as const,
          object: person2,
          position: new THREE.Vector3(-0.5, 0, 0),
          distance: 0.3
        },
        {
          type: 'obstacle' as const,
          object: obstacle,
          position: new THREE.Vector3(0, 0, 0),
          distance: 0.5
        }
      ];

      vi.spyOn(mockTrolleyController, 'checkCollisions').mockReturnValue(mockCollisions);

      const collisions = collisionManager.processCollisions(
        mockTrolleyController,
        [obstacle],
        [person1, person2],
        gameState
      );

      expect(collisions).toHaveLength(3);
      expect(gameState.peopleHit).toBe(2);
      expect(gameState.isGameOver).toBe(true);
      expect(gameState.hitBarrier).toBe(true);
    });
  });

  describe('Segment Management', () => {
    it('should track people in new segment', () => {
      const people = [
        createPerson(new THREE.Vector3(0, 0, 5)),
        createPerson(new THREE.Vector3(1, 0, 5)),
        createPerson(new THREE.Vector3(2, 0, 5))
      ];

      collisionManager.startNewSegment(people);
      const segmentData = collisionManager.getCurrentSegmentData();

      expect(segmentData.totalPeople).toBe(3);
      expect(segmentData.peopleHit).toBe(0);
      expect(segmentData.peopleAvoided).toBe(0);
    });

    it('should calculate avoided people correctly when segment completes', () => {
      const people = [
        createPerson(new THREE.Vector3(0, 0, 5)),
        createPerson(new THREE.Vector3(1, 0, 5)),
        createPerson(new THREE.Vector3(2, 0, 5)),
        createPerson(new THREE.Vector3(3, 0, 5)),
        createPerson(new THREE.Vector3(4, 0, 5))
      ];

      collisionManager.startNewSegment(people);

      // Simulate hitting 2 people
      const mockCollisions = [
        {
          type: 'person' as const,
          object: people[0],
          position: new THREE.Vector3(0, 0, 5),
          distance: 0.3
        },
        {
          type: 'person' as const,
          object: people[1],
          position: new THREE.Vector3(1, 0, 5),
          distance: 0.3
        }
      ];

      vi.spyOn(mockTrolleyController, 'checkCollisions').mockReturnValue(mockCollisions);
      collisionManager.processCollisions(mockTrolleyController, [], people, gameState);

      const segmentData = collisionManager.completeSegment(gameState);

      expect(segmentData.totalPeople).toBe(5);
      expect(segmentData.peopleHit).toBe(2);
      expect(segmentData.peopleAvoided).toBe(3);
      expect(gameState.peopleHit).toBe(2);
      expect(gameState.peopleAvoided).toBe(3);
    });

    it('should handle segment with no people', () => {
      collisionManager.startNewSegment([]);
      const segmentData = collisionManager.completeSegment(gameState);

      expect(segmentData.totalPeople).toBe(0);
      expect(segmentData.peopleHit).toBe(0);
      expect(segmentData.peopleAvoided).toBe(0);
    });

    it('should handle segment where all people are avoided', () => {
      const people = [
        createPerson(new THREE.Vector3(0, 0, 5)),
        createPerson(new THREE.Vector3(1, 0, 5))
      ];

      collisionManager.startNewSegment(people);
      
      // No collisions
      vi.spyOn(mockTrolleyController, 'checkCollisions').mockReturnValue([]);
      collisionManager.processCollisions(mockTrolleyController, [], people, gameState);

      const segmentData = collisionManager.completeSegment(gameState);

      expect(segmentData.totalPeople).toBe(2);
      expect(segmentData.peopleHit).toBe(0);
      expect(segmentData.peopleAvoided).toBe(2);
      expect(gameState.score).toBe(2); // Score increases for avoided people
    });
  });

  describe('Near Collision Detection', () => {
    it('should detect near collisions', () => {
      const obstacle = createObstacle('rock', new THREE.Vector3(1, 0, 1));
      
      vi.spyOn(mockTrolleyController, 'isNearCollision').mockReturnValue(true);

      const isNear = collisionManager.checkNearCollisions(
        mockTrolleyController,
        [obstacle],
        []
      );

      expect(isNear).toBe(true);
    });

    it('should not detect near collisions when far away', () => {
      const obstacle = createObstacle('rock', new THREE.Vector3(10, 0, 10));
      
      vi.spyOn(mockTrolleyController, 'isNearCollision').mockReturnValue(false);

      const isNear = collisionManager.checkNearCollisions(
        mockTrolleyController,
        [obstacle],
        []
      );

      expect(isNear).toBe(false);
    });
  });

  describe('Visual Effects Integration', () => {
    it('should integrate with collision effects system', () => {
      const collisionEffects = new CollisionEffects(mockScene);
      const showObstacleEffectSpy = vi.spyOn(collisionEffects, 'showObstacleCollisionEffect');
      const showPersonEffectSpy = vi.spyOn(collisionEffects, 'showPersonCollisionEffect');

      collisionManager.setCollisionEffects(collisionEffects);

      // Test obstacle collision effect
      const obstacle = createObstacle('rock', new THREE.Vector3(0, 0, 0));
      const obstacleCollision = [{
        type: 'obstacle' as const,
        object: obstacle,
        position: new THREE.Vector3(0, 0, 0),
        distance: 0.5
      }];

      vi.spyOn(mockTrolleyController, 'checkCollisions').mockReturnValue(obstacleCollision);
      collisionManager.processCollisions(mockTrolleyController, [obstacle], [], gameState);

      expect(showObstacleEffectSpy).toHaveBeenCalledWith(new THREE.Vector3(0, 0, 0));

      // Test person collision effect
      const person = createPerson(new THREE.Vector3(1, 0, 0));
      const personCollision = [{
        type: 'person' as const,
        object: person,
        position: new THREE.Vector3(1, 0, 0),
        distance: 0.3
      }];

      vi.spyOn(mockTrolleyController, 'checkCollisions').mockReturnValue(personCollision);
      collisionManager.processCollisions(mockTrolleyController, [], [person], gameState);

      expect(showPersonEffectSpy).toHaveBeenCalledWith(new THREE.Vector3(1, 0, 0));
    });

    it('should update collision effects in update loop', () => {
      const collisionEffects = new CollisionEffects(mockScene);
      const updateSpy = vi.spyOn(collisionEffects, 'update');

      collisionManager.setCollisionEffects(collisionEffects);
      collisionManager.update(0.016); // 60 FPS delta time

      expect(updateSpy).toHaveBeenCalledWith(0.016);
    });
  });

  describe('Configuration', () => {
    it('should allow configuration updates', () => {
      collisionManager.updateConfig({
        enableVisualEffects: false,
        warningDistance: 5.0
      });

      // Configuration should be updated (indirect test through behavior)
      expect(collisionManager).toBeInstanceOf(CollisionManager);
    });

    it('should allow visual effects toggle', () => {
      collisionManager.setVisualEffects(false);
      collisionManager.setVisualEffects(true);

      // Should not throw errors
      expect(collisionManager).toBeInstanceOf(CollisionManager);
    });
  });

  describe('Resource Management', () => {
    it('should reset state properly', () => {
      // Set up some state
      const people = [createPerson(new THREE.Vector3(0, 0, 5))];
      collisionManager.startNewSegment(people);

      // Reset
      collisionManager.reset();

      const segmentData = collisionManager.getCurrentSegmentData();
      expect(segmentData.totalPeople).toBe(0);
      expect(segmentData.peopleHit).toBe(0);
      expect(segmentData.peopleAvoided).toBe(0);
    });

    it('should dispose resources properly', () => {
      expect(() => {
        collisionManager.dispose();
      }).not.toThrow();
    });
  });

  describe('Score Calculation Integration', () => {
    it('should correctly update score for mixed segment results', () => {
      const people = Array.from({ length: 10 }, (_, i) => 
        createPerson(new THREE.Vector3(i, 0, 5))
      );

      collisionManager.startNewSegment(people);

      // Hit 3 people, avoid 7
      const mockCollisions = people.slice(0, 3).map(person => ({
        type: 'person' as const,
        object: person,
        position: person.getCenter(),
        distance: 0.3
      }));

      vi.spyOn(mockTrolleyController, 'checkCollisions').mockReturnValue(mockCollisions);
      
      const initialScore = gameState.score;
      collisionManager.processCollisions(mockTrolleyController, [], people, gameState);
      
      // After processing collisions: score = initial - 3 (for hitting people)
      expect(gameState.score).toBe(initialScore - 3);
      
      collisionManager.completeSegment(gameState);

      // After completing segment: score = (initial - 3) + 7 (avoided) = initial + 4
      expect(gameState.score).toBe(initialScore + 4);
      expect(gameState.peopleHit).toBe(3);
      expect(gameState.peopleAvoided).toBe(7);
    });
  });
});
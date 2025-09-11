/**
 * Unit tests for GameState collision processing methods
 * Tests requirements: 8.2, 8.3, 8.4, 9.1, 9.2, 9.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../models/GameState';

describe('GameState Collision Processing', () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = new GameState();
  });

  describe('processCollisionResults', () => {
    it('should process obstacle collisions and end game', () => {
      const collisionResults = [
        { type: 'obstacle' as const, object: {} }
      ];

      expect(gameState.isGameOver).toBe(false);
      expect(gameState.hitBarrier).toBe(false);

      gameState.processCollisionResults(collisionResults);

      expect(gameState.isGameOver).toBe(true);
      expect(gameState.hitBarrier).toBe(true);
    });

    it('should process person collisions and update score', () => {
      const collisionResults = [
        { type: 'person' as const, object: {} },
        { type: 'person' as const, object: {} },
        { type: 'person' as const, object: {} }
      ];

      const initialScore = gameState.score;
      const initialPeopleHit = gameState.peopleHit;

      gameState.processCollisionResults(collisionResults);

      expect(gameState.peopleHit).toBe(initialPeopleHit + 3);
      expect(gameState.score).toBe(initialScore - 3); // Score decreases for people hit
      expect(gameState.isGameOver).toBe(false); // Game doesn't end for person collisions
    });

    it('should handle mixed collision results', () => {
      const collisionResults = [
        { type: 'person' as const, object: {} },
        { type: 'person' as const, object: {} },
        { type: 'obstacle' as const, object: {} }
      ];

      const initialScore = gameState.score;

      gameState.processCollisionResults(collisionResults);

      expect(gameState.peopleHit).toBe(2);
      expect(gameState.score).toBe(initialScore - 2);
      expect(gameState.isGameOver).toBe(true);
      expect(gameState.hitBarrier).toBe(true);
    });

    it('should handle empty collision results', () => {
      const initialState = {
        score: gameState.score,
        peopleHit: gameState.peopleHit,
        isGameOver: gameState.isGameOver,
        hitBarrier: gameState.hitBarrier
      };

      gameState.processCollisionResults([]);

      expect(gameState.score).toBe(initialState.score);
      expect(gameState.peopleHit).toBe(initialState.peopleHit);
      expect(gameState.isGameOver).toBe(initialState.isGameOver);
      expect(gameState.hitBarrier).toBe(initialState.hitBarrier);
    });
  });

  describe('processSegmentCompletion', () => {
    it('should calculate avoided people correctly', () => {
      const totalPeople = 10;
      const peopleHit = 3;
      const expectedAvoided = 7;

      const initialScore = gameState.score;
      const initialPeopleAvoided = gameState.peopleAvoided;
      const initialSegment = gameState.currentSegment;

      gameState.processSegmentCompletion(totalPeople, peopleHit);

      expect(gameState.peopleAvoided).toBe(initialPeopleAvoided + expectedAvoided);
      expect(gameState.score).toBe(initialScore + expectedAvoided); // Score increases for avoided people
      expect(gameState.currentSegment).toBe(initialSegment + 1);
    });

    it('should handle segment where all people are hit', () => {
      const totalPeople = 5;
      const peopleHit = 5;
      const expectedAvoided = 0;

      const initialScore = gameState.score;
      const initialPeopleAvoided = gameState.peopleAvoided;

      gameState.processSegmentCompletion(totalPeople, peopleHit);

      expect(gameState.peopleAvoided).toBe(initialPeopleAvoided + expectedAvoided);
      expect(gameState.score).toBe(initialScore); // No score change if no one avoided
    });

    it('should handle segment where all people are avoided', () => {
      const totalPeople = 8;
      const peopleHit = 0;
      const expectedAvoided = 8;

      const initialScore = gameState.score;
      const initialPeopleAvoided = gameState.peopleAvoided;

      gameState.processSegmentCompletion(totalPeople, peopleHit);

      expect(gameState.peopleAvoided).toBe(initialPeopleAvoided + expectedAvoided);
      expect(gameState.score).toBe(initialScore + expectedAvoided);
    });

    it('should handle segment with no people', () => {
      const totalPeople = 0;
      const peopleHit = 0;
      const expectedAvoided = 0;

      const initialScore = gameState.score;
      const initialPeopleAvoided = gameState.peopleAvoided;
      const initialSegment = gameState.currentSegment;

      gameState.processSegmentCompletion(totalPeople, peopleHit);

      expect(gameState.peopleAvoided).toBe(initialPeopleAvoided + expectedAvoided);
      expect(gameState.score).toBe(initialScore);
      expect(gameState.currentSegment).toBe(initialSegment + 1);
    });

    it('should handle invalid input gracefully', () => {
      // More people hit than total people (shouldn't happen in normal gameplay)
      const totalPeople = 3;
      const peopleHit = 5;
      const expectedAvoided = -2; // This would be negative

      const initialScore = gameState.score;
      const initialPeopleAvoided = gameState.peopleAvoided;

      gameState.processSegmentCompletion(totalPeople, peopleHit);

      expect(gameState.peopleAvoided).toBe(initialPeopleAvoided + expectedAvoided);
      expect(gameState.score).toBe(initialScore + expectedAvoided);
    });
  });

  describe('Score Calculation Integration', () => {
    it('should correctly calculate score through multiple segments', () => {
      // Segment 1: 10 people, hit 2, avoid 8
      gameState.processSegmentCompletion(10, 2);
      expect(gameState.score).toBe(8);
      expect(gameState.peopleHit).toBe(0); // processSegmentCompletion doesn't update peopleHit
      expect(gameState.peopleAvoided).toBe(8);

      // Segment 2: 5 people, hit 1, avoid 4
      gameState.processSegmentCompletion(5, 1);
      expect(gameState.score).toBe(12); // 8 + 4
      expect(gameState.peopleAvoided).toBe(12); // 8 + 4

      // Segment 3: 8 people, hit 8, avoid 0
      gameState.processSegmentCompletion(8, 8);
      expect(gameState.score).toBe(12); // No change
      expect(gameState.peopleAvoided).toBe(12); // No change
    });

    it('should handle collision processing and segment completion together', () => {
      // First, process some collisions during gameplay
      const collisionResults = [
        { type: 'person' as const, object: {} },
        { type: 'person' as const, object: {} }
      ];
      gameState.processCollisionResults(collisionResults);

      expect(gameState.score).toBe(-2); // -2 for hitting people
      expect(gameState.peopleHit).toBe(2);

      // Then complete the segment (total 5 people, 2 hit during gameplay)
      gameState.processSegmentCompletion(5, 2);

      expect(gameState.score).toBe(1); // -2 + 3 (avoided)
      expect(gameState.peopleHit).toBe(2); // Unchanged by segment completion
      expect(gameState.peopleAvoided).toBe(3);
    });
  });

  describe('Game Over Scenarios', () => {
    it('should end game immediately on obstacle collision', () => {
      // Set up some positive score first
      gameState.processSegmentCompletion(10, 0); // Avoid all 10 people
      expect(gameState.score).toBe(10);
      expect(gameState.isGameOver).toBe(false);

      // Hit obstacle
      const collisionResults = [
        { type: 'obstacle' as const, object: {} }
      ];
      gameState.processCollisionResults(collisionResults);

      expect(gameState.isGameOver).toBe(true);
      expect(gameState.hitBarrier).toBe(true);
      expect(gameState.score).toBe(10); // Score unchanged by obstacle hit
    });

    it('should not end game on person collisions alone', () => {
      const collisionResults = [
        { type: 'person' as const, object: {} },
        { type: 'person' as const, object: {} },
        { type: 'person' as const, object: {} },
        { type: 'person' as const, object: {} },
        { type: 'person' as const, object: {} }
      ];
      gameState.processCollisionResults(collisionResults);

      expect(gameState.isGameOver).toBe(false);
      expect(gameState.hitBarrier).toBe(false);
      expect(gameState.peopleHit).toBe(5);
      expect(gameState.score).toBe(-5);
    });
  });
});
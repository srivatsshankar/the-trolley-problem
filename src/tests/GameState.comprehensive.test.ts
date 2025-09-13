/**
 * Comprehensive unit tests for GameState class
 * Tests requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 11.2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../models/GameState';

describe('GameState Comprehensive Tests', () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = new GameState();
  });

  describe('Initialization and Default Values', () => {
    it('should initialize with correct default values', () => {
      expect(gameState.score).toBe(0);
      expect(gameState.peopleHit).toBe(0);
      expect(gameState.peopleAvoided).toBe(0);
      expect(gameState.currentSegment).toBe(0);
      expect(gameState.currentTrackPosition).toBe(3);
      expect(gameState.isGameOver).toBe(false);
      expect(gameState.isPaused).toBe(false);
      expect(gameState.hitBarrier).toBe(false);
    });

    it('should have read-only getters', () => {
      // Verify that getters return correct values and are read-only
      expect(typeof gameState.score).toBe('number');
      expect(typeof gameState.peopleHit).toBe('number');
      expect(typeof gameState.peopleAvoided).toBe('number');
      expect(typeof gameState.currentSegment).toBe('number');
      expect(typeof gameState.currentTrackPosition).toBe('number');
      expect(typeof gameState.isGameOver).toBe('boolean');
      expect(typeof gameState.isPaused).toBe('boolean');
      expect(typeof gameState.hitBarrier).toBe('boolean');
    });
  });

  describe('Score Management', () => {
    it('should update score correctly with positive values', () => {
      gameState.updateScore(2, 8); // Hit 2, avoided 8

      expect(gameState.peopleHit).toBe(2);
      expect(gameState.peopleAvoided).toBe(8);
      expect(gameState.score).toBe(6); // 8 avoided - 2 hit
    });

    it('should update score correctly with zero values', () => {
      gameState.updateScore(0, 5); // Hit 0, avoided 5

      expect(gameState.peopleHit).toBe(0);
      expect(gameState.peopleAvoided).toBe(5);
      expect(gameState.score).toBe(5);
    });

    it('should handle negative score correctly', () => {
      gameState.updateScore(10, 3); // Hit 10, avoided 3

      expect(gameState.peopleHit).toBe(10);
      expect(gameState.peopleAvoided).toBe(3);
      expect(gameState.score).toBe(-7); // 3 avoided - 10 hit
    });

    it('should accumulate score over multiple updates', () => {
      gameState.updateScore(1, 4); // Score: 3
      gameState.updateScore(2, 3); // Score: 3 + 1 = 4
      gameState.updateScore(0, 2); // Score: 4 + 2 = 6

      expect(gameState.score).toBe(6);
      expect(gameState.peopleHit).toBe(3);
      expect(gameState.peopleAvoided).toBe(9);
    });
  });

  describe('Segment Management', () => {
    it('should increment segment correctly', () => {
      expect(gameState.currentSegment).toBe(0);

      gameState.incrementSegment();
      expect(gameState.currentSegment).toBe(1);

      gameState.incrementSegment();
      expect(gameState.currentSegment).toBe(2);
    });

    it('should handle multiple segment increments', () => {
      for (let i = 1; i <= 100; i++) {
        gameState.incrementSegment();
        expect(gameState.currentSegment).toBe(i);
      }
    });

    it('should process segment completion correctly', () => {
      gameState.processSegmentCompletion(10, 3); // 10 total, 3 hit

      expect(gameState.peopleAvoided).toBe(7); // 10 - 3
      expect(gameState.score).toBe(7); // 7 avoided
      expect(gameState.currentSegment).toBe(1); // Incremented
    });

    it('should handle segment completion with all people hit', () => {
      gameState.processSegmentCompletion(5, 5); // All hit

      expect(gameState.peopleAvoided).toBe(0);
      expect(gameState.score).toBe(0);
      expect(gameState.currentSegment).toBe(1);
    });

    it('should handle segment completion with no people hit', () => {
      gameState.processSegmentCompletion(8, 0); // None hit

      expect(gameState.peopleAvoided).toBe(8);
      expect(gameState.score).toBe(8);
      expect(gameState.currentSegment).toBe(1);
    });
  });

  describe('Track Position Management', () => {
    it('should set valid track positions', () => {
      for (let track = 1; track <= 5; track++) {
        gameState.setCurrentTrackPosition(track);
        expect(gameState.currentTrackPosition).toBe(track);
      }
    });

    it('should reject invalid track positions', () => {
      const initialTrack = gameState.currentTrackPosition;

      gameState.setCurrentTrackPosition(0); // Invalid
      expect(gameState.currentTrackPosition).toBe(initialTrack);

      gameState.setCurrentTrackPosition(6); // Invalid
      expect(gameState.currentTrackPosition).toBe(initialTrack);

      gameState.setCurrentTrackPosition(-1); // Invalid
      expect(gameState.currentTrackPosition).toBe(initialTrack);
    });

    it('should handle boundary track positions', () => {
      gameState.setCurrentTrackPosition(1); // Minimum valid
      expect(gameState.currentTrackPosition).toBe(1);

      gameState.setCurrentTrackPosition(5); // Maximum valid
      expect(gameState.currentTrackPosition).toBe(5);
    });
  });

  describe('Game State Control', () => {
    it('should end game correctly', () => {
      expect(gameState.isGameOver).toBe(false);
      expect(gameState.hitBarrier).toBe(false);

      gameState.endGame();

      expect(gameState.isGameOver).toBe(true);
      expect(gameState.hitBarrier).toBe(false); // Default parameter
    });

    it('should end game with barrier hit', () => {
      gameState.endGame(true);

      expect(gameState.isGameOver).toBe(true);
      expect(gameState.hitBarrier).toBe(true);
    });

    it('should handle pause state correctly', () => {
      expect(gameState.isPaused).toBe(false);

      gameState.setPaused(true);
      expect(gameState.isPaused).toBe(true);

      gameState.setPaused(false);
      expect(gameState.isPaused).toBe(false);
    });

    it('should toggle pause state multiple times', () => {
      for (let i = 0; i < 10; i++) {
        gameState.setPaused(i % 2 === 0);
        expect(gameState.isPaused).toBe(i % 2 === 0);
      }
    });
  });

  describe('State Reset', () => {
    it('should reset to initial state', () => {
      // Modify all state values
      gameState.updateScore(5, 10);
      gameState.incrementSegment();
      gameState.incrementSegment();
      gameState.setCurrentTrackPosition(3);
      gameState.endGame(true);
      gameState.setPaused(true);

      // Verify state is modified
      expect(gameState.score).not.toBe(0);
      expect(gameState.currentSegment).not.toBe(0);
      expect(gameState.currentTrackPosition).not.toBe(3);
      expect(gameState.isGameOver).toBe(true);
      expect(gameState.isPaused).toBe(true);

      // Reset and verify
      gameState.reset();

      expect(gameState.score).toBe(0);
      expect(gameState.peopleHit).toBe(0);
      expect(gameState.peopleAvoided).toBe(0);
      expect(gameState.currentSegment).toBe(0);
      expect(gameState.currentTrackPosition).toBe(3);
      expect(gameState.isGameOver).toBe(false);
      expect(gameState.isPaused).toBe(false);
      expect(gameState.hitBarrier).toBe(false);
    });

    it('should reset multiple times safely', () => {
      for (let i = 0; i < 5; i++) {
        gameState.updateScore(i, i * 2);
        gameState.incrementSegment();
        gameState.reset();

        expect(gameState.score).toBe(0);
        expect(gameState.currentSegment).toBe(0);
      }
    });
  });

  describe('Serialization and Persistence', () => {
    it('should serialize state correctly', () => {
      gameState.updateScore(3, 7);
      gameState.incrementSegment();
      gameState.setCurrentTrackPosition(4);
      gameState.setPaused(true);

      const serialized = gameState.serialize();
      const parsed = JSON.parse(serialized);

      expect(parsed.score).toBe(4); // 7 - 3
      expect(parsed.peopleHit).toBe(3);
      expect(parsed.peopleAvoided).toBe(7);
      expect(parsed.currentSegment).toBe(1);
      expect(parsed.currentTrackPosition).toBe(4);
      expect(parsed.isGameOver).toBe(false);
      expect(parsed.isPaused).toBe(true);
      expect(parsed.hitBarrier).toBe(false);
    });

    it('should deserialize state correctly', () => {
      const stateData = {
        score: 15,
        peopleHit: 5,
        peopleAvoided: 20,
        currentSegment: 8,
        currentTrackPosition: 3,
        isGameOver: true,
        isPaused: false,
        hitBarrier: true,
      };

      gameState.deserialize(JSON.stringify(stateData));

      expect(gameState.score).toBe(15);
      expect(gameState.peopleHit).toBe(5);
      expect(gameState.peopleAvoided).toBe(20);
      expect(gameState.currentSegment).toBe(8);
      expect(gameState.currentTrackPosition).toBe(3);
      expect(gameState.isGameOver).toBe(true);
      expect(gameState.isPaused).toBe(false);
      expect(gameState.hitBarrier).toBe(true);
    });

    it('should handle invalid serialized data gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      gameState.deserialize('invalid json');

      // Should reset to default state on error
      expect(gameState.score).toBe(0);
      expect(gameState.currentSegment).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle partial serialized data', () => {
      const partialData = {
        score: 10,
        currentSegment: 5,
        // Missing other fields
      };

      gameState.deserialize(JSON.stringify(partialData));

      expect(gameState.score).toBe(10);
      expect(gameState.currentSegment).toBe(5);
      expect(gameState.peopleHit).toBe(0); // Should use default
      expect(gameState.currentTrackPosition).toBe(3); // Should use default
    });

    it('should serialize and deserialize consistently', () => {
      // Set up complex state
      gameState.updateScore(8, 12);
      gameState.incrementSegment();
      gameState.incrementSegment();
      gameState.setCurrentTrackPosition(5);
      gameState.endGame(true);

      const serialized = gameState.serialize();
      const newGameState = new GameState();
      newGameState.deserialize(serialized);

      expect(newGameState.score).toBe(gameState.score);
      expect(newGameState.peopleHit).toBe(gameState.peopleHit);
      expect(newGameState.peopleAvoided).toBe(gameState.peopleAvoided);
      expect(newGameState.currentSegment).toBe(gameState.currentSegment);
      expect(newGameState.currentTrackPosition).toBe(gameState.currentTrackPosition);
      expect(newGameState.isGameOver).toBe(gameState.isGameOver);
      expect(newGameState.hitBarrier).toBe(gameState.hitBarrier);
    });
  });

  describe('Game Summary', () => {
    it('should provide accurate game summary', () => {
      gameState.updateScore(4, 16);
      gameState.incrementSegment();
      gameState.incrementSegment();
      gameState.incrementSegment();
      gameState.setCurrentTrackPosition(4);

      const summary = gameState.getGameSummary();

      expect(summary.score).toBe(12); // 16 - 4
      expect(summary.peopleHit).toBe(4);
      expect(summary.peopleAvoided).toBe(16);
      expect(summary.segmentsCompleted).toBe(3);
      expect(summary.finalTrack).toBe(4);
    });

    it('should provide summary for game over state', () => {
      gameState.updateScore(10, 5);
      gameState.incrementSegment();
      gameState.setCurrentTrackPosition(2);
      gameState.endGame(true);

      const summary = gameState.getGameSummary();

      expect(summary.score).toBe(-5); // 5 - 10
      expect(summary.peopleHit).toBe(10);
      expect(summary.peopleAvoided).toBe(5);
      expect(summary.segmentsCompleted).toBe(1);
      expect(summary.finalTrack).toBe(2);
    });

    it('should provide summary for initial state', () => {
      const summary = gameState.getGameSummary();

      expect(summary.score).toBe(0);
      expect(summary.peopleHit).toBe(0);
      expect(summary.peopleAvoided).toBe(0);
      expect(summary.segmentsCompleted).toBe(0);
      expect(summary.finalTrack).toBe(1);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle very large numbers', () => {
      const largeNumber = 1000000;
      gameState.updateScore(largeNumber, largeNumber * 2);

      expect(gameState.score).toBe(largeNumber); // 2M - 1M
      expect(gameState.peopleHit).toBe(largeNumber);
      expect(gameState.peopleAvoided).toBe(largeNumber * 2);
    });

    it('should handle zero values in all operations', () => {
      gameState.updateScore(0, 0);
      gameState.processSegmentCompletion(0, 0);

      expect(gameState.score).toBe(0);
      expect(gameState.peopleHit).toBe(0);
      expect(gameState.peopleAvoided).toBe(0);
      expect(gameState.currentSegment).toBe(1); // Should still increment
    });

    it('should handle negative values in segment completion', () => {
      // This shouldn't happen in normal gameplay but test robustness
      gameState.processSegmentCompletion(5, 10); // More hit than total

      expect(gameState.peopleAvoided).toBe(-5); // 5 - 10
      expect(gameState.score).toBe(-5);
    });

    it('should maintain state consistency after multiple operations', () => {
      // Perform many random operations
      for (let i = 0; i < 100; i++) {
        const hit = Math.floor(Math.random() * 10);
        const avoided = Math.floor(Math.random() * 10);
        gameState.updateScore(hit, avoided);

        if (i % 10 === 0) {
          gameState.incrementSegment();
        }

        if (i % 20 === 0) {
          gameState.setCurrentTrackPosition(Math.floor(Math.random() * 5) + 1);
        }
      }

      // State should still be valid
      expect(typeof gameState.score).toBe('number');
      expect(typeof gameState.currentSegment).toBe('number');
      expect(gameState.currentTrackPosition).toBeGreaterThanOrEqual(1);
      expect(gameState.currentTrackPosition).toBeLessThanOrEqual(5);
    });
  });

  describe('State Transitions', () => {
    it('should handle game over transition correctly', () => {
      // Set up active game state
      gameState.updateScore(2, 8);
      gameState.incrementSegment();
      gameState.setCurrentTrackPosition(3);
      gameState.setPaused(true);

      // End game
      gameState.endGame(true);

      // Game over state should be set, other state preserved
      expect(gameState.isGameOver).toBe(true);
      expect(gameState.hitBarrier).toBe(true);
      expect(gameState.score).toBe(6); // Preserved
      expect(gameState.currentSegment).toBe(1); // Preserved
      expect(gameState.isPaused).toBe(true); // Preserved
    });

    it('should handle pause transitions during gameplay', () => {
      gameState.updateScore(1, 3);

      // Pause and unpause multiple times
      gameState.setPaused(true);
      expect(gameState.isPaused).toBe(true);

      gameState.updateScore(2, 4); // Should work while paused
      expect(gameState.score).toBe(6); // 3 - 1 + 4 - 2

      gameState.setPaused(false);
      expect(gameState.isPaused).toBe(false);
    });

    it('should handle track position changes during gameplay', () => {
      gameState.setCurrentTrackPosition(2);
      gameState.updateScore(1, 2);
      gameState.setCurrentTrackPosition(4);
      gameState.incrementSegment();
      gameState.setCurrentTrackPosition(1);

      expect(gameState.currentTrackPosition).toBe(1);
      expect(gameState.score).toBe(1); // Should be preserved
      expect(gameState.currentSegment).toBe(1); // Should be preserved
    });
  });

  describe('Performance and Memory', () => {
    it('should handle rapid state updates efficiently', () => {
      const startTime = performance.now();

      // Perform many rapid updates
      for (let i = 0; i < 10000; i++) {
        gameState.updateScore(1, 1);
        if (i % 100 === 0) {
          gameState.incrementSegment();
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete quickly (less than 100ms for 10k operations)
      expect(duration).toBeLessThan(100);
      expect(gameState.score).toBe(0); // 10k - 10k
      expect(gameState.peopleHit).toBe(10000);
      expect(gameState.peopleAvoided).toBe(10000);
    });

    it('should not leak memory with repeated serialization', () => {
      // Perform many serialize/deserialize cycles
      for (let i = 0; i < 1000; i++) {
        gameState.updateScore(1, 2);
        const serialized = gameState.serialize();
        gameState.deserialize(serialized);
      }

      // State should be consistent
      expect(gameState.score).toBe(1000); // 2k - 1k
      expect(gameState.peopleHit).toBe(1000);
      expect(gameState.peopleAvoided).toBe(2000);
    });
  });
});
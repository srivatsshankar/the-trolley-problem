import { describe, test, expect, beforeEach } from 'vitest';
import { GameState } from '../GameState';

describe('GameState', () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = new GameState();
  });

  describe('Initial State', () => {
    test('should initialize with default values', () => {
      expect(gameState.score).toBe(0);
      expect(gameState.peopleHit).toBe(0);
      expect(gameState.peopleAvoided).toBe(0);
      expect(gameState.currentSegment).toBe(0);
      expect(gameState.currentTrackPosition).toBe(1);
      expect(gameState.isGameOver).toBe(false);
      expect(gameState.isPaused).toBe(false);
      expect(gameState.hitBarrier).toBe(false);
    });
  });

  describe('Score Management', () => {
    test('should update score correctly when avoiding people', () => {
      // Requirement 9.1: Add people not hit
      gameState.updateScore(0, 3); // 0 hit, 3 avoided
      expect(gameState.score).toBe(3);
      expect(gameState.peopleHit).toBe(0);
      expect(gameState.peopleAvoided).toBe(3);
    });

    test('should update score correctly when hitting people', () => {
      // Requirement 9.2: Subtract people hit
      gameState.updateScore(2, 0); // 2 hit, 0 avoided
      expect(gameState.score).toBe(-2);
      expect(gameState.peopleHit).toBe(2);
      expect(gameState.peopleAvoided).toBe(0);
    });

    test('should update score correctly with mixed results', () => {
      gameState.updateScore(1, 4); // 1 hit, 4 avoided
      expect(gameState.score).toBe(3); // 4 - 1 = 3
      expect(gameState.peopleHit).toBe(1);
      expect(gameState.peopleAvoided).toBe(4);
    });

    test('should accumulate score across multiple segments', () => {
      gameState.updateScore(1, 3); // Score: 2
      gameState.updateScore(0, 2); // Score: 4
      gameState.updateScore(2, 1); // Score: 3
      
      expect(gameState.score).toBe(3);
      expect(gameState.peopleHit).toBe(3);
      expect(gameState.peopleAvoided).toBe(6);
    });
  });

  describe('Segment Management', () => {
    test('should increment segment counter', () => {
      // Requirement 8.1: Track current segment
      expect(gameState.currentSegment).toBe(0);
      
      gameState.incrementSegment();
      expect(gameState.currentSegment).toBe(1);
      
      gameState.incrementSegment();
      expect(gameState.currentSegment).toBe(2);
    });
  });

  describe('Track Position Management', () => {
    test('should update current track position', () => {
      // Requirement 8.5: Track current track position
      expect(gameState.currentTrackPosition).toBe(1);
      
      gameState.setCurrentTrackPosition(3);
      expect(gameState.currentTrackPosition).toBe(3);
      
      gameState.setCurrentTrackPosition(5);
      expect(gameState.currentTrackPosition).toBe(5);
    });

    test('should reject invalid track positions', () => {
      gameState.setCurrentTrackPosition(3);
      
      // Try invalid positions
      gameState.setCurrentTrackPosition(0);
      expect(gameState.currentTrackPosition).toBe(3); // Should remain unchanged
      
      gameState.setCurrentTrackPosition(6);
      expect(gameState.currentTrackPosition).toBe(3); // Should remain unchanged
      
      gameState.setCurrentTrackPosition(-1);
      expect(gameState.currentTrackPosition).toBe(3); // Should remain unchanged
    });
  });

  describe('Game Over Management', () => {
    test('should end game without barrier hit', () => {
      expect(gameState.isGameOver).toBe(false);
      expect(gameState.hitBarrier).toBe(false);
      
      gameState.endGame();
      
      expect(gameState.isGameOver).toBe(true);
      expect(gameState.hitBarrier).toBe(false);
    });

    test('should end game with barrier hit', () => {
      // Requirement 8.4: Track whether trolley hit a barrier
      // Requirement 9.3: End game when hitting barrier
      expect(gameState.isGameOver).toBe(false);
      expect(gameState.hitBarrier).toBe(false);
      
      gameState.endGame(true);
      
      expect(gameState.isGameOver).toBe(true);
      expect(gameState.hitBarrier).toBe(true);
    });
  });

  describe('Pause Management', () => {
    test('should handle pause and resume', () => {
      // Requirement 11.2: Pause functionality
      expect(gameState.isPaused).toBe(false);
      
      gameState.setPaused(true);
      expect(gameState.isPaused).toBe(true);
      
      gameState.setPaused(false);
      expect(gameState.isPaused).toBe(false);
    });
  });

  describe('State Reset', () => {
    test('should reset all state to initial values', () => {
      // Set up some state
      gameState.updateScore(2, 5);
      gameState.incrementSegment();
      gameState.setCurrentTrackPosition(4);
      gameState.endGame(true);
      gameState.setPaused(true);
      
      // Verify state is changed
      expect(gameState.score).toBe(3);
      expect(gameState.currentSegment).toBe(1);
      expect(gameState.currentTrackPosition).toBe(4);
      expect(gameState.isGameOver).toBe(true);
      expect(gameState.isPaused).toBe(true);
      
      // Reset and verify
      gameState.reset();
      
      expect(gameState.score).toBe(0);
      expect(gameState.peopleHit).toBe(0);
      expect(gameState.peopleAvoided).toBe(0);
      expect(gameState.currentSegment).toBe(0);
      expect(gameState.currentTrackPosition).toBe(1);
      expect(gameState.isGameOver).toBe(false);
      expect(gameState.isPaused).toBe(false);
      expect(gameState.hitBarrier).toBe(false);
    });
  });

  describe('Serialization and Persistence', () => {
    test('should serialize state correctly', () => {
      gameState.updateScore(1, 4);
      gameState.incrementSegment();
      gameState.setCurrentTrackPosition(3);
      
      const serialized = gameState.serialize();
      const parsed = JSON.parse(serialized);
      
      expect(parsed.score).toBe(3);
      expect(parsed.peopleHit).toBe(1);
      expect(parsed.peopleAvoided).toBe(4);
      expect(parsed.currentSegment).toBe(1);
      expect(parsed.currentTrackPosition).toBe(3);
      expect(parsed.isGameOver).toBe(false);
      expect(parsed.isPaused).toBe(false);
      expect(parsed.hitBarrier).toBe(false);
    });

    test('should deserialize state correctly', () => {
      const stateData = {
        score: 10,
        peopleHit: 2,
        peopleAvoided: 12,
        currentSegment: 5,
        currentTrackPosition: 4,
        isGameOver: true,
        isPaused: false,
        hitBarrier: true
      };
      
      gameState.deserialize(JSON.stringify(stateData));
      
      expect(gameState.score).toBe(10);
      expect(gameState.peopleHit).toBe(2);
      expect(gameState.peopleAvoided).toBe(12);
      expect(gameState.currentSegment).toBe(5);
      expect(gameState.currentTrackPosition).toBe(4);
      expect(gameState.isGameOver).toBe(true);
      expect(gameState.isPaused).toBe(false);
      expect(gameState.hitBarrier).toBe(true);
    });

    test('should handle invalid serialized data gracefully', () => {
      gameState.updateScore(1, 2); // Set some initial state
      
      // Try to deserialize invalid JSON
      gameState.deserialize('invalid json');
      
      // Should reset to default values
      expect(gameState.score).toBe(0);
      expect(gameState.peopleHit).toBe(0);
      expect(gameState.peopleAvoided).toBe(0);
      expect(gameState.currentSegment).toBe(0);
      expect(gameState.currentTrackPosition).toBe(1);
    });

    test('should handle partial serialized data', () => {
      const partialData = {
        score: 5,
        peopleHit: 1
        // Missing other fields
      };
      
      gameState.deserialize(JSON.stringify(partialData));
      
      expect(gameState.score).toBe(5);
      expect(gameState.peopleHit).toBe(1);
      expect(gameState.peopleAvoided).toBe(0); // Should default
      expect(gameState.currentTrackPosition).toBe(1); // Should default
    });
  });

  describe('Game Summary', () => {
    test('should provide correct game summary', () => {
      gameState.updateScore(3, 7);
      gameState.incrementSegment();
      gameState.incrementSegment();
      gameState.setCurrentTrackPosition(4);
      
      const summary = gameState.getGameSummary();
      
      expect(summary.score).toBe(4); // 7 - 3
      expect(summary.peopleHit).toBe(3);
      expect(summary.peopleAvoided).toBe(7);
      expect(summary.segmentsCompleted).toBe(2);
      expect(summary.finalTrack).toBe(4);
    });
  });

  describe('Edge Cases', () => {
    test('should handle negative scores correctly', () => {
      gameState.updateScore(10, 2); // Hit more than avoided
      expect(gameState.score).toBe(-8);
    });

    test('should handle zero values correctly', () => {
      gameState.updateScore(0, 0);
      expect(gameState.score).toBe(0);
      expect(gameState.peopleHit).toBe(0);
      expect(gameState.peopleAvoided).toBe(0);
    });

    test('should handle large numbers correctly', () => {
      gameState.updateScore(1000, 2000);
      expect(gameState.score).toBe(1000);
      expect(gameState.peopleHit).toBe(1000);
      expect(gameState.peopleAvoided).toBe(2000);
    });
  });
});
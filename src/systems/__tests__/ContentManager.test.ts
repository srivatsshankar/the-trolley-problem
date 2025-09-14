/**
 * Tests for ContentManager class
 * Verifies requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { ContentManager } from '../ContentManager';
import { GameConfigManager } from '../../models/GameConfig';

// Mock dependencies
vi.mock('../PeopleManager', () => ({
  PeopleManager: vi.fn().mockImplementation(() => ({
    generatePeopleForSection: vi.fn().mockReturnValue({ totalPeople: 5 }),
    removePeopleForSection: vi.fn(),
    updatePeopleAnimations: vi.fn(),
    updatePeopleVisibility: vi.fn(),
    checkCollisionWithPeople: vi.fn().mockReturnValue([]),
    getPeopleStats: vi.fn().mockReturnValue({ total: 0 }),
    dispose: vi.fn()
  }))
}));

vi.mock('../ObstacleManager', () => ({
  ObstacleManager: vi.fn().mockImplementation(() => ({
    createTestObstacle: vi.fn(),
    removeObstaclesForSection: vi.fn(),
    updateObstacleVisibility: vi.fn(),
    checkCollisionWithObstacles: vi.fn().mockReturnValue(null),
    getObstacleStats: vi.fn().mockReturnValue({ total: 0 }),
    dispose: vi.fn()
  }))
}));

describe('ContentManager', () => {
  let contentManager: ContentManager;
  let mockScene: THREE.Scene;
  let mockConfigManager: GameConfigManager;
  let mockTracks: THREE.Object3D[];

  beforeEach(() => {
    mockScene = new THREE.Scene();
    mockConfigManager = new GameConfigManager();
    contentManager = new ContentManager(mockScene, mockConfigManager);

    mockTracks = Array.from({ length: 5 }, (_, i) => {
        const track = new THREE.Object3D();
        track.position.set(i * 2, 0, 0);
        return track;
      });

    vi.clearAllMocks();
  });

  describe('Section-based Content Generation', () => {
    test('should not generate barriers for sections < 5', () => {
      const result = contentManager.generateContentForSection(4, mockTracks);
      expect(result.barriersGenerated).toBe(false);
      expect(result.barrierCount).toBe(0);
    });

    test('should generate 1 barrier for sections >= 5 and < 20', () => {
      const result = contentManager.generateContentForSection(5, mockTracks);
      expect(result.barriersGenerated).toBe(true);
      expect(result.barrierCount).toBe(1);
    });

    test('should generate 2 barriers for sections >= 20', () => {
      const result = contentManager.generateContentForSection(20, mockTracks);
      expect(result.barriersGenerated).toBe(true);
      expect(result.barrierCount).toBe(2);
    });

    test('should generate people for a valid section', () => {
      const result = contentManager.generateContentForSection(1, mockTracks);
      expect(result.peopleGenerated).toBe(true);
    });

    test('should not re-process an already processed section', () => {
      contentManager.generateContentForSection(1, mockTracks);
      const result = contentManager.generateContentForSection(1, mockTracks);

      expect(result.peopleGenerated).toBe(false);
      expect(result.barriersGenerated).toBe(false);
    });
  });

  describe('Cleanup', () => {
    test('should cleanup content for a specific section', () => {
      contentManager.generateContentForSection(1, mockTracks);
      contentManager.cleanupContentForSection(1);

      const peopleManager = contentManager.getPeopleManager();
      const obstacleManager = contentManager.getObstacleManager();

      expect(peopleManager.removePeopleForSection).toHaveBeenCalledWith(1);
      expect(obstacleManager.removeObstaclesForSection).toHaveBeenCalledWith(1);
    });
  });
});

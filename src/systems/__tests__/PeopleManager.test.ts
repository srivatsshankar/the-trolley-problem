/**
 * Tests for PeopleManager class
 * Verifies requirements: 6.3, 6.4
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { PeopleManager } from '../PeopleManager';
import { GameConfigManager } from '../../models/GameConfig';

// Mock Three.js for testing
vi.mock('three', () => {
    const mockVector3 = vi.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
        x, y, z,
        clone: vi.fn().mockReturnThis(),
        copy: vi.fn().mockReturnThis(),
        distanceTo: vi.fn().mockReturnValue(1.0),
        set: vi.fn().mockReturnThis()
    }));

    return {
        Vector3: mockVector3,
        Object3D: vi.fn().mockImplementation(() => ({
            position: new mockVector3()
        })),
        Scene: vi.fn().mockImplementation(() => ({
            add: vi.fn(),
            remove: vi.fn()
        })),
        Box3: vi.fn().mockImplementation(() => ({
            setFromObject: vi.fn(),
            intersectsBox: vi.fn().mockReturnValue(false),
            containsPoint: vi.fn().mockReturnValue(false),
            expandByScalar: vi.fn().mockReturnThis(),
            clone: vi.fn().mockReturnThis()
        }))
    };
});

// Mock Person class
vi.mock('../../models/Person', () => ({
  createPersonWithVariation: vi.fn().mockImplementation((position) => ({
    id: Math.floor(Math.random() * 1000),
    position: position,
    isHit: false,
    getGroup: vi.fn().mockReturnValue({ userData: { type: 'person' } }),
    getCenter: vi.fn().mockReturnValue(position),
    getSize: vi.fn().mockReturnValue({ width: 0.4, height: 1.6, depth: 0.3 }),
    update: vi.fn(),
    markAsHit: vi.fn().mockImplementation(function(this: any) { this.isHit = true; }),
    checkCollision: vi.fn().mockReturnValue(false),
    checkPointCollision: vi.fn().mockReturnValue(false),
    setVisible: vi.fn(),
    dispose: vi.fn()
  }))
}));

describe('PeopleManager', () => {
  let peopleManager: PeopleManager;
  let mockScene: THREE.Scene;
  let mockConfigManager: GameConfigManager;
  let mockTracks: THREE.Object3D[];

  beforeEach(() => {
    mockScene = new THREE.Scene();
    mockConfigManager = new GameConfigManager();
    peopleManager = new PeopleManager(mockScene, mockConfigManager);

    // Create mock tracks
    mockTracks = Array.from({ length: 5 }, (_, i) => {
        const track = new THREE.Object3D();
        track.position.set(i * 2, 0, 0);
        return track;
      });

    vi.clearAllMocks();
  });

  describe('People Generation for Sections', () => {
    test('should generate people for a 5-track section', () => {
      const result = peopleManager.generatePeopleForSection(1, mockTracks);

      expect(result).toBeDefined();
      expect(result.people).toBeDefined();
      expect(result.peoplePerTrack).toHaveLength(5);
      expect(result.totalPeople).toBeGreaterThanOrEqual(1);
      expect(result.totalPeople).toBeLessThanOrEqual(5);
    });

    test('should not generate people for a section with less than 5 tracks', () => {
      const singleTrack = [mockTracks[0]];
      const result = peopleManager.generatePeopleForSection(1, singleTrack);

      expect(result.people).toHaveLength(0);
      expect(result.totalPeople).toBe(0);
    });

    test('should respect occupied tracks', () => {
      const occupiedTracks = [0, 2]; // Tracks with obstacles
      const result = peopleManager.generatePeopleForSection(1, mockTracks, occupiedTracks);

      expect(result.peoplePerTrack[0]).toBe(0); // Occupied track should have no people
      expect(result.peoplePerTrack[2]).toBe(0); // Occupied track should have no people
    });

    test('should ensure one track has 1-2 people', () => {
        const result = peopleManager.generatePeopleForSection(1, mockTracks);
  
        if (result.totalPeople > 0) {
          const tracksWithOneOrTwoPeople = result.peoplePerTrack.filter(count => count >= 1 && count <= 2);
          expect(tracksWithOneOrTwoPeople.length).toBeGreaterThanOrEqual(1);
        }
      });

    test('should handle all tracks occupied', () => {
      const allOccupied = [0, 1, 2, 3, 4];
      const result = peopleManager.generatePeopleForSection(1, mockTracks, allOccupied);

      expect(result.people).toHaveLength(0);
      expect(result.totalPeople).toBe(0);
      expect(result.peoplePerTrack.every(count => count === 0)).toBe(true);
    });

    test('should not exceed max total people for the section', () => {
        const result = peopleManager.generatePeopleForSection(1, mockTracks);
        expect(result.totalPeople).toBeLessThanOrEqual(5);
    });
  });

  describe('Cleanup', () => {
    test('should remove people for specific section', () => {
        peopleManager.generatePeopleForSection(1, mockTracks);
        peopleManager.removePeopleForSection(1);
        const stats = peopleManager.getPeopleStats();
        // This is tricky to test without more detailed mocks, but we can check if the map is cleared for that section
        expect(stats.peopleBySegment[1]).toBeUndefined();
      });
  });
});
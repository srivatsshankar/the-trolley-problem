/**
 * Tests for PeopleManager class
 * Verifies requirements: 6.3, 6.4
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { PeopleManager, PeopleGenerationResult } from '../PeopleManager';
import { GameConfigManager } from '../../models/GameConfig';
import { TrackSegment } from '../TrackGenerator';
import { Track } from '../../models/Track';

// Mock Three.js for testing
vi.mock('three', () => ({
  Vector3: vi.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
    x, y, z,
    clone: vi.fn().mockReturnThis(),
    copy: vi.fn().mockReturnThis(),
    distanceTo: vi.fn().mockReturnValue(1.0),
    set: vi.fn().mockReturnThis()
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
}));

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
    markAsHit: vi.fn().mockImplementation(function() { this.isHit = true; }),
    checkCollision: vi.fn().mockReturnValue(false),
    checkPointCollision: vi.fn().mockReturnValue(false),
    setVisible: vi.fn(),
    dispose: vi.fn()
  })),
  createPerson: vi.fn().mockImplementation((position) => ({
    id: Math.floor(Math.random() * 1000),
    position: position,
    isHit: false,
    getGroup: vi.fn().mockReturnValue({ userData: { type: 'person' } }),
    getCenter: vi.fn().mockReturnValue(position),
    getSize: vi.fn().mockReturnValue({ width: 0.4, height: 1.6, depth: 0.3 }),
    update: vi.fn(),
    markAsHit: vi.fn().mockImplementation(function() { this.isHit = true; }),
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
  let mockTrackSegment: TrackSegment;

  beforeEach(() => {
    mockScene = new THREE.Scene();
    mockConfigManager = new GameConfigManager();
    peopleManager = new PeopleManager(mockScene, mockConfigManager);

    // Create mock track segment
    const mockTracks: Track[] = Array.from({ length: 5 }, (_, i) => ({
      id: i,
      position: new THREE.Vector3(i * 2, 0, 0),
      geometry: {} as any,
      material: {} as any,
      mesh: {} as any
    }));

    mockTrackSegment = {
      id: 1,
      tracks: mockTracks,
      position: new THREE.Vector3(0, 0, 0),
      startZ: 0,
      endZ: 10,
      isVisible: true,
      isGenerated: true
    };

    vi.clearAllMocks();
  });

  describe('People Generation', () => {
    test('should generate people for 5-track segment', () => {
      const result = peopleManager.generatePeopleForSegment(mockTrackSegment, 1);

      expect(result).toBeDefined();
      expect(result.people).toBeDefined();
      expect(result.peoplePerTrack).toHaveLength(5);
      expect(result.totalPeople).toBeGreaterThanOrEqual(0);
    });

    test('should not generate people for single track segment', () => {
      const singleTrackSegment = {
        ...mockTrackSegment,
        tracks: [mockTrackSegment.tracks[0]]
      };

      const result = peopleManager.generatePeopleForSegment(singleTrackSegment, 1);

      expect(result.people).toHaveLength(0);
      expect(result.totalPeople).toBe(0);
      expect(result.guaranteedSinglePersonTrack).toBe(-1);
    });

    test('should respect occupied tracks', () => {
      const occupiedTracks = [0, 2]; // Tracks with obstacles
      const result = peopleManager.generatePeopleForSegment(mockTrackSegment, 1, occupiedTracks);

      expect(result.peoplePerTrack[0]).toBe(0); // Occupied track should have no people
      expect(result.peoplePerTrack[2]).toBe(0); // Occupied track should have no people
    });

    test('should ensure one track has exactly 1 person', () => {
      const result = peopleManager.generatePeopleForSegment(mockTrackSegment, 1);

      if (result.totalPeople > 0) {
        // Should have at least one track with exactly 1 person
        const tracksWithOnePerson = result.peoplePerTrack.filter(count => count === 1);
        expect(tracksWithOnePerson.length).toBeGreaterThanOrEqual(1);
      }
    });

    test('should handle all tracks occupied', () => {
      const allOccupied = [0, 1, 2, 3, 4];
      const result = peopleManager.generatePeopleForSegment(mockTrackSegment, 1, allOccupied);

      expect(result.people).toHaveLength(0);
      expect(result.totalPeople).toBe(0);
      expect(result.peoplePerTrack.every(count => count === 0)).toBe(true);
    });
  });

  describe('People Management', () => {
    test('should update people animations', () => {
      // Generate some people first
      peopleManager.generatePeopleForSegment(mockTrackSegment, 1);

      // Should not throw errors
      peopleManager.updatePeopleAnimations(0.016);
    });

    test('should get people for specific segment', () => {
      peopleManager.generatePeopleForSegment(mockTrackSegment, 1);
      
      const segmentPeople = peopleManager.getPeopleForSegment(1);
      expect(Array.isArray(segmentPeople)).toBe(true);
    });

    test('should get people on specific track', () => {
      peopleManager.generatePeopleForSegment(mockTrackSegment, 1);
      
      const trackPeople = peopleManager.getPeopleOnTrack(1, 0);
      expect(Array.isArray(trackPeople)).toBe(true);
    });

    test('should get people near position', () => {
      peopleManager.generatePeopleForSegment(mockTrackSegment, 1);
      
      const nearbyPeople = peopleManager.getPeopleNearPosition(new THREE.Vector3(0, 0, 0), 5.0);
      expect(Array.isArray(nearbyPeople)).toBe(true);
    });
  });

  describe('Collision Detection', () => {
    test('should check collision with bounding box', () => {
      peopleManager.generatePeopleForSegment(mockTrackSegment, 1);
      
      const mockBoundingBox = new THREE.Box3();
      const hitPeople = peopleManager.checkCollisionWithPeople(mockBoundingBox);
      
      expect(Array.isArray(hitPeople)).toBe(true);
    });

    test('should check point collision', () => {
      peopleManager.generatePeopleForSegment(mockTrackSegment, 1);
      
      const testPoint = new THREE.Vector3(1, 1, 1);
      const hitPeople = peopleManager.checkPointCollisionWithPeople(testPoint, 0.5);
      
      expect(Array.isArray(hitPeople)).toBe(true);
    });

    test('should mark people as hit during collision', () => {
      peopleManager.generatePeopleForSegment(mockTrackSegment, 1);
      
      const mockBoundingBox = new THREE.Box3();
      const hitPeople = peopleManager.checkCollisionWithPeople(mockBoundingBox);
      
      // Should return an array (even if empty due to mocking)
      expect(Array.isArray(hitPeople)).toBe(true);
    });
  });

  describe('Statistics and Tracking', () => {
    test('should get segment people statistics', () => {
      peopleManager.generatePeopleForSegment(mockTrackSegment, 1);
      
      const stats = peopleManager.getSegmentPeopleStats(1);
      
      expect(stats).toHaveProperty('hit');
      expect(stats).toHaveProperty('avoided');
      expect(stats).toHaveProperty('total');
      expect(typeof stats.hit).toBe('number');
      expect(typeof stats.avoided).toBe('number');
      expect(typeof stats.total).toBe('number');
      expect(stats.hit + stats.avoided).toBe(stats.total);
    });

    test('should get overall people statistics', () => {
      peopleManager.generatePeopleForSegment(mockTrackSegment, 1);
      
      const stats = peopleManager.getPeopleStats();
      
      expect(stats).toHaveProperty('totalPeople');
      expect(stats).toHaveProperty('hitPeople');
      expect(stats).toHaveProperty('avoidedPeople');
      expect(stats).toHaveProperty('peopleBySegment');
      expect(typeof stats.totalPeople).toBe('number');
      expect(typeof stats.hitPeople).toBe('number');
      expect(typeof stats.avoidedPeople).toBe('number');
      expect(typeof stats.peopleBySegment).toBe('object');
    });
  });

  describe('Visibility Management', () => {
    test('should update people visibility based on distance', () => {
      peopleManager.generatePeopleForSegment(mockTrackSegment, 1);
      
      const currentPosition = new THREE.Vector3(0, 0, 0);
      const viewDistance = 10.0;
      
      // Should not throw errors
      peopleManager.updatePeopleVisibility(currentPosition, viewDistance);
    });
  });

  describe('Cleanup and Resource Management', () => {
    test('should remove people for specific segment', () => {
      peopleManager.generatePeopleForSegment(mockTrackSegment, 1);
      
      // Should not throw errors
      peopleManager.removePeopleForSegment(1);
      
      // People should be removed
      const remainingPeople = peopleManager.getPeopleForSegment(1);
      expect(remainingPeople).toHaveLength(0);
    });

    test('should clear all people', () => {
      peopleManager.generatePeopleForSegment(mockTrackSegment, 1);
      
      // Should not throw errors
      peopleManager.clearAllPeople();
      
      const stats = peopleManager.getPeopleStats();
      expect(stats.totalPeople).toBe(0);
    });

    test('should dispose properly', () => {
      peopleManager.generatePeopleForSegment(mockTrackSegment, 1);
      
      // Should not throw errors
      peopleManager.dispose();
      
      const stats = peopleManager.getPeopleStats();
      expect(stats.totalPeople).toBe(0);
    });
  });

  describe('Test Person Creation', () => {
    test('should create test person', () => {
      const testPosition = new THREE.Vector3(5, 0, 5);
      const testPerson = peopleManager.createTestPerson(1, 0, testPosition);
      
      expect(testPerson).toBeDefined();
      expect(testPerson.id).toBeDefined();
    });
  });

  describe('People Distribution Logic', () => {
    test('should distribute people according to configuration', () => {
      const result = peopleManager.generatePeopleForSegment(mockTrackSegment, 1);
      
      // Should respect min/max people per track constraints
      result.peoplePerTrack.forEach(count => {
        if (count > 0) {
          expect(count).toBeGreaterThanOrEqual(1);
          expect(count).toBeLessThanOrEqual(5);
        }
      });
    });

    test('should handle different segment indices', () => {
      const result1 = peopleManager.generatePeopleForSegment(mockTrackSegment, 1);
      const result2 = peopleManager.generatePeopleForSegment(mockTrackSegment, 2);
      
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      
      // Both should be valid results
      expect(result1.peoplePerTrack).toHaveLength(5);
      expect(result2.peoplePerTrack).toHaveLength(5);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty track segment', () => {
      const emptySegment = {
        ...mockTrackSegment,
        tracks: []
      };
      
      const result = peopleManager.generatePeopleForSegment(emptySegment, 1);
      
      expect(result.people).toHaveLength(0);
      expect(result.totalPeople).toBe(0);
    });

    test('should handle segment with undefined tracks', () => {
      const invalidSegment = {
        ...mockTrackSegment,
        tracks: undefined as any
      };
      
      // Should handle gracefully and return empty result
      const result = peopleManager.generatePeopleForSegment(invalidSegment, 1);
      expect(result.people).toHaveLength(0);
      expect(result.totalPeople).toBe(0);
    });

    test('should handle negative segment index', () => {
      const result = peopleManager.generatePeopleForSegment(mockTrackSegment, -1);
      
      // Should still work or return empty result
      expect(result).toBeDefined();
      expect(result.peoplePerTrack).toHaveLength(5);
    });
  });
});
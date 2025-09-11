/**
 * Unit tests for TrackGenerator
 * Tests requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.3, 10.1, 10.2
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TrackGenerator } from '../systems/TrackGenerator';
import { GameConfig } from '../models/GameConfig';
import * as THREE from 'three';

// Mock Three.js objects
vi.mock('three', async () => {
  const actual = await vi.importActual('three');
  return {
    ...actual,
    Scene: vi.fn().mockImplementation(() => ({
      add: vi.fn(),
      remove: vi.fn(),
    })),
    Vector3: vi.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
      x, y, z,
      clone: vi.fn().mockReturnThis(),
      copy: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
    })),
  };
});

// Mock Track model
vi.mock('../models/Track', () => ({
  createTrack: vi.fn((id, position, type) => ({
    id,
    position: position.clone(),
    type,
    mesh: {
      visible: true,
    },
    dispose: vi.fn(),
  })),
  TRACK_COLORS: {
    NORMAL: '#888888',
    HIGHLIGHTED: '#ffff00',
  },
}));

describe('TrackGenerator', () => {
  let trackGenerator: TrackGenerator;
  let mockScene: THREE.Scene;
  let mockConfig: GameConfig;

  beforeEach(() => {
    mockScene = new THREE.Scene();
    mockConfig = {
      tracks: {
        count: 5,
        width: 2.0,
        segmentLength: 10.0,
      },
      rendering: {
        maxVisibleSegments: 8,
        viewDistance: 50.0,
      },
    } as GameConfig;

    trackGenerator = new TrackGenerator(mockScene, mockConfig);
  });

  describe('Initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(trackGenerator).toBeDefined();
      
      const stats = trackGenerator.getGenerationStats();
      expect(stats.totalSegments).toBe(0);
      expect(stats.lastGeneratedSegment).toBe(-1);
    });

    it('should generate initial segments on initialize', () => {
      trackGenerator.initialize();
      
      const stats = trackGenerator.getGenerationStats();
      expect(stats.totalSegments).toBe(mockConfig.rendering.maxVisibleSegments);
      expect(stats.lastGeneratedSegment).toBe(mockConfig.rendering.maxVisibleSegments - 1);
    });

    it('should create single track segments initially', () => {
      trackGenerator.initialize();
      
      // First 3 segments should be single track
      for (let i = 0; i < 3; i++) {
        expect(trackGenerator.isSegmentSingleTrack(i)).toBe(true);
        expect(trackGenerator.getTrackCountForSegment(i)).toBe(1);
      }
      
      // Later segments should be multi-track
      for (let i = 3; i < 6; i++) {
        expect(trackGenerator.isSegmentSingleTrack(i)).toBe(false);
        expect(trackGenerator.getTrackCountForSegment(i)).toBe(5);
      }
    });
  });

  describe('Segment Generation', () => {
    it('should generate single track segment correctly', () => {
      const segment = trackGenerator.generateSegment(0);
      
      expect(segment.id).toBe(0);
      expect(segment.tracks).toHaveLength(1);
      expect(segment.startZ).toBe(0);
      expect(segment.endZ).toBe(mockConfig.tracks.segmentLength);
      expect(segment.isGenerated).toBe(true);
      expect(segment.isVisible).toBe(true);
    });

    it('should generate multi-track segment correctly', () => {
      const segment = trackGenerator.generateSegment(5);
      
      expect(segment.id).toBe(5);
      expect(segment.tracks).toHaveLength(5);
      expect(segment.startZ).toBe(5 * mockConfig.tracks.segmentLength);
      expect(segment.endZ).toBe(6 * mockConfig.tracks.segmentLength);
      expect(segment.isGenerated).toBe(true);
      expect(segment.isVisible).toBe(true);
    });

    it('should return existing segment if already generated', () => {
      const segment1 = trackGenerator.generateSegment(3);
      const segment2 = trackGenerator.generateSegment(3);
      
      expect(segment1).toBe(segment2);
    });

    it('should position segments correctly along Z-axis', () => {
      const segment0 = trackGenerator.generateSegment(0);
      const segment1 = trackGenerator.generateSegment(1);
      const segment2 = trackGenerator.generateSegment(2);
      
      expect(segment0.position.z).toBe(0);
      expect(segment1.position.z).toBe(mockConfig.tracks.segmentLength);
      expect(segment2.position.z).toBe(2 * mockConfig.tracks.segmentLength);
    });

    it('should position multi-track segments with correct spacing', () => {
      const segment = trackGenerator.generateSegment(5); // Multi-track segment
      const tracks = segment.tracks;
      
      expect(tracks).toHaveLength(5);
      
      // Check that tracks are spaced correctly
      const expectedSpacing = mockConfig.tracks.width * 1.2; // From generation config
      for (let i = 1; i < tracks.length; i++) {
        const expectedX = tracks[0].position.x + i * expectedSpacing;
        expect(tracks[i].position.x).toBeCloseTo(expectedX, 2);
      }
    });
  });

  describe('Progressive Generation', () => {
    it('should generate segments ahead of current position', () => {
      trackGenerator.initialize();
      
      const currentPosition = new THREE.Vector3(0, 0, 25); // Middle of segment 2
      trackGenerator.updateGeneration(currentPosition);
      
      const stats = trackGenerator.getGenerationStats();
      expect(stats.totalSegments).toBeGreaterThan(8); // Should generate ahead
    });

    it('should not regenerate existing segments', () => {
      trackGenerator.initialize();
      const initialStats = trackGenerator.getGenerationStats();
      
      const currentPosition = new THREE.Vector3(0, 0, 5);
      trackGenerator.updateGeneration(currentPosition);
      
      const newStats = trackGenerator.getGenerationStats();
      expect(newStats.totalSegments).toBeGreaterThanOrEqual(initialStats.totalSegments);
    });

    it('should update segment visibility based on distance', () => {
      trackGenerator.initialize();
      
      // Move far ahead
      const currentPosition = new THREE.Vector3(0, 0, 100);
      trackGenerator.updateGeneration(currentPosition);
      
      // Check that distant segments are not visible
      const segment0 = trackGenerator.getSegment(0);
      if (segment0) {
        expect(segment0.isVisible).toBe(false);
      }
    });
  });

  describe('Segment Cleanup', () => {
    it('should cleanup old segments when moving forward', () => {
      trackGenerator.initialize();
      const initialStats = trackGenerator.getGenerationStats();
      
      // Move far ahead to trigger cleanup
      const currentPosition = new THREE.Vector3(0, 0, 200);
      trackGenerator.cleanupOldSegments(currentPosition);
      
      const newStats = trackGenerator.getGenerationStats();
      expect(newStats.totalSegments).toBeLessThan(initialStats.totalSegments);
    });

    it('should remove segments from scene during cleanup', () => {
      trackGenerator.initialize();
      
      const removeSpy = vi.spyOn(mockScene, 'remove');
      
      // Move far ahead to trigger cleanup
      const currentPosition = new THREE.Vector3(0, 0, 200);
      trackGenerator.cleanupOldSegments(currentPosition);
      
      expect(removeSpy).toHaveBeenCalled();
    });

    it('should not cleanup segments that are still in range', () => {
      trackGenerator.initialize();
      
      const currentPosition = new THREE.Vector3(0, 0, 10);
      trackGenerator.cleanupOldSegments(currentPosition);
      
      // All initial segments should still exist
      const stats = trackGenerator.getGenerationStats();
      expect(stats.totalSegments).toBe(mockConfig.rendering.maxVisibleSegments);
    });
  });

  describe('Segment Retrieval', () => {
    beforeEach(() => {
      trackGenerator.initialize();
    });

    it('should retrieve segment by index', () => {
      const segment = trackGenerator.getSegment(2);
      expect(segment).toBeDefined();
      expect(segment!.id).toBe(2);
    });

    it('should return undefined for non-existent segment', () => {
      const segment = trackGenerator.getSegment(999);
      expect(segment).toBeUndefined();
    });

    it('should get all segments', () => {
      const allSegments = trackGenerator.getAllSegments();
      expect(allSegments).toHaveLength(mockConfig.rendering.maxVisibleSegments);
    });

    it('should get visible segments only', () => {
      const visibleSegments = trackGenerator.getVisibleSegments();
      expect(visibleSegments.length).toBeGreaterThan(0);
      
      visibleSegments.forEach(segment => {
        expect(segment.isVisible).toBe(true);
      });
    });

    it('should get segment at specific Z position', () => {
      const z = 25; // Should be in segment 2
      const segment = trackGenerator.getSegmentAtPosition(z);
      
      expect(segment).toBeDefined();
      expect(segment!.id).toBe(2);
      expect(z).toBeGreaterThanOrEqual(segment!.startZ);
      expect(z).toBeLessThan(segment!.endZ);
    });

    it('should get tracks for specific segment', () => {
      const tracks = trackGenerator.getTracksForSegment(0);
      expect(tracks).toHaveLength(1); // Single track segment
      
      const multiTracks = trackGenerator.getTracksForSegment(5);
      expect(multiTracks).toHaveLength(5); // Multi-track segment
    });

    it('should get specific track at position in segment', () => {
      const track = trackGenerator.getTrackAtPosition(5, 2); // Segment 5, track position 2
      expect(track).toBeDefined();
      
      const invalidTrack = trackGenerator.getTrackAtPosition(5, 10); // Invalid position
      expect(invalidTrack).toBeUndefined();
    });
  });

  describe('Generation Statistics', () => {
    it('should provide accurate generation statistics', () => {
      trackGenerator.initialize();
      
      const stats = trackGenerator.getGenerationStats();
      
      expect(stats.totalSegments).toBe(mockConfig.rendering.maxVisibleSegments);
      expect(stats.visibleSegments).toBe(mockConfig.rendering.maxVisibleSegments);
      expect(stats.singleTrackSegments).toBe(3); // First 3 segments
      expect(stats.multiTrackSegments).toBe(stats.totalSegments - 3);
      expect(stats.lastGeneratedSegment).toBe(mockConfig.rendering.maxVisibleSegments - 1);
    });

    it('should update statistics after generation', () => {
      trackGenerator.initialize();
      const initialStats = trackGenerator.getGenerationStats();
      
      // Generate more segments
      trackGenerator.generateSegment(20);
      
      const newStats = trackGenerator.getGenerationStats();
      expect(newStats.totalSegments).toBeGreaterThan(initialStats.totalSegments);
      expect(newStats.lastGeneratedSegment).toBeGreaterThan(initialStats.lastGeneratedSegment);
    });
  });

  describe('Segment Regeneration', () => {
    it('should regenerate existing segment', () => {
      trackGenerator.initialize();
      
      const originalSegment = trackGenerator.getSegment(3);
      expect(originalSegment).toBeDefined();
      
      const regeneratedSegment = trackGenerator.regenerateSegment(3);
      expect(regeneratedSegment).toBeDefined();
      expect(regeneratedSegment.id).toBe(3);
      expect(regeneratedSegment).not.toBe(originalSegment); // Should be new instance
    });

    it('should remove old segment from scene during regeneration', () => {
      trackGenerator.initialize();
      
      const removeSpy = vi.spyOn(mockScene, 'remove');
      trackGenerator.regenerateSegment(3);
      
      expect(removeSpy).toHaveBeenCalled();
    });

    it('should regenerate non-existent segment', () => {
      const segment = trackGenerator.regenerateSegment(999);
      expect(segment).toBeDefined();
      expect(segment.id).toBe(999);
    });
  });

  describe('Track Type Validation', () => {
    it('should correctly identify single track segments', () => {
      expect(trackGenerator.isSegmentSingleTrack(0)).toBe(true);
      expect(trackGenerator.isSegmentSingleTrack(1)).toBe(true);
      expect(trackGenerator.isSegmentSingleTrack(2)).toBe(true);
      expect(trackGenerator.isSegmentSingleTrack(3)).toBe(false);
      expect(trackGenerator.isSegmentSingleTrack(10)).toBe(false);
    });

    it('should return correct track count for segments', () => {
      expect(trackGenerator.getTrackCountForSegment(0)).toBe(1);
      expect(trackGenerator.getTrackCountForSegment(1)).toBe(1);
      expect(trackGenerator.getTrackCountForSegment(2)).toBe(1);
      expect(trackGenerator.getTrackCountForSegment(3)).toBe(5);
      expect(trackGenerator.getTrackCountForSegment(10)).toBe(5);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle cleanup with no current position', () => {
      trackGenerator.initialize();
      expect(() => trackGenerator.cleanupOldSegments()).not.toThrow();
    });

    it('should handle generation with custom configuration', () => {
      const customConfig = {
        maxVisibleSegments: 5,
        viewDistance: 30.0,
        cleanupDistance: 45.0,
        trackSpacing: 3.0,
      };
      
      const customGenerator = new TrackGenerator(mockScene, mockConfig, customConfig);
      customGenerator.initialize();
      
      const stats = customGenerator.getGenerationStats();
      expect(stats.totalSegments).toBe(5);
    });

    it('should handle negative segment indices', () => {
      expect(trackGenerator.isSegmentSingleTrack(-1)).toBe(true); // Should default to single track
      expect(trackGenerator.getTrackCountForSegment(-1)).toBe(1);
    });

    it('should handle very large segment indices', () => {
      expect(trackGenerator.isSegmentSingleTrack(1000)).toBe(false);
      expect(trackGenerator.getTrackCountForSegment(1000)).toBe(5);
    });
  });

  describe('Performance and Memory Management', () => {
    it('should dispose all resources properly', () => {
      trackGenerator.initialize();
      
      const removeSpy = vi.spyOn(mockScene, 'remove');
      trackGenerator.dispose();
      
      expect(removeSpy).toHaveBeenCalled();
      
      const stats = trackGenerator.getGenerationStats();
      expect(stats.totalSegments).toBe(0);
    });

    it('should handle multiple dispose calls safely', () => {
      trackGenerator.initialize();
      trackGenerator.dispose();
      expect(() => trackGenerator.dispose()).not.toThrow();
    });

    it('should manage memory efficiently during long gameplay', () => {
      trackGenerator.initialize();
      
      // Simulate long gameplay with many position updates
      for (let z = 0; z < 1000; z += 50) {
        const position = new THREE.Vector3(0, 0, z);
        trackGenerator.updateGeneration(position);
        trackGenerator.cleanupOldSegments(position);
      }
      
      const stats = trackGenerator.getGenerationStats();
      // Should not accumulate too many segments
      expect(stats.totalSegments).toBeLessThan(50);
    });
  });

  describe('Scene Integration', () => {
    it('should add tracks to scene during generation', () => {
      const addSpy = vi.spyOn(mockScene, 'add');
      
      trackGenerator.generateSegment(0);
      
      expect(addSpy).toHaveBeenCalled();
    });

    it('should remove tracks from scene during cleanup', () => {
      trackGenerator.initialize();
      
      const removeSpy = vi.spyOn(mockScene, 'remove');
      
      // Move far to trigger cleanup
      const position = new THREE.Vector3(0, 0, 200);
      trackGenerator.cleanupOldSegments(position);
      
      expect(removeSpy).toHaveBeenCalled();
    });

    it('should handle scene operations safely', () => {
      // Mock scene methods to throw errors
      const mockSceneWithErrors = {
        add: vi.fn().mockImplementation(() => { throw new Error('Scene error'); }),
        remove: vi.fn(),
      };
      
      const errorGenerator = new TrackGenerator(mockSceneWithErrors as any, mockConfig);
      
      // Should handle scene errors gracefully
      expect(() => errorGenerator.generateSegment(0)).toThrow();
    });
  });

  describe('Visibility Management', () => {
    it('should update track visibility correctly', () => {
      trackGenerator.initialize();
      
      // Move to a position that makes some segments invisible
      const position = new THREE.Vector3(0, 0, 100);
      trackGenerator.updateGeneration(position);
      
      const visibleSegments = trackGenerator.getVisibleSegments();
      const allSegments = trackGenerator.getAllSegments();
      
      expect(visibleSegments.length).toBeLessThanOrEqual(allSegments.length);
    });

    it('should toggle track mesh visibility', () => {
      trackGenerator.initialize();
      
      const segment = trackGenerator.getSegment(0);
      expect(segment).toBeDefined();
      
      // All tracks should initially be visible
      segment!.tracks.forEach(track => {
        expect(track.mesh.visible).toBe(true);
      });
    });
  });
});
/**
 * Unit tests for TrackGenerator class
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { TrackGenerator } from '../TrackGenerator';
import { GameConfig, DEFAULT_CONFIG } from '../../models/GameConfig';

vi.mock('three', async () => {
    const THREE = await vi.importActual<typeof import('three')>('three');
    const mockVector3 = {
        set: vi.fn(),
        clone: vi.fn().mockReturnThis(),
    };
    return {
        ...THREE,
        Scene: vi.fn(() => ({
            add: vi.fn(),
            remove: vi.fn(),
        })),
        Vector3: vi.fn(() => mockVector3),
        MeshBasicMaterial: vi.fn(() => ({
            clone: vi.fn().mockReturnThis(),
        })),
        Mesh: vi.fn(() => ({
            position: { set: vi.fn(), clone: vi.fn().mockReturnThis(), copy: vi.fn() },
            scale: { set: vi.fn(), clone: vi.fn().mockReturnThis() },
            add: vi.fn(),
            remove: vi.fn(),
        })),
        BoxGeometry: vi.fn(() => ({
            clone: vi.fn().mockReturnThis(),
        })),
        Group: vi.fn(() => ({
            add: vi.fn(),
            remove: vi.fn(),
            position: { set: vi.fn(), clone: vi.fn().mockReturnThis(), copy: vi.fn() },
            children: [],
            traverse: vi.fn(),
        })),
    };
});

describe('TrackGenerator', () => {
  let trackGenerator: TrackGenerator;
  let mockScene: THREE.Scene;
  let gameConfig: GameConfig;

  beforeEach(() => {
    mockScene = new THREE.Scene();
    gameConfig = { ...DEFAULT_CONFIG };
    trackGenerator = new TrackGenerator(mockScene, gameConfig);
  });

  afterEach(() => {
    trackGenerator.dispose();
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(trackGenerator).toBeDefined();
    });

    it('should accept custom generation configuration', () => {
      const customConfig = { maxVisibleSegments: 15 };
      const generator = new TrackGenerator(mockScene, gameConfig, customConfig);
      expect(generator).toBeDefined();
      generator.dispose();
    });
  });

  describe('initialization', () => {
    it('should generate initial segments', () => {
      trackGenerator.initialize();
      
      const stats = trackGenerator.getGenerationStats();
      expect(stats.totalSegments).toBeGreaterThan(0);
      expect(stats.totalSegments).toBe(gameConfig.rendering.maxVisibleSegments);
    });

    it('should generate correct number of single track segments', () => {
      trackGenerator.initialize();
      
      const stats = trackGenerator.getGenerationStats();
      expect(stats.singleTrackSegments).toBe(3); // First 3 segments should be single track
    });
  });

  describe('segment generation', () => {
    it('should generate single track for initial segments', () => {
      const segment = trackGenerator.generateSegment(0);
      
      expect(segment.id).toBe(0);
      expect(segment.tracks).toHaveLength(1);
      expect(segment.isGenerated).toBe(true);
    });

    it('should generate 5 parallel tracks for later segments', () => {
      const segment = trackGenerator.generateSegment(5);
      
      expect(segment.id).toBe(5);
      expect(segment.tracks).toHaveLength(5);
      expect(segment.isGenerated).toBe(true);
    });

    it('should not regenerate existing segments', () => {
      const segment1 = trackGenerator.generateSegment(0);
      const segment2 = trackGenerator.generateSegment(0);
      
      expect(segment1).toBe(segment2);
    });

    it('should add tracks to scene', () => {
      trackGenerator.generateSegment(0);
      
      expect(mockScene.add).toHaveBeenCalled();
    });
  });

  describe('segment management', () => {
    beforeEach(() => {
      trackGenerator.initialize();
    });

    it('should get segment by index', () => {
      const segment = trackGenerator.getSegment(0);
      
      expect(segment).toBeDefined();
      expect(segment!.id).toBe(0);
    });

    it('should return undefined for non-existent segment', () => {
      const segment = trackGenerator.getSegment(999);
      
      expect(segment).toBeUndefined();
    });

    it('should get all segments', () => {
      const segments = trackGenerator.getAllSegments();
      
      expect(segments).toHaveLength(gameConfig.rendering.maxVisibleSegments);
    });

    it('should get visible segments', () => {
      const visibleSegments = trackGenerator.getVisibleSegments();
      
      expect(visibleSegments.length).toBeGreaterThan(0);
    });
  });

  describe('position-based queries', () => {
    beforeEach(() => {
      trackGenerator.initialize();
    });

    it('should get segment at specific Z position', () => {
      const segmentLength = gameConfig.tracks.segmentLength;
      const segment = trackGenerator.getSegmentAtPosition(segmentLength * 1.5);
      
      expect(segment).toBeDefined();
      expect(segment!.id).toBe(1);
    });

    it('should get tracks for specific segment', () => {
      const tracks = trackGenerator.getTracksForSegment(0);
      
      expect(tracks).toHaveLength(1); // Single track segment
    });

    it('should get track at specific position in segment', () => {
      const track = trackGenerator.getTrackAtPosition(5, 2);
      
      expect(track).toBeDefined();
    });
  });

  describe('track type detection', () => {
    it('should identify single track segments correctly', () => {
      expect(trackGenerator.isSegmentSingleTrack(0)).toBe(true);
      expect(trackGenerator.isSegmentSingleTrack(1)).toBe(true);
      expect(trackGenerator.isSegmentSingleTrack(2)).toBe(true);
      expect(trackGenerator.isSegmentSingleTrack(3)).toBe(false);
    });

    it('should return correct track count for segments', () => {
      expect(trackGenerator.getTrackCountForSegment(0)).toBe(1);
      expect(trackGenerator.getTrackCountForSegment(1)).toBe(1);
      expect(trackGenerator.getTrackCountForSegment(2)).toBe(1);
      expect(trackGenerator.getTrackCountForSegment(3)).toBe(5);
    });
  });

  describe('progressive generation', () => {
    beforeEach(() => {
      trackGenerator.initialize();
    });

    it('should generate new segments based on position', () => {
      const initialStats = trackGenerator.getGenerationStats();
      const farPosition = new THREE.Vector3(0, 0, 200);
      
      trackGenerator.updateGeneration(farPosition);
      
      const newStats = trackGenerator.getGenerationStats();
      expect(newStats.totalSegments).toBeGreaterThan(initialStats.totalSegments);
    });

    it('should update segment visibility based on distance', () => {
      const farPosition = new THREE.Vector3(0, 0, 1000);
      
      trackGenerator.updateGeneration(farPosition);
      
      // Should have updated visibility for segments
      const visibleSegments = trackGenerator.getVisibleSegments();
      expect(visibleSegments.length).toBeGreaterThan(0);
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      trackGenerator.initialize();
    });

    it('should cleanup old segments when far away', () => {
      const farPosition = new THREE.Vector3(0, 0, 1000);
      
      // Generate many segments
      trackGenerator.updateGeneration(farPosition);
      
      // Move even further to trigger cleanup
      const veryFarPosition = new THREE.Vector3(0, 0, 2000);
      trackGenerator.cleanupOldSegments(veryFarPosition);
      
      // Should have cleaned up some segments
      expect(mockScene.remove).toHaveBeenCalled();
    });

    it('should not cleanup without position', () => {
      const initialStats = trackGenerator.getGenerationStats();
      
      trackGenerator.cleanupOldSegments();
      
      const finalStats = trackGenerator.getGenerationStats();
      expect(finalStats.totalSegments).toBe(initialStats.totalSegments);
    });
  });

  describe('regeneration', () => {
    beforeEach(() => {
      trackGenerator.initialize();
    });

    it('should regenerate existing segment', () => {
      const originalSegment = trackGenerator.getSegment(0);
      expect(originalSegment).toBeDefined();
      
      const regeneratedSegment = trackGenerator.regenerateSegment(0);
      
      expect(regeneratedSegment.id).toBe(0);
      expect(mockScene.remove).toHaveBeenCalled();
    });

    it('should generate new segment if it does not exist', () => {
      const segment = trackGenerator.regenerateSegment(999);
      
      expect(segment.id).toBe(999);
    });
  });

  describe('statistics', () => {
    it('should provide accurate generation statistics', () => {
      trackGenerator.initialize();

      const initialStats = trackGenerator.getGenerationStats();
      expect(initialStats.totalSegments).toBe(gameConfig.rendering.maxVisibleSegments);

      trackGenerator.updateGeneration(new THREE.Vector3(0, 0, -gameConfig.tracks.segmentLength * 2));

      const finalStats = trackGenerator.getGenerationStats();
      expect(finalStats.totalSegments).toBeGreaterThan(initialStats.totalSegments);
    });
  });

  describe('disposal', () => {
    it('should dispose all resources', () => {
      trackGenerator.initialize();
      
      trackGenerator.dispose();
      
      expect(mockScene.remove).toHaveBeenCalled();
      
      const finalStats = trackGenerator.getGenerationStats();
      expect(finalStats.totalSegments).toBe(0);
    });
  });
});
/**
 * Unit tests for TrackGenerator class
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { TrackGenerator } from '../TrackGenerator';
import { GameConfig, DEFAULT_CONFIG } from '../../models/GameConfig';
import { Track } from '../../models/Track';

// Mock Three.js
vi.mock('three', () => ({
  Scene: vi.fn().mockImplementation(() => ({
    add: vi.fn(),
    remove: vi.fn()
  })),
  Vector3: vi.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
    x, y, z,
    clone: vi.fn().mockReturnThis(),
    copy: vi.fn().mockReturnThis(),
    distanceTo: vi.fn().mockReturnValue(5.0)
  }))
}));

// Mock Track
vi.mock('../../models/Track', () => ({
  createTrack: vi.fn().mockImplementation((id, position, colorType) => ({
    id,
    position,
    mesh: {
      visible: true,
      userData: { type: 'track', id }
    },
    dispose: vi.fn()
  })),
  TRACK_COLORS: {
    NORMAL: 0x4169E1,
    SELECTED: 0x00FF00,
    PREVIEW: 0xFFD700,
    DANGER: 0xFF4500,
    SAFE: 0x32CD32
  }
}));

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
      const initialStats = trackGenerator.getGenerationStats();
      const farPosition = new THREE.Vector3(0, 0, 1000);
      
      // Generate many segments
      trackGenerator.updateGeneration(farPosition);
      
      // Move even further to trigger cleanup
      const veryFarPosition = new THREE.Vector3(0, 0, 2000);
      trackGenerator.cleanupOldSegments(veryFarPosition);
      
      const finalStats = trackGenerator.getGenerationStats();
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
    beforeEach(() => {
      trackGenerator.initialize();
    });

    it('should provide accurate generation statistics', () => {
      const stats = trackGenerator.getGenerationStats();
      
      expect(stats.totalSegments).toBe(gameConfig.rendering.maxVisibleSegments);
      expect(stats.singleTrackSegments).toBe(3);
      expect(stats.multiTrackSegments).toBe(stats.totalSegments - 3);
      expect(stats.visibleSegments).toBeGreaterThan(0);
      expect(stats.lastGeneratedSegment).toBeGreaterThanOrEqual(0);
    });
  });

  describe('disposal', () => {
    it('should dispose all resources', () => {
      trackGenerator.initialize();
      const initialStats = trackGenerator.getGenerationStats();
      
      trackGenerator.dispose();
      
      expect(mockScene.remove).toHaveBeenCalled();
      
      const finalStats = trackGenerator.getGenerationStats();
      expect(finalStats.totalSegments).toBe(0);
    });
  });
});
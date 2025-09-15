import { describe, test, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { ObstacleManager } from '../ObstacleManager';
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

// Capture created types
const createdTypes: string[] = [];

// Mock Obstacle factory to record types in creation order
vi.mock('../../models/Obstacle', () => ({
  createObstacle: vi.fn().mockImplementation((type: any, position: any) => {
    createdTypes.push(type);
    return {
      id: Math.floor(Math.random() * 1000),
      type,
      position,
      getGroup: vi.fn().mockReturnValue({ userData: { type: 'obstacle' } }),
      getCenter: vi.fn().mockReturnValue(position),
      getSize: vi.fn().mockReturnValue({ width: 1.0, height: 0.8, length: 1.0 }),
      checkCollision: vi.fn().mockReturnValue(false),
      checkPointCollision: vi.fn().mockReturnValue(false),
      setVisible: vi.fn(),
      dispose: vi.fn()
    } as any;
  })
}));

describe('Obstacle type alternation after 5th section', () => {
  let obstacleManager: ObstacleManager;
  let mockScene: THREE.Scene;
  let mockConfigManager: GameConfigManager;
  let mockTrackSegment: TrackSegment;

  beforeEach(() => {
    createdTypes.length = 0;
    mockScene = new THREE.Scene();
    mockConfigManager = new GameConfigManager();
    obstacleManager = new ObstacleManager(mockScene, mockConfigManager);

    // Five tracks in the segment
    const mockTracks: Track[] = Array.from({ length: 5 }, (_, i) => ({
      id: i,
      position: new THREE.Vector3(i * 2, 0, 0)
    } as unknown as Track));

    mockTrackSegment = {
      id: 99,
      tracks: mockTracks,
      position: new THREE.Vector3(0, 0, 0),
      startZ: 0,
      endZ: 25,
      isVisible: true,
      isGenerated: true
    };
  });

  test('within a segment after section 5, types alternate trolley/rock/trolley/...', () => {
    // Force barrier count to 4 to observe pattern clearly
    vi.spyOn(mockConfigManager, 'getBarrierCount').mockReturnValue(4);

    // Choose a segment index in section >= 5. Sections are floor(segmentIndex / 2.5)
    const segmentIndex = 13; // floor(13 / 2.5) = 5

    obstacleManager.generateObstaclesForSegment(mockTrackSegment, segmentIndex);

    expect(createdTypes.length).toBe(4);
    expect(createdTypes[0]).toBe('trolley');
    expect(createdTypes[1]).toBe('rock');
    expect(createdTypes[2]).toBe('trolley');
    expect(createdTypes[3]).toBe('rock');
  });
});

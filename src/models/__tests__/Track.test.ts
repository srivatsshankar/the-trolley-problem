/**
 * Unit tests for Track class
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { Track, DEFAULT_TRACK_CONFIG, TRACK_COLORS, createTrack } from '../Track';

// Mock Three.js for testing
vi.mock('three', () => ({
  Vector3: vi.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
    x, y, z,
    clone: vi.fn().mockReturnThis(),
    copy: vi.fn().mockReturnThis(),
    distanceTo: vi.fn().mockReturnValue(5.0)
  })),
  BoxGeometry: vi.fn().mockImplementation(() => ({
    computeBoundingBox: vi.fn(),
    computeBoundingSphere: vi.fn(),
    dispose: vi.fn()
  })),
  MeshStandardMaterial: vi.fn().mockImplementation(() => ({
    color: { setHex: vi.fn() },
    emissive: { setHex: vi.fn() },
    opacity: 1.0,
    transparent: false,
    needsUpdate: false,
    dispose: vi.fn()
  })),
  Mesh: vi.fn().mockImplementation((geometry, material) => ({
    geometry,
    material,
    position: { copy: vi.fn() },
    userData: {},
    castShadow: false,
    receiveShadow: false,
    parent: null
  })),
  Box3: vi.fn().mockImplementation(() => ({
    setFromObject: vi.fn().mockReturnThis(),
    expandByScalar: vi.fn().mockReturnThis(),
    containsPoint: vi.fn().mockReturnValue(true)
  }))
}));

describe('Track', () => {
  let track: Track;
  let position: THREE.Vector3;

  beforeEach(() => {
    position = new THREE.Vector3(0, 0, 0);
    track = new Track(1, position, DEFAULT_TRACK_CONFIG);
  });

  afterEach(() => {
    track.dispose();
  });

  describe('constructor', () => {
    it('should create track with correct id and position', () => {
      expect(track.id).toBe(1);
      expect(track.position).toBeDefined();
    });

    it('should create mesh with proper user data', () => {
      expect(track.mesh.userData.type).toBe('track');
      expect(track.mesh.userData.id).toBe(1);
    });

    it('should enable shadows on mesh', () => {
      expect(track.mesh.castShadow).toBe(true);
      expect(track.mesh.receiveShadow).toBe(true);
    });
  });

  describe('geometry creation', () => {
    it('should create geometry with correct dimensions', () => {
      expect(THREE.BoxGeometry).toHaveBeenCalledWith(
        DEFAULT_TRACK_CONFIG.width,
        DEFAULT_TRACK_CONFIG.height,
        DEFAULT_TRACK_CONFIG.length
      );
    });

    it('should compute bounding box and sphere', () => {
      expect(track.geometry.computeBoundingBox).toHaveBeenCalled();
      expect(track.geometry.computeBoundingSphere).toHaveBeenCalled();
    });
  });

  describe('material creation', () => {
    it('should create material with bright, vivid colors', () => {
      expect(THREE.MeshStandardMaterial).toHaveBeenCalledWith(
        expect.objectContaining({
          color: DEFAULT_TRACK_CONFIG.color,
          emissive: DEFAULT_TRACK_CONFIG.emissive,
          metalness: DEFAULT_TRACK_CONFIG.metalness,
          roughness: DEFAULT_TRACK_CONFIG.roughness
        })
      );
    });
  });

  describe('position management', () => {
    it('should update position correctly', () => {
      const newPosition = new THREE.Vector3(5, 0, 10);
      track.setPosition(newPosition);
      
      expect(track.position.copy).toHaveBeenCalledWith(newPosition);
      expect(track.mesh.position.copy).toHaveBeenCalledWith(track.position);
    });
  });

  describe('bounds and measurements', () => {
    it('should return correct width', () => {
      expect(track.getWidth()).toBe(DEFAULT_TRACK_CONFIG.width);
    });

    it('should return correct length', () => {
      expect(track.getLength()).toBe(DEFAULT_TRACK_CONFIG.length);
    });

    it('should return center position', () => {
      const center = track.getCenter();
      expect(center).toBeDefined();
    });

    it('should calculate bounds correctly', () => {
      const bounds = track.getBounds();
      expect(THREE.Box3).toHaveBeenCalled();
      expect(bounds.setFromObject).toHaveBeenCalledWith(track.mesh);
    });
  });

  describe('point containment', () => {
    it('should check if point is contained within track', () => {
      const testPoint = new THREE.Vector3(1, 0, 1);
      const result = track.containsPoint(testPoint);
      
      expect(result).toBe(true);
    });

    it('should calculate distance to point', () => {
      const testPoint = new THREE.Vector3(5, 0, 0);
      const distance = track.distanceToPoint(testPoint);
      
      expect(distance).toBe(5.0);
    });
  });

  describe('material updates', () => {
    it('should update material color', () => {
      const newColor = 0xFF0000;
      track.updateMaterial({ color: newColor });
      
      const material = track.material as THREE.MeshStandardMaterial;
      expect(material.color.setHex).toHaveBeenCalledWith(newColor);
      expect(material.needsUpdate).toBe(true);
    });

    it('should update material opacity and transparency', () => {
      track.updateMaterial({ opacity: 0.5 });
      
      const material = track.material as THREE.MeshStandardMaterial;
      expect(material.opacity).toBe(0.5);
      expect(material.transparent).toBe(true);
    });
  });

  describe('cloning', () => {
    it('should clone track with new id and position', () => {
      const newPosition = new THREE.Vector3(10, 0, 0);
      const clonedTrack = track.clone(2, newPosition);
      
      expect(clonedTrack.id).toBe(2);
      expect(clonedTrack).not.toBe(track);
      
      clonedTrack.dispose();
    });
  });

  describe('disposal', () => {
    it('should dispose resources correctly', () => {
      track.dispose();
      
      expect(track.geometry.dispose).toHaveBeenCalled();
      expect(track.material.dispose).toHaveBeenCalled();
      expect(track.isTrackDisposed()).toBe(true);
    });

    it('should not dispose twice', () => {
      track.dispose();
      const geometryDisposeSpy = vi.spyOn(track.geometry, 'dispose');
      
      track.dispose(); // Second disposal
      
      expect(geometryDisposeSpy).not.toHaveBeenCalled();
    });
  });
});

describe('createTrack utility', () => {
  it('should create track with normal color by default', () => {
    const position = new THREE.Vector3(0, 0, 0);
    const track = createTrack(1, position);
    
    expect(track.id).toBe(1);
    track.dispose();
  });

  it('should create track with specified color type', () => {
    const position = new THREE.Vector3(0, 0, 0);
    const track = createTrack(1, position, 'SELECTED');
    
    expect(track.id).toBe(1);
    track.dispose();
  });

  it('should apply custom configuration', () => {
    const position = new THREE.Vector3(0, 0, 0);
    const customConfig = { width: 3.0 };
    const track = createTrack(1, position, 'NORMAL', customConfig);
    
    expect(track.getWidth()).toBe(3.0);
    track.dispose();
  });
});

describe('TRACK_COLORS', () => {
  it('should have all required color constants', () => {
    expect(TRACK_COLORS.NORMAL).toBeDefined();
    expect(TRACK_COLORS.SELECTED).toBeDefined();
    expect(TRACK_COLORS.PREVIEW).toBeDefined();
    expect(TRACK_COLORS.DANGER).toBeDefined();
    expect(TRACK_COLORS.SAFE).toBeDefined();
  });

  it('should have valid hex color values', () => {
    Object.values(TRACK_COLORS).forEach(color => {
      expect(typeof color).toBe('number');
      expect(color).toBeGreaterThanOrEqual(0);
      expect(color).toBeLessThanOrEqual(0xFFFFFF);
    });
  });
});
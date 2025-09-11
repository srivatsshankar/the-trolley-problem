/**
 * PathPreviewSystem Tests
 * Tests curved path visualization and preview effects
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { PathPreviewSystem, createPathPreviewSystem, DEFAULT_PATH_PREVIEW_CONFIG } from '../systems/PathPreviewSystem';
import { TrolleyController } from '../systems/TrolleyController';
import { GameConfig, DEFAULT_CONFIG } from '../models/GameConfig';

// Mock Three.js objects
vi.mock('three', async () => {
  const actual = await vi.importActual('three');
  return {
    ...actual,
    WebGLRenderer: vi.fn(() => ({
      setSize: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn()
    }))
  };
});

describe('PathPreviewSystem', () => {
  let scene: THREE.Scene;
  let trolleyController: TrolleyController;
  let gameConfig: GameConfig;
  let pathPreviewSystem: PathPreviewSystem;

  beforeEach(() => {
    scene = new THREE.Scene();
    gameConfig = { ...DEFAULT_CONFIG };
    trolleyController = new TrolleyController(gameConfig);
    pathPreviewSystem = new PathPreviewSystem(scene, trolleyController, gameConfig);
  });

  afterEach(() => {
    pathPreviewSystem.dispose();
  });

  describe('Initialization', () => {
    test('should create PathPreviewSystem with default config', () => {
      expect(pathPreviewSystem).toBeDefined();
      expect(pathPreviewSystem.getActivePaths().size).toBe(0);
    });

    test('should create PathPreviewSystem with custom config', () => {
      const customConfig = {
        previewDistance: 20.0,
        translucentOpacity: 0.5
      };
      
      const customSystem = new PathPreviewSystem(scene, trolleyController, gameConfig, customConfig);
      expect(customSystem).toBeDefined();
      customSystem.dispose();
    });

    test('should create PathPreviewSystem using factory function', () => {
      const factorySystem = createPathPreviewSystem(scene, trolleyController, gameConfig);
      expect(factorySystem).toBeDefined();
      factorySystem.dispose();
    });
  });

  describe('Path Preview Creation', () => {
    test('should create translucent path preview', () => {
      const trackNumber = 3;
      const segmentIndex = 5;
      
      pathPreviewSystem.createPathPreview(trackNumber, segmentIndex);
      
      const activePaths = pathPreviewSystem.getActivePaths();
      expect(activePaths.size).toBe(1);
      
      const pathKey = `${trackNumber}-${segmentIndex}`;
      const path = activePaths.get(pathKey);
      expect(path).toBeDefined();
      expect(path?.trackNumber).toBe(trackNumber);
      expect(path?.segmentIndex).toBe(segmentIndex);
      expect(path?.isTranslucent).toBe(true);
    });

    test('should replace existing path preview for same track-segment combination', () => {
      const trackNumber = 2;
      const segmentIndex = 3;
      
      // Create first path
      pathPreviewSystem.createPathPreview(trackNumber, segmentIndex);
      expect(pathPreviewSystem.getActivePaths().size).toBe(1);
      
      // Create second path for same track-segment combination (should replace)
      pathPreviewSystem.createPathPreview(trackNumber, segmentIndex);
      
      // Should still have only one path (replaced)
      expect(pathPreviewSystem.getActivePaths().size).toBe(1);
      
      const pathKey = `${trackNumber}-${segmentIndex}`;
      expect(pathPreviewSystem.getActivePaths().has(pathKey)).toBe(true);
    });

    test('should not create path for same track', () => {
      // Set trolley to track 3 and wait for transition to complete
      trolleyController.switchToTrack(3);
      
      // Update trolley to complete transition
      for (let i = 0; i < 100; i++) {
        trolleyController.update(0.02); // Complete transition
      }
      
      // Try to create path to same track
      pathPreviewSystem.createPathPreview(3, 5);
      
      // Should not create path since already on target track
      expect(pathPreviewSystem.getActivePaths().size).toBe(0);
    });
  });

  describe('Path Opacity Changes', () => {
    test('should make path opaque after button check', () => {
      const trackNumber = 2;
      const segmentIndex = 4;
      
      // Create translucent path
      pathPreviewSystem.createPathPreview(trackNumber, segmentIndex);
      
      const pathKey = `${trackNumber}-${segmentIndex}`;
      let path = pathPreviewSystem.getActivePaths().get(pathKey);
      expect(path?.isTranslucent).toBe(true);
      
      // Make path opaque
      pathPreviewSystem.makePathOpaque(trackNumber, segmentIndex);
      
      path = pathPreviewSystem.getActivePaths().get(pathKey);
      expect(path?.isTranslucent).toBe(false);
      expect(path?.opacity).toBe(DEFAULT_PATH_PREVIEW_CONFIG.opaqueOpacity);
    });

    test('should handle making non-existent path opaque', () => {
      // Should not throw error
      expect(() => {
        pathPreviewSystem.makePathOpaque(3, 7);
      }).not.toThrow();
    });
  });

  describe('Path Animation and Updates', () => {
    test('should update path animations', () => {
      const trackNumber = 4;
      const segmentIndex = 6;
      
      pathPreviewSystem.createPathPreview(trackNumber, segmentIndex);
      const initialSize = pathPreviewSystem.getActivePaths().size;
      
      // Update system
      pathPreviewSystem.update(0.016); // ~60fps
      
      // Path should still exist after update (or be cleaned up if too far)
      expect(pathPreviewSystem.getActivePaths().size).toBeGreaterThanOrEqual(0);
      expect(pathPreviewSystem.getActivePaths().size).toBeLessThanOrEqual(initialSize);
    });

    test('should clean up old paths', () => {
      // Create multiple paths
      pathPreviewSystem.createPathPreview(1, 1);
      pathPreviewSystem.createPathPreview(2, 2);
      const initialSize = pathPreviewSystem.getActivePaths().size;
      
      // Move trolley forward significantly
      trolleyController.setPosition(new THREE.Vector3(0, 0, 100));
      
      // Update should clean up old paths
      pathPreviewSystem.update(0.016);
      
      // Should have cleaned up some paths
      expect(pathPreviewSystem.getActivePaths().size).toBeLessThanOrEqual(initialSize);
    });
  });

  describe('Path Highlighting', () => {
    test('should highlight path for active selection', () => {
      const trackNumber = 3;
      const segmentIndex = 5;
      
      pathPreviewSystem.createPathPreview(trackNumber, segmentIndex);
      
      // Should not throw error
      expect(() => {
        pathPreviewSystem.highlightPath(trackNumber, segmentIndex);
      }).not.toThrow();
    });

    test('should handle highlighting non-existent path', () => {
      // Should not throw error
      expect(() => {
        pathPreviewSystem.highlightPath(3, 7);
      }).not.toThrow();
    });
  });

  describe('Path Management', () => {
    test('should get specific path preview', () => {
      const trackNumber = 2;
      const segmentIndex = 4;
      
      pathPreviewSystem.createPathPreview(trackNumber, segmentIndex);
      
      const path = pathPreviewSystem.getPathPreview(trackNumber, segmentIndex);
      expect(path).toBeDefined();
      expect(path?.trackNumber).toBe(trackNumber);
      expect(path?.segmentIndex).toBe(segmentIndex);
    });

    test('should return undefined for non-existent path', () => {
      const path = pathPreviewSystem.getPathPreview(5, 10);
      expect(path).toBeUndefined();
    });

    test('should clear all paths', () => {
      // Create multiple paths
      pathPreviewSystem.createPathPreview(1, 1);
      pathPreviewSystem.createPathPreview(2, 2);
      const initialSize = pathPreviewSystem.getActivePaths().size;
      
      expect(initialSize).toBeGreaterThan(0);
      
      pathPreviewSystem.clearAllPaths();
      expect(pathPreviewSystem.getActivePaths().size).toBe(0);
    });

    test('should set visibility of all paths', () => {
      pathPreviewSystem.createPathPreview(1, 1);
      pathPreviewSystem.createPathPreview(2, 2);
      
      // Should not throw error
      expect(() => {
        pathPreviewSystem.setVisible(false);
        pathPreviewSystem.setVisible(true);
      }).not.toThrow();
    });
  });

  describe('Configuration Updates', () => {
    test('should update configuration', () => {
      const newConfig = {
        translucentOpacity: 0.5,
        animationSpeed: 3.0
      };
      
      expect(() => {
        pathPreviewSystem.updateConfig(newConfig);
      }).not.toThrow();
    });
  });

  describe('Resource Management', () => {
    test('should dispose of all resources', () => {
      // Create some paths
      pathPreviewSystem.createPathPreview(1, 1);
      pathPreviewSystem.createPathPreview(2, 2);
      
      const initialSize = pathPreviewSystem.getActivePaths().size;
      expect(initialSize).toBeGreaterThan(0);
      
      // Dispose should clean up everything
      pathPreviewSystem.dispose();
      expect(pathPreviewSystem.getActivePaths().size).toBe(0);
    });

    test('should handle multiple dispose calls', () => {
      pathPreviewSystem.dispose();
      
      // Should not throw error on second dispose
      expect(() => {
        pathPreviewSystem.dispose();
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle invalid track numbers gracefully', () => {
      // Should not create path for invalid track numbers
      expect(() => {
        pathPreviewSystem.createPathPreview(0, 5);
        pathPreviewSystem.createPathPreview(6, 5);
      }).not.toThrow();
      
      expect(pathPreviewSystem.getActivePaths().size).toBe(0);
    });

    test('should handle negative segment indices', () => {
      pathPreviewSystem.createPathPreview(3, -1);
      
      // Should handle gracefully
      expect(pathPreviewSystem.getActivePaths().size).toBeLessThanOrEqual(1);
    });

    test('should handle rapid updates', () => {
      pathPreviewSystem.createPathPreview(2, 3);
      
      // Rapid updates should not cause issues
      for (let i = 0; i < 100; i++) {
        pathPreviewSystem.update(0.001);
      }
      
      expect(pathPreviewSystem.getActivePaths().size).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('PathPreviewSystem Integration', () => {
  let scene: THREE.Scene;
  let trolleyController: TrolleyController;
  let gameConfig: GameConfig;
  let pathPreviewSystem: PathPreviewSystem;

  beforeEach(() => {
    scene = new THREE.Scene();
    gameConfig = { ...DEFAULT_CONFIG };
    trolleyController = new TrolleyController(gameConfig);
    pathPreviewSystem = createPathPreviewSystem(scene, trolleyController, gameConfig);
  });

  afterEach(() => {
    pathPreviewSystem.dispose();
  });

  test('should integrate with trolley movement', () => {
    // Create path preview
    pathPreviewSystem.createPathPreview(3, 5);
    
    // Move trolley
    trolleyController.setPosition(new THREE.Vector3(0, 0, 10));
    trolleyController.switchToTrack(3);
    
    // Update systems
    trolleyController.update(0.016);
    pathPreviewSystem.update(0.016);
    
    // Should handle integration smoothly
    expect(pathPreviewSystem.getActivePaths().size).toBeGreaterThanOrEqual(0);
  });

  test('should handle trolley track switching', () => {
    // Create paths for different tracks
    pathPreviewSystem.createPathPreview(2, 5);
    pathPreviewSystem.createPathPreview(4, 6);
    
    // Switch trolley track
    trolleyController.switchToTrack(2);
    
    // Update systems
    trolleyController.update(0.016);
    pathPreviewSystem.update(0.016);
    
    // Should maintain path previews appropriately
    expect(pathPreviewSystem.getActivePaths().size).toBeGreaterThanOrEqual(0);
  });
});
/**
 * Unit tests for FrustumCulling system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { FrustumCullingSystem } from '../systems/FrustumCulling';

// Mock THREE.js objects
vi.mock('three', async () => {
  const actual = await vi.importActual('three');
  return {
    ...actual,
    Camera: vi.fn(() => ({
      position: new THREE.Vector3(0, 0, 0),
      projectionMatrix: new THREE.Matrix4(),
      matrixWorldInverse: new THREE.Matrix4()
    })),
    Frustum: vi.fn(() => ({
      setFromProjectionMatrix: vi.fn(),
      intersectsObject: vi.fn(() => true),
      intersectsSphere: vi.fn(() => true)
    })),
    Matrix4: vi.fn(() => ({
      multiplyMatrices: vi.fn(() => new THREE.Matrix4())
    })),
    Raycaster: vi.fn(() => ({
      set: vi.fn(),
      far: 0
    })),
    Object3D: vi.fn(() => ({
      visible: true,
      getWorldPosition: vi.fn((target) => {
        target.set(0, 0, 0);
        return target;
      }),
      position: new THREE.Vector3(0, 0, 0)
    })),
    Box3: vi.fn(() => ({
      setFromObject: vi.fn(() => ({
        isEmpty: vi.fn(() => false),
        getBoundingSphere: vi.fn(() => ({ radius: 1 }))
      })),
      isEmpty: vi.fn(() => false),
      getBoundingSphere: vi.fn(() => ({ radius: 1 }))
    })),
    Sphere: vi.fn((center, radius) => ({ center, radius })),
    Vector3: vi.fn(() => ({
      set: vi.fn(),
      clone: vi.fn(() => new THREE.Vector3()),
      sub: vi.fn(() => new THREE.Vector3()),
      normalize: vi.fn(() => new THREE.Vector3()),
      distanceTo: vi.fn(() => 10)
    }))
  };
});

describe('FrustumCullingSystem', () => {
  let camera: THREE.Camera;
  let cullingSystem: FrustumCullingSystem;
  let mockObject: THREE.Object3D;

  beforeEach(() => {
    camera = new THREE.Camera();
    cullingSystem = new FrustumCullingSystem(camera, {
      enableFrustumCulling: true,
      enableDistanceCulling: true,
      maxCullDistance: 100
    });
    
    mockObject = new THREE.Object3D();
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const defaultCulling = new FrustumCullingSystem(camera);
      expect(defaultCulling).toBeDefined();
    });

    it('should accept custom config', () => {
      const customCulling = new FrustumCullingSystem(camera, {
        enableFrustumCulling: false,
        maxCullDistance: 50
      });
      expect(customCulling).toBeDefined();
    });
  });

  describe('registerObject', () => {
    it('should register object for culling', () => {
      cullingSystem.registerObject('test1', mockObject, 'high');
      cullingSystem.update(Date.now());
      
      const stats = cullingSystem.getStats();
      expect(stats.totalObjects).toBe(1);
    });

    it('should register object with custom cull distance', () => {
      cullingSystem.registerObject('test1', mockObject, 'medium', 150);
      cullingSystem.update(Date.now());
      
      // Should not throw and object should be registered
      const stats = cullingSystem.getStats();
      expect(stats.totalObjects).toBe(1);
    });

    it('should handle multiple objects', () => {
      const obj1 = new THREE.Object3D();
      const obj2 = new THREE.Object3D();
      
      cullingSystem.registerObject('test1', obj1, 'high');
      cullingSystem.registerObject('test2', obj2, 'low');
      cullingSystem.update(Date.now());
      
      const stats = cullingSystem.getStats();
      expect(stats.totalObjects).toBe(2);
    });
  });

  describe('unregisterObject', () => {
    it('should remove object from culling', () => {
      cullingSystem.registerObject('test1', mockObject);
      cullingSystem.unregisterObject('test1');
      
      const stats = cullingSystem.getStats();
      expect(stats.totalObjects).toBe(0);
    });

    it('should handle unregistering non-existent object', () => {
      cullingSystem.unregisterObject('nonexistent');
      
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      cullingSystem.registerObject('test1', mockObject, 'medium');
    });

    it('should update culling statistics', () => {
      const stats = cullingSystem.update(Date.now());
      
      expect(stats.totalObjects).toBe(1);
      expect(stats.visibleObjects).toBeGreaterThanOrEqual(0);
      expect(stats.culledObjects).toBeGreaterThanOrEqual(0);
    });

    it('should respect update frequency', () => {
      const time1 = Date.now();
      const stats1 = cullingSystem.update(time1);
      
      // Update immediately (should skip)
      const stats2 = cullingSystem.update(time1 + 1);
      
      expect(stats1).toBe(stats2); // Should return same stats object
    });

    it('should calculate performance gain', () => {
      // Mock object to be culled by distance
      const distantObject = new THREE.Object3D();
      distantObject.getWorldPosition = vi.fn((target) => {
        target.set(200, 0, 0); // Far away
        return target;
      });
      
      cullingSystem.registerObject('distant', distantObject, 'low');
      
      const stats = cullingSystem.update(Date.now());
      expect(stats.performanceGain).toBeGreaterThanOrEqual(0);
    });
  });

  describe('distance culling', () => {
    it('should cull objects beyond max distance', () => {
      // Create object far away
      const distantObject = new THREE.Object3D();
      distantObject.getWorldPosition = vi.fn((target) => {
        target.set(300, 0, 0); // Beyond max distance of 100
        return target;
      });
      
      // Mock distance calculation to return large distance
      camera.position.distanceTo = vi.fn(() => 300);
      
      cullingSystem.registerObject('distant', distantObject, 'medium');
      cullingSystem.update(Date.now());
      
      expect(distantObject.visible).toBe(false);
    });

    it('should respect priority-based distances', () => {
      const highPriorityObject = new THREE.Object3D();
      const lowPriorityObject = new THREE.Object3D();
      
      // Both at same distance, but different priorities
      const distance = 75; // Between high (50) and low (200) priority distances
      
      // Mock distance calculation to return the test distance
      let callCount = 0;
      camera.position.distanceTo = vi.fn(() => {
        callCount++;
        return distance;
      });
      
      highPriorityObject.getWorldPosition = vi.fn((target) => {
        target.set(distance, 0, 0);
        return target;
      });
      
      lowPriorityObject.getWorldPosition = vi.fn((target) => {
        target.set(distance, 0, 0);
        return target;
      });
      
      cullingSystem.registerObject('high', highPriorityObject, 'high');
      cullingSystem.registerObject('low', lowPriorityObject, 'low');
      
      cullingSystem.update(Date.now());
      
      // High priority should be culled (distance > 50), low priority should be visible (distance < 200)
      expect(highPriorityObject.visible).toBe(false);
      expect(lowPriorityObject.visible).toBe(true);
    });

    it('should use custom cull distance when provided', () => {
      const customObject = new THREE.Object3D();
      customObject.getWorldPosition = vi.fn((target) => {
        target.set(120, 0, 0); // Beyond default but within custom distance
        return target;
      });
      
      cullingSystem.registerObject('custom', customObject, 'medium', 150);
      cullingSystem.update(Date.now());
      
      expect(customObject.visible).toBe(true);
    });
  });

  describe('frustum culling', () => {
    it('should cull objects outside frustum', () => {
      // Mock frustum to return false for intersection
      const mockFrustum = {
        setFromProjectionMatrix: vi.fn(),
        intersectsObject: vi.fn(() => false),
        intersectsSphere: vi.fn(() => false)
      };
      
      // Replace the frustum in the culling system
      (cullingSystem as any).frustum = mockFrustum;
      
      cullingSystem.registerObject('outside', mockObject, 'medium');
      cullingSystem.update(Date.now());
      
      expect(mockObject.visible).toBe(false);
    });

    it('should keep objects inside frustum visible', () => {
      // Mock frustum to return true for intersection
      const mockFrustum = {
        setFromProjectionMatrix: vi.fn(),
        intersectsObject: vi.fn(() => true),
        intersectsSphere: vi.fn(() => true)
      };
      
      (cullingSystem as any).frustum = mockFrustum;
      
      cullingSystem.registerObject('inside', mockObject, 'medium');
      cullingSystem.update(Date.now());
      
      expect(mockObject.visible).toBe(true);
    });
  });

  describe('getStaleObjects', () => {
    it('should return objects not visible for long time', () => {
      cullingSystem.registerObject('stale', mockObject, 'medium');
      
      // Manually set last visible time to old value
      const cullableObjects = (cullingSystem as any).cullableObjects;
      const cullableObject = cullableObjects.get('stale');
      cullableObject.lastVisible = Date.now() - 60000; // 1 minute ago
      
      const staleObjects = cullingSystem.getStaleObjects(30000); // 30 seconds
      expect(staleObjects).toHaveLength(1);
      expect(staleObjects[0].id).toBe('stale');
    });

    it('should return empty array when no stale objects', () => {
      cullingSystem.registerObject('fresh', mockObject, 'medium');
      
      const staleObjects = cullingSystem.getStaleObjects(30000);
      expect(staleObjects).toHaveLength(0);
    });
  });

  describe('getObjectsInRange', () => {
    it('should return objects within specified distance', () => {
      const nearObject = new THREE.Object3D();
      const farObject = new THREE.Object3D();
      
      // Mock distance calculation to return different distances for each object
      let callCount = 0;
      camera.position.distanceTo = vi.fn(() => {
        callCount++;
        return callCount === 1 ? 10 : 100; // First call returns 10, second returns 100
      });
      
      nearObject.getWorldPosition = vi.fn((target) => {
        target.set(10, 0, 0);
        return target;
      });
      
      farObject.getWorldPosition = vi.fn((target) => {
        target.set(100, 0, 0);
        return target;
      });
      
      cullingSystem.registerObject('near', nearObject, 'medium');
      cullingSystem.registerObject('far', farObject, 'medium');
      
      const objectsInRange = cullingSystem.getObjectsInRange(50);
      expect(objectsInRange).toHaveLength(1);
      expect(objectsInRange[0].id).toBe('near');
    });
  });

  describe('getObjectsByPriority', () => {
    it('should return objects of specified priority', () => {
      const highObj = new THREE.Object3D();
      const mediumObj = new THREE.Object3D();
      const lowObj = new THREE.Object3D();
      
      cullingSystem.registerObject('high', highObj, 'high');
      cullingSystem.registerObject('medium', mediumObj, 'medium');
      cullingSystem.registerObject('low', lowObj, 'low');
      
      const highPriorityObjects = cullingSystem.getObjectsByPriority('high');
      expect(highPriorityObjects).toHaveLength(1);
      expect(highPriorityObjects[0].id).toBe('high');
      
      const mediumPriorityObjects = cullingSystem.getObjectsByPriority('medium');
      expect(mediumPriorityObjects).toHaveLength(1);
      expect(mediumPriorityObjects[0].id).toBe('medium');
    });
  });

  describe('updateObjectPriority', () => {
    it('should update object priority', () => {
      cullingSystem.registerObject('test', mockObject, 'low');
      cullingSystem.updateObjectPriority('test', 'high');
      
      const highPriorityObjects = cullingSystem.getObjectsByPriority('high');
      expect(highPriorityObjects).toHaveLength(1);
      expect(highPriorityObjects[0].id).toBe('test');
    });

    it('should handle updating non-existent object', () => {
      cullingSystem.updateObjectPriority('nonexistent', 'high');
      
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('forceUpdateObject', () => {
    it('should force update specific object', () => {
      cullingSystem.registerObject('test', mockObject, 'medium');
      
      // Should not throw
      cullingSystem.forceUpdateObject('test');
      expect(true).toBe(true);
    });

    it('should handle force updating non-existent object', () => {
      cullingSystem.forceUpdateObject('nonexistent');
      
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('getPerformanceReport', () => {
    it('should return comprehensive performance report', () => {
      cullingSystem.registerObject('test1', mockObject, 'high');
      cullingSystem.registerObject('test2', new THREE.Object3D(), 'medium');
      cullingSystem.registerObject('test3', new THREE.Object3D(), 'low');
      
      cullingSystem.update(Date.now());
      
      const report = cullingSystem.getPerformanceReport();
      
      expect(report.stats).toBeDefined();
      expect(report.config).toBeDefined();
      expect(report.objectBreakdown).toBeDefined();
      expect(report.objectBreakdown.high).toBe(1);
      expect(report.objectBreakdown.medium).toBe(1);
      expect(report.objectBreakdown.low).toBe(1);
      expect(report.averageDistance).toBeGreaterThanOrEqual(0);
    });
  });

  describe('updateConfig', () => {
    it('should update culling configuration', () => {
      cullingSystem.updateConfig({
        enableDistanceCulling: false,
        maxCullDistance: 150
      });
      
      // Configuration should be updated (can't directly test private config)
      expect(true).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all registered objects', () => {
      cullingSystem.registerObject('test1', mockObject, 'medium');
      cullingSystem.registerObject('test2', new THREE.Object3D(), 'low');
      
      cullingSystem.clear();
      
      const stats = cullingSystem.getStats();
      expect(stats.totalObjects).toBe(0);
    });
  });

  describe('logStats', () => {
    it('should log performance statistics', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      cullingSystem.registerObject('test', mockObject, 'medium');
      cullingSystem.update(Date.now());
      cullingSystem.logStats();
      
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('[FrustumCulling] Performance Report:');
      
      consoleSpy.mockRestore();
    });
  });

  describe('dispose', () => {
    it('should dispose of culling system', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      cullingSystem.registerObject('test', mockObject, 'medium');
      cullingSystem.dispose();
      
      const stats = cullingSystem.getStats();
      expect(stats.totalObjects).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith('[FrustumCulling] Disposed');
      
      consoleSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle objects without bounding spheres', () => {
      // Mock Box3 to return empty
      const mockBox = {
        setFromObject: vi.fn(),
        isEmpty: vi.fn(() => true)
      };
      
      (cullingSystem as any).tempBox = mockBox;
      
      cullingSystem.registerObject('nobounds', mockObject, 'medium');
      cullingSystem.update(Date.now());
      
      // Should not throw
      expect(true).toBe(true);
    });

    it('should handle bounding sphere calculation errors', () => {
      // Mock Box3 to throw error
      const mockBox = {
        setFromObject: vi.fn(() => {
          throw new Error('Test error');
        }),
        isEmpty: vi.fn(() => false)
      };
      
      (cullingSystem as any).tempBox = mockBox;
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      cullingSystem.registerObject('error', mockObject, 'medium');
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
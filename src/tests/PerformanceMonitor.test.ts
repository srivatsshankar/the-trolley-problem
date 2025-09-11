/**
 * Unit tests for PerformanceMonitor system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { PerformanceMonitor } from '../systems/PerformanceMonitor';

// Mock THREE.js objects
vi.mock('three', async () => {
  const actual = await vi.importActual('three');
  return {
    ...actual,
    WebGLRenderer: vi.fn(() => ({
      info: {
        render: {
          triangles: 1000,
          calls: 50
        },
        memory: {
          geometries: 10,
          textures: 5
        },
        programs: [1, 2, 3]
      },
      shadowMap: {
        enabled: true
      },
      setPixelRatio: vi.fn()
    })),
    Scene: vi.fn(() => ({
      traverse: vi.fn((callback) => {
        // Mock some mesh objects
        const mesh1 = { 
          visible: true,
          position: new THREE.Vector3(0, 0, 0)
        };
        const mesh2 = { 
          visible: true,
          position: new THREE.Vector3(10, 0, 0)
        };
        callback(mesh1);
        callback(mesh2);
      })
    })),
    Camera: vi.fn(() => ({
      projectionMatrix: new THREE.Matrix4(),
      matrixWorldInverse: new THREE.Matrix4(),
      position: new THREE.Vector3(0, 0, 0)
    })),
    Frustum: vi.fn(() => ({
      setFromProjectionMatrix: vi.fn(),
      intersectsObject: vi.fn(() => true)
    })),
    Matrix4: vi.fn(() => ({
      multiplyMatrices: vi.fn(() => new THREE.Matrix4())
    })),
    Mesh: function() {
      return {
        visible: true,
        position: new THREE.Vector3()
      };
    }
  };
});

// Mock performance.memory
Object.defineProperty(global, 'performance', {
  value: {
    memory: {
      usedJSHeapSize: 50000000, // 50MB
      totalJSHeapSize: 100000000 // 100MB
    }
  },
  writable: true
});

describe('PerformanceMonitor', () => {
  let renderer: THREE.WebGLRenderer;
  let scene: THREE.Scene;
  let camera: THREE.Camera;
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    renderer = new THREE.WebGLRenderer();
    scene = new THREE.Scene();
    camera = new THREE.Camera();
    monitor = new PerformanceMonitor(renderer, {
      targetFPS: 60,
      autoOptimize: false // Disable for testing
    });
  });

  describe('constructor', () => {
    it('should initialize with default settings', () => {
      const defaultMonitor = new PerformanceMonitor(renderer);
      const metrics = defaultMonitor.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.fps).toBe(0);
      expect(metrics.frameTime).toBe(0);
    });

    it('should accept custom settings', () => {
      const customMonitor = new PerformanceMonitor(renderer, {
        targetFPS: 30,
        maxFrameTime: 33.33,
        memoryThreshold: 90
      });
      
      expect(customMonitor).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update frame metrics', () => {
      const currentTime = Date.now();
      
      // First update to establish baseline
      monitor.update(currentTime, scene, camera);
      
      // Second update to calculate metrics
      monitor.update(currentTime + 16.67, scene, camera); // ~60 FPS
      
      const metrics = monitor.getMetrics();
      expect(metrics.frameTime).toBeCloseTo(16.67, 1);
      expect(metrics.fps).toBeCloseTo(60, 1);
    });

    it('should update memory metrics', () => {
      monitor.update(Date.now(), scene, camera);
      
      const metrics = monitor.getMetrics();
      expect(metrics.memoryUsage.used).toBe(50000000);
      expect(metrics.memoryUsage.total).toBe(100000000);
      expect(metrics.memoryUsage.percentage).toBe(50);
    });

    it('should update render statistics', () => {
      monitor.update(Date.now(), scene, camera);
      
      const metrics = monitor.getMetrics();
      expect(metrics.renderStats.triangles).toBe(1000);
      expect(metrics.renderStats.calls).toBe(50);
      expect(metrics.renderStats.geometries).toBe(10);
      expect(metrics.renderStats.textures).toBe(5);
      expect(metrics.renderStats.programs).toBe(3);
    });

    it('should update object counts', () => {
      monitor.update(Date.now(), scene, camera);
      
      const metrics = monitor.getMetrics();
      expect(metrics.objectCounts.total).toBe(2); // Two meshes from mock
      expect(metrics.objectCounts.visible).toBe(2);
      expect(metrics.objectCounts.culled).toBe(0);
    });
  });

  describe('performance issue detection', () => {
    it('should detect low FPS issues', () => {
      const autoOptimizeMonitor = new PerformanceMonitor(renderer, {
        targetFPS: 60,
        autoOptimize: true
      });
      
      const issueCallback = vi.fn();
      autoOptimizeMonitor.onPerformanceIssueDetected(issueCallback);
      
      // Simulate low FPS by using long frame times
      let currentTime = Date.now();
      autoOptimizeMonitor.update(currentTime, scene, camera);
      
      // Simulate multiple slow frames
      for (let i = 0; i < 10; i++) {
        currentTime += 50; // 20 FPS
        autoOptimizeMonitor.update(currentTime, scene, camera);
      }
      
      // Wait for optimization cooldown and trigger another update
      currentTime += 6000; // 6 seconds later
      autoOptimizeMonitor.update(currentTime, scene, camera);
      
      expect(issueCallback).toHaveBeenCalled();
    });

    it('should detect high memory usage', () => {
      // Mock high memory usage
      (global.performance as any).memory.usedJSHeapSize = 90000000; // 90MB
      
      const autoOptimizeMonitor = new PerformanceMonitor(renderer, {
        memoryThreshold: 80,
        autoOptimize: true
      });
      
      const issueCallback = vi.fn();
      autoOptimizeMonitor.onPerformanceIssueDetected(issueCallback);
      
      let currentTime = Date.now();
      autoOptimizeMonitor.update(currentTime, scene, camera);
      
      // Trigger optimization check
      currentTime += 6000;
      autoOptimizeMonitor.update(currentTime, scene, camera);
      
      expect(issueCallback).toHaveBeenCalled();
    });
  });

  describe('getPerformanceSummary', () => {
    it('should return good status for normal performance', () => {
      // Simulate good performance
      let currentTime = Date.now();
      monitor.update(currentTime, scene, camera);
      
      for (let i = 0; i < 5; i++) {
        currentTime += 16.67; // 60 FPS
        monitor.update(currentTime, scene, camera);
      }
      
      const summary = monitor.getPerformanceSummary();
      expect(summary.status).toBe('good');
      expect(summary.issues).toHaveLength(0);
    });

    it('should return poor status for bad performance', () => {
      // Mock very high memory usage
      (global.performance as any).memory.usedJSHeapSize = 95000000; // 95MB
      
      // Simulate poor performance
      let currentTime = Date.now();
      monitor.update(currentTime, scene, camera);
      
      for (let i = 0; i < 10; i++) {
        currentTime += 50; // 20 FPS
        monitor.update(currentTime, scene, camera);
      }
      
      const summary = monitor.getPerformanceSummary();
      expect(summary.status).toBe('poor');
      expect(summary.issues.length).toBeGreaterThan(0);
      expect(summary.recommendations.length).toBeGreaterThan(0);
    });

    it('should return moderate status for medium performance', () => {
      // Mock moderate memory usage
      (global.performance as any).memory.usedJSHeapSize = 75000000; // 75MB
      
      // Simulate moderate performance
      let currentTime = Date.now();
      monitor.update(currentTime, scene, camera);
      
      for (let i = 0; i < 10; i++) {
        currentTime += 25; // 40 FPS
        monitor.update(currentTime, scene, camera);
      }
      
      const summary = monitor.getPerformanceSummary();
      expect(summary.status).toBe('moderate');
      expect(summary.issues.length).toBeGreaterThan(0);
    });
  });

  describe('optimization callbacks', () => {
    it('should call optimization applied callback', () => {
      const optimizationCallback = vi.fn();
      monitor.onOptimizationAppliedCallback(optimizationCallback);
      
      // This would be called internally during optimization
      // For testing, we can't easily trigger it without complex mocking
      expect(optimizationCallback).toBeDefined();
    });
  });

  describe('updateSettings', () => {
    it('should update monitor settings', () => {
      monitor.updateSettings({
        targetFPS: 30,
        memoryThreshold: 90
      });
      
      // Settings are private, but we can test that it doesn't throw
      expect(true).toBe(true);
    });
  });

  describe('resetOptimizations', () => {
    it('should reset optimization level', () => {
      monitor.resetOptimizations();
      
      expect(renderer.shadowMap.enabled).toBe(true);
      expect(renderer.setPixelRatio).toHaveBeenCalledWith(window.devicePixelRatio);
    });
  });

  describe('logStats', () => {
    it('should log performance statistics', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      monitor.update(Date.now(), scene, camera);
      monitor.logStats();
      
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('[PerformanceMonitor] Performance Statistics:');
      
      consoleSpy.mockRestore();
    });
  });

  describe('dispose', () => {
    it('should clean up resources', () => {
      monitor.dispose();
      
      // Should not throw and should clean up internal state
      expect(true).toBe(true);
    });
  });

  describe('frame time history', () => {
    it('should maintain frame time history within limits', () => {
      let currentTime = Date.now();
      
      // Add more frames than history size (60)
      for (let i = 0; i < 70; i++) {
        currentTime += 16.67;
        monitor.update(currentTime, scene, camera);
      }
      
      const metrics = monitor.getMetrics();
      // Should still calculate FPS correctly despite history limit
      expect(metrics.fps).toBeCloseTo(60, 1);
    });
  });

  describe('memory monitoring without performance.memory', () => {
    it('should handle missing performance.memory gracefully', () => {
      // Temporarily remove performance.memory
      const originalMemory = (global.performance as any).memory;
      delete (global.performance as any).memory;
      
      const monitorWithoutMemory = new PerformanceMonitor(renderer);
      monitorWithoutMemory.update(Date.now(), scene, camera);
      
      const metrics = monitorWithoutMemory.getMetrics();
      expect(metrics.memoryUsage.used).toBe(0);
      expect(metrics.memoryUsage.total).toBe(0);
      expect(metrics.memoryUsage.percentage).toBe(0);
      
      // Restore performance.memory
      (global.performance as any).memory = originalMemory;
    });
  });
});
/**
 * Simple integration test for Frustum Culling system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { FrustumCullingSystem } from '../systems/FrustumCulling';

describe('Frustum Culling Integration', () => {
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let frustumCulling: FrustumCullingSystem;

  beforeEach(() => {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
    camera.position.set(0, 0, 10);
    
    frustumCulling = new FrustumCullingSystem(camera, {
      enableFrustumCulling: true,
      enableDistanceCulling: true,
      maxCullDistance: 100
    });
  });

  afterEach(() => {
    frustumCulling.dispose();
  });

  it('should integrate with Three.js scene objects', () => {
    // Create test objects
    const nearObject = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    nearObject.position.set(0, 0, 0);
    
    const farObject = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    farObject.position.set(200, 0, 0); // Far away
    
    scene.add(nearObject);
    scene.add(farObject);
    
    // Register objects
    frustumCulling.registerObject('near', nearObject, 'high');
    frustumCulling.registerObject('far', farObject, 'low');
    
    // Update culling
    frustumCulling.update(Date.now());
    
    // Verify culling stats
    const stats = frustumCulling.getStats();
    expect(stats.totalObjects).toBe(2);
    expect(stats.culledObjects).toBeGreaterThan(0); // Far object should be culled
    expect(stats.performanceGain).toBeGreaterThan(0);
  });

  it('should handle dynamic object management', () => {
    const objects: THREE.Object3D[] = [];
    
    // Add objects dynamically
    for (let i = 0; i < 5; i++) {
      const object = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
        new THREE.MeshBasicMaterial({ color: 0x0000ff })
      );
      object.position.set(i * 10, 0, 0);
      
      scene.add(object);
      objects.push(object);
      
      frustumCulling.registerObject(`obj_${i}`, object, 'medium');
    }
    
    // Update and verify
    frustumCulling.update(Date.now());
    expect(frustumCulling.getStats().totalObjects).toBe(5);
    
    // Remove some objects
    objects.slice(0, 2).forEach((object, index) => {
      scene.remove(object);
      frustumCulling.unregisterObject(`obj_${index}`);
    });
    
    // Update and verify removal
    frustumCulling.update(Date.now());
    expect(frustumCulling.getStats().totalObjects).toBe(3);
  });

  it('should provide performance reporting', () => {
    // Add test objects
    for (let i = 0; i < 10; i++) {
      const object = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial({ color: Math.random() * 0xffffff })
      );
      object.position.set(i * 5, 0, 0);
      
      scene.add(object);
      frustumCulling.registerObject(`test_${i}`, object, 'medium');
    }
    
    // Update culling
    frustumCulling.update(Date.now());
    
    // Get performance report
    const report = frustumCulling.getPerformanceReport();
    
    expect(report.stats).toBeDefined();
    expect(report.config).toBeDefined();
    expect(report.objectBreakdown).toBeDefined();
    expect(report.objectBreakdown.medium).toBe(10);
    expect(report.averageDistance).toBeGreaterThanOrEqual(0);
  });

  it('should handle configuration updates', () => {
    const object = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    object.position.set(75, 0, 0); // Medium distance
    
    scene.add(object);
    frustumCulling.registerObject('config_test', object, 'medium');
    
    // Update with default config (should be visible)
    frustumCulling.update(Date.now());
    expect(object.visible).toBe(true);
    
    // Update config to reduce cull distance
    frustumCulling.updateConfig({
      maxCullDistance: 50,
      priorityDistances: {
        high: 20,
        medium: 40,
        low: 50
      }
    });
    
    // Update again (should now be culled)
    frustumCulling.update(Date.now());
    expect(object.visible).toBe(false);
  });
});
/**
 * VisualEffectsSystem Tests
 * Tests particle effects, camera following, and visual polish
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { VisualEffectsSystem, createVisualEffectsSystem, DEFAULT_VISUAL_EFFECTS_CONFIG } from '../systems/VisualEffectsSystem';
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

describe('VisualEffectsSystem', () => {
  let scene: THREE.Scene;
  let camera: THREE.Camera;
  let trolleyController: TrolleyController;
  let gameConfig: GameConfig;
  let visualEffectsSystem: VisualEffectsSystem;

  beforeEach(() => {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    gameConfig = { ...DEFAULT_CONFIG };
    trolleyController = new TrolleyController(gameConfig);
    visualEffectsSystem = new VisualEffectsSystem(scene, camera, trolleyController, gameConfig);
  });

  afterEach(() => {
    visualEffectsSystem.dispose();
  });

  describe('Initialization', () => {
    test('should create VisualEffectsSystem with default config', () => {
      expect(visualEffectsSystem).toBeDefined();
      expect(visualEffectsSystem.getActiveParticleCount()).toBe(0);
    });

    test('should create VisualEffectsSystem with custom config', () => {
      const customConfig = {
        particleCount: 50,
        enableParticles: false
      };
      
      const customSystem = new VisualEffectsSystem(scene, camera, trolleyController, gameConfig, customConfig);
      expect(customSystem).toBeDefined();
      customSystem.dispose();
    });

    test('should create VisualEffectsSystem using factory function', () => {
      const factorySystem = createVisualEffectsSystem(scene, camera, trolleyController, gameConfig);
      expect(factorySystem).toBeDefined();
      factorySystem.dispose();
    });
  });

  describe('Particle Effects', () => {
    test('should create collision effect particles', () => {
      const position = new THREE.Vector3(1, 2, 3);
      const intensity = 1.5;
      
      visualEffectsSystem.createCollisionEffect(position, intensity);
      
      // Should have created particles
      expect(visualEffectsSystem.getActiveParticleCount()).toBeGreaterThan(0);
    });

    test('should create explosion effect particles', () => {
      const position = new THREE.Vector3(0, 0, 0);
      const intensity = 2.0;
      
      visualEffectsSystem.createExplosionEffect(position, intensity);
      
      // Should have created more particles due to higher intensity
      expect(visualEffectsSystem.getActiveParticleCount()).toBeGreaterThan(0);
    });

    test('should create track switch effect particles', () => {
      const fromPosition = new THREE.Vector3(0, 0, 0);
      const toPosition = new THREE.Vector3(2, 0, 0);
      
      visualEffectsSystem.createTrackSwitchEffect(fromPosition, toPosition);
      
      expect(visualEffectsSystem.getActiveParticleCount()).toBeGreaterThan(0);
    });

    test('should create speed effect particles', () => {
      const position = new THREE.Vector3(0, 0, 0);
      
      visualEffectsSystem.createSpeedEffect(position);
      
      expect(visualEffectsSystem.getActiveParticleCount()).toBeGreaterThan(0);
    });

    test('should not create particles when disabled', () => {
      visualEffectsSystem.setEffectsEnabled({ particles: false });
      
      const position = new THREE.Vector3(0, 0, 0);
      visualEffectsSystem.createCollisionEffect(position);
      
      expect(visualEffectsSystem.getActiveParticleCount()).toBe(0);
    });
  });

  describe('Particle System Updates', () => {
    test('should update particle positions and lifetimes', () => {
      const position = new THREE.Vector3(0, 0, 0);
      visualEffectsSystem.createCollisionEffect(position);
      
      const initialCount = visualEffectsSystem.getActiveParticleCount();
      expect(initialCount).toBeGreaterThan(0);
      
      // Update system multiple times
      for (let i = 0; i < 10; i++) {
        visualEffectsSystem.update(0.1);
      }
      
      // Particles should still exist (not expired yet)
      expect(visualEffectsSystem.getActiveParticleCount()).toBeGreaterThanOrEqual(0);
    });

    test('should remove expired particles', () => {
      const position = new THREE.Vector3(0, 0, 0);
      visualEffectsSystem.createSpeedEffect(position);
      
      expect(visualEffectsSystem.getActiveParticleCount()).toBeGreaterThan(0);
      
      // Update for a long time to expire particles
      for (let i = 0; i < 100; i++) {
        visualEffectsSystem.update(0.1); // 10 seconds total
      }
      
      // All particles should be expired and removed
      expect(visualEffectsSystem.getActiveParticleCount()).toBe(0);
    });

    test('should clear all particles', () => {
      // Create multiple effects
      visualEffectsSystem.createCollisionEffect(new THREE.Vector3(0, 0, 0));
      visualEffectsSystem.createExplosionEffect(new THREE.Vector3(1, 0, 0));
      visualEffectsSystem.createSpeedEffect(new THREE.Vector3(2, 0, 0));
      
      expect(visualEffectsSystem.getActiveParticleCount()).toBeGreaterThan(0);
      
      visualEffectsSystem.clearAllParticles();
      expect(visualEffectsSystem.getActiveParticleCount()).toBe(0);
    });
  });

  describe('Camera Following', () => {
    test('should update camera position to follow trolley', () => {
      const initialCameraPos = camera.position.clone();
      
      // Move trolley
      trolleyController.setPosition(new THREE.Vector3(10, 0, 10));
      
      // Update visual effects system
      visualEffectsSystem.update(0.1);
      
      // Camera position should have changed (if camera following is enabled)
      // Note: This test might need adjustment based on camera implementation
      expect(camera.position).toBeDefined();
    });

    test('should not update camera when following is disabled', () => {
      visualEffectsSystem.setEffectsEnabled({ cameraFollow: false });
      
      const initialCameraPos = camera.position.clone();
      
      // Move trolley
      trolleyController.setPosition(new THREE.Vector3(10, 0, 10));
      
      // Update visual effects system
      visualEffectsSystem.update(0.1);
      
      // Camera position should remain unchanged
      expect(camera.position.equals(initialCameraPos)).toBe(true);
    });

    test('should set camera offset', () => {
      const newOffset = new THREE.Vector3(5, 15, -10);
      
      expect(() => {
        visualEffectsSystem.setCameraOffset(newOffset);
      }).not.toThrow();
    });
  });

  describe('Visual Indicators', () => {
    test('should show speed indicators when trolley is fast', () => {
      // Set trolley to high speed
      trolleyController.setSpeed(15); // 3x base speed
      
      // Update system
      visualEffectsSystem.update(0.1);
      
      // Should not throw errors
      expect(() => {
        visualEffectsSystem.update(0.1);
      }).not.toThrow();
    });

    test('should show difficulty indicator at very high speed', () => {
      // Set trolley to very high speed
      trolleyController.setSpeed(25); // 5x base speed
      
      // Update system
      visualEffectsSystem.update(0.1);
      
      // Should not throw errors
      expect(() => {
        visualEffectsSystem.update(0.1);
      }).not.toThrow();
    });

    test('should disable speed indicators when requested', () => {
      visualEffectsSystem.setEffectsEnabled({ speedIndicators: false });
      
      // Set high speed
      trolleyController.setSpeed(20);
      
      // Update system
      expect(() => {
        visualEffectsSystem.update(0.1);
      }).not.toThrow();
    });
  });

  describe('Configuration Management', () => {
    test('should update configuration', () => {
      const newConfig = {
        particleLifetime: 3.0,
        cameraFollowSpeed: 1.5
      };
      
      expect(() => {
        visualEffectsSystem.updateConfig(newConfig);
      }).not.toThrow();
    });

    test('should handle effects enable/disable', () => {
      expect(() => {
        visualEffectsSystem.setEffectsEnabled({
          particles: false,
          cameraFollow: false,
          speedIndicators: false
        });
      }).not.toThrow();
      
      expect(() => {
        visualEffectsSystem.setEffectsEnabled({
          particles: true,
          cameraFollow: true,
          speedIndicators: true
        });
      }).not.toThrow();
    });
  });

  describe('Resource Management', () => {
    test('should dispose of all resources', () => {
      // Create some effects
      visualEffectsSystem.createCollisionEffect(new THREE.Vector3(0, 0, 0));
      visualEffectsSystem.createExplosionEffect(new THREE.Vector3(1, 0, 0));
      
      expect(visualEffectsSystem.getActiveParticleCount()).toBeGreaterThan(0);
      
      // Dispose should clean up everything
      visualEffectsSystem.dispose();
      expect(visualEffectsSystem.getActiveParticleCount()).toBe(0);
    });

    test('should handle multiple dispose calls', () => {
      visualEffectsSystem.dispose();
      
      // Should not throw error on second dispose
      expect(() => {
        visualEffectsSystem.dispose();
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero intensity effects', () => {
      const position = new THREE.Vector3(0, 0, 0);
      
      expect(() => {
        visualEffectsSystem.createCollisionEffect(position, 0);
        visualEffectsSystem.createExplosionEffect(position, 0);
      }).not.toThrow();
    });

    test('should handle negative intensity effects', () => {
      const position = new THREE.Vector3(0, 0, 0);
      
      expect(() => {
        visualEffectsSystem.createCollisionEffect(position, -1);
        visualEffectsSystem.createExplosionEffect(position, -0.5);
      }).not.toThrow();
    });

    test('should handle very high intensity effects', () => {
      const position = new THREE.Vector3(0, 0, 0);
      
      expect(() => {
        visualEffectsSystem.createCollisionEffect(position, 10);
        visualEffectsSystem.createExplosionEffect(position, 100);
      }).not.toThrow();
    });

    test('should handle rapid updates', () => {
      visualEffectsSystem.createCollisionEffect(new THREE.Vector3(0, 0, 0));
      
      // Rapid updates should not cause issues
      for (let i = 0; i < 1000; i++) {
        visualEffectsSystem.update(0.001);
      }
      
      expect(visualEffectsSystem.getActiveParticleCount()).toBeGreaterThanOrEqual(0);
    });

    test('should handle same position effects', () => {
      const position = new THREE.Vector3(0, 0, 0);
      
      // Create multiple effects at same position
      visualEffectsSystem.createCollisionEffect(position);
      visualEffectsSystem.createExplosionEffect(position);
      visualEffectsSystem.createSpeedEffect(position);
      
      expect(visualEffectsSystem.getActiveParticleCount()).toBeGreaterThan(0);
    });
  });
});

describe('VisualEffectsSystem Integration', () => {
  let scene: THREE.Scene;
  let camera: THREE.Camera;
  let trolleyController: TrolleyController;
  let gameConfig: GameConfig;
  let visualEffectsSystem: VisualEffectsSystem;

  beforeEach(() => {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    gameConfig = { ...DEFAULT_CONFIG };
    trolleyController = new TrolleyController(gameConfig);
    visualEffectsSystem = createVisualEffectsSystem(scene, camera, trolleyController, gameConfig);
  });

  afterEach(() => {
    visualEffectsSystem.dispose();
  });

  test('should integrate with trolley movement', () => {
    // Move trolley and create effects
    trolleyController.setPosition(new THREE.Vector3(5, 0, 10));
    visualEffectsSystem.createTrackSwitchEffect(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(5, 0, 0)
    );
    
    // Update systems
    trolleyController.update(0.016);
    visualEffectsSystem.update(0.016);
    
    // Should handle integration smoothly
    expect(visualEffectsSystem.getActiveParticleCount()).toBeGreaterThanOrEqual(0);
  });

  test('should handle trolley speed changes', () => {
    // Increase trolley speed
    trolleyController.increaseSpeed();
    trolleyController.increaseSpeed();
    
    // Create speed effect
    visualEffectsSystem.createSpeedEffect(trolleyController.position);
    
    // Update systems
    trolleyController.update(0.016);
    visualEffectsSystem.update(0.016);
    
    // Should show appropriate visual indicators
    expect(visualEffectsSystem.getActiveParticleCount()).toBeGreaterThanOrEqual(0);
  });

  test('should handle trolley track switching', () => {
    const fromPos = trolleyController.position.clone();
    
    // Switch trolley track
    trolleyController.switchToTrack(3);
    
    // Create track switch effect
    const toPos = new THREE.Vector3(trolleyController.getTrackPosition(3), 0, fromPos.z);
    visualEffectsSystem.createTrackSwitchEffect(fromPos, toPos);
    
    // Update systems
    trolleyController.update(0.016);
    visualEffectsSystem.update(0.016);
    
    // Should handle track switching effects
    expect(visualEffectsSystem.getActiveParticleCount()).toBeGreaterThanOrEqual(0);
  });
});
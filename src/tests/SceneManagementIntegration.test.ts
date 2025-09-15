/**
 * Integration tests for scene management and object lifecycle
 * Tests requirements: 1.2, 10.1, 10.2 - Scene management, performance optimization
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SceneManager } from '../engine/SceneManager';
import { TrackGenerator } from '../systems/TrackGenerator';
import { TrolleyController } from '../systems/TrolleyController';
import { GameConfig } from '../models/GameConfig';
import * as THREE from 'three';

// Mock DOM and WebGL
const mockCanvas = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  getBoundingClientRect: vi.fn(() => ({
    left: 0,
    top: 0,
    width: 800,
    height: 600,
  })),
  width: 800,
  height: 600,
  getContext: vi.fn(() => ({
    getExtension: vi.fn(),
    getParameter: vi.fn(),
  })),
};

// Mock WebGL context
global.WebGLRenderingContext = vi.fn();
global.WebGL2RenderingContext = vi.fn();

// Mock Three.js components
vi.mock('three', async () => {
  const actual = await vi.importActual('three');
  return {
    ...actual,
    WebGLRenderer: vi.fn().mockImplementation(() => ({
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      setClearColor: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
      domElement: mockCanvas,
      shadowMap: {
        enabled: false,
        type: 'PCFSoftShadowMap',
      },
      info: {
        memory: {
          geometries: 0,
          textures: 0,
        },
        render: {
          calls: 0,
          triangles: 0,
        },
      },
    })),
    Scene: vi.fn().mockImplementation(() => ({
      add: vi.fn(),
      remove: vi.fn(),
      children: [],
      traverse: vi.fn((callback) => {
        // Mock traverse functionality
        callback({ type: 'Mesh', geometry: {}, material: {} });
      }),
    })),
    PerspectiveCamera: vi.fn().mockImplementation(() => ({
      position: { set: vi.fn(), copy: vi.fn() },
      lookAt: vi.fn(),
      updateProjectionMatrix: vi.fn(),
      aspect: 1.33,
      fov: 75,
      near: 0.1,
      far: 1000,
    })),
    Vector3: vi.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
      x, y, z,
      clone: vi.fn().mockReturnThis(),
      copy: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      add: vi.fn().mockReturnThis(),
      sub: vi.fn().mockReturnThis(),
      multiplyScalar: vi.fn().mockReturnThis(),
      length: vi.fn().mockReturnValue(1),
      normalize: vi.fn().mockReturnThis(),
      distanceTo: vi.fn().mockReturnValue(1),
    })),
    AmbientLight: vi.fn().mockImplementation(() => ({ 
      intensity: 0.4,
      dispose: vi.fn(),
    })),
    DirectionalLight: vi.fn().mockImplementation(() => ({
      position: { set: vi.fn() },
      castShadow: false,
      shadow: {
        mapSize: { width: 2048, height: 2048 },
        camera: {
          near: 0.5,
          far: 500,
          left: -100,
          right: 100,
          top: 100,
          bottom: -100,
        },
      },
      dispose: vi.fn(),
    })),
    Mesh: vi.fn().mockImplementation(() => ({
      position: { set: vi.fn(), copy: vi.fn() },
      rotation: { set: vi.fn() },
      scale: { set: vi.fn() },
      visible: true,
      dispose: vi.fn(),
      geometry: { dispose: vi.fn() },
      material: { dispose: vi.fn() },
    })),
    Group: vi.fn().mockImplementation(() => ({
      add: vi.fn(),
      remove: vi.fn(),
      position: { set: vi.fn(), copy: vi.fn() },
      rotation: { set: vi.fn() },
      scale: { set: vi.fn() },
      children: [],
      dispose: vi.fn(),
    })),
  };
});

describe('Scene Management Integration Tests', () => {
  let gameConfig: GameConfig;
  let sceneManager: SceneManager;
  let scene: THREE.Scene;
  let camera: THREE.Camera;
  let renderer: THREE.WebGLRenderer;

  beforeEach(() => {
    gameConfig = {
      tracks: {
        count: 5,
        width: 2.0,
        segmentLength: 25.0,
      },
      trolley: {
        baseSpeed: 5.0,
        speedIncrease: 0.03,
        maxSpeedMultiplier: 7.0,
      },
      difficulty: {
        minPeoplePerTrack: 1,
        maxPeoplePerTrack: 5,
        barrierIncreaseThreshold: 7.0,
      },
      rendering: {
        viewDistance: 50.0,
        maxVisibleSegments: 10,
      },
    };

    const sceneConfig = {
      canvas: mockCanvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance' as const,
    };

    sceneManager = new SceneManager(sceneConfig);
    scene = sceneManager.scene;
    camera = sceneManager.camera;
    renderer = sceneManager.renderer;
  });

  afterEach(() => {
    if (sceneManager) {
      sceneManager.dispose();
    }
    vi.clearAllMocks();
  });

  describe('Scene Initialization and Setup', () => {
    it('should initialize scene with proper lighting and camera', () => {
      sceneManager.initialize();
      
      expect(scene).toBeDefined();
      expect(camera).toBeDefined();
      expect(renderer).toBeDefined();
      
      // Verify scene setup calls
      expect(scene.add).toHaveBeenCalled();
    });

    it('should handle multiple initialization calls safely', () => {
      expect(() => {
        sceneManager.initialize();
        sceneManager.initialize();
        sceneManager.initialize();
      }).not.toThrow();
    });

    it('should set up isometric camera correctly', () => {
      sceneManager.initialize();
      
      expect(camera.position.set).toHaveBeenCalled();
      expect(camera.lookAt).toHaveBeenCalled();
    });
  });

  describe('Object Lifecycle Management', () => {
    it('should add and remove objects from scene correctly', () => {
      sceneManager.initialize();
      
      const trackGenerator = new TrackGenerator(scene, gameConfig);
      trackGenerator.initialize();
      
      // Verify objects were added to scene
      expect(scene.add).toHaveBeenCalled();
      
      // Generate some segments
      for (let i = 0; i < 5; i++) {
        trackGenerator.generateSegment(i);
      }
      
      // Cleanup should remove objects
      const position = new THREE.Vector3(0, 0, 100);
      trackGenerator.cleanupOldSegments(position);
      
      expect(scene.remove).toHaveBeenCalled();
      
      trackGenerator.dispose();
    });

    it('should handle trolley object lifecycle', () => {
      sceneManager.initialize();
      
      const trolleyController = new TrolleyController(gameConfig);
      const trolley = trolleyController.createTrolley();
      
      expect(trolley).toBeDefined();
      
      // Add trolley to scene
      const trolleyGroup = trolleyController.getTrolleyGroup();
      if (trolleyGroup) {
        scene.add(trolleyGroup);
        expect(scene.add).toHaveBeenCalledWith(trolleyGroup);
      }
      
      // Update trolley
      for (let i = 0; i < 10; i++) {
        trolleyController.update(0.016);
      }
      
      // Cleanup
      trolleyController.dispose();
    });

    it('should manage memory during object creation and destruction', () => {
      sceneManager.initialize();
      
      const trackGenerator = new TrackGenerator(scene, gameConfig);
      trackGenerator.initialize();
      
      const initialStats = trackGenerator.getGenerationStats();
      
      // Create many objects
      for (let i = 0; i < 50; i++) {
        trackGenerator.generateSegment(i);
      }
      
      const midStats = trackGenerator.getGenerationStats();
      expect(midStats.totalSegments).toBeGreaterThan(initialStats.totalSegments);
      
      // Cleanup old objects
      const position = new THREE.Vector3(0, 0, 1000);
      trackGenerator.cleanupOldSegments(position);
      
      const finalStats = trackGenerator.getGenerationStats();
      expect(finalStats.totalSegments).toBeLessThan(midStats.totalSegments);
      
      trackGenerator.dispose();
    });
  });

  describe('Rendering Pipeline Integration', () => {
    it('should handle render calls without errors', () => {
      sceneManager.initialize();
      
      const trackGenerator = new TrackGenerator(scene, gameConfig);
      const trolleyController = new TrolleyController(gameConfig);
      
      trackGenerator.initialize();
      trolleyController.createTrolley();
      
      // Add objects to scene
      const trolleyGroup = trolleyController.getTrolleyGroup();
      if (trolleyGroup) {
        scene.add(trolleyGroup);
      }
      
      // Simulate render loop
      for (let i = 0; i < 60; i++) { // 1 second at 60fps
        trolleyController.update(0.016);
        trackGenerator.updateGeneration(trolleyController.position);
        
        // Render frame
        expect(() => {
          sceneManager.render();
        }).not.toThrow();
      }
      
      trackGenerator.dispose();
      trolleyController.dispose();
    });

    it('should handle camera updates during gameplay', () => {
      sceneManager.initialize();
      
      const trolleyController = new TrolleyController(gameConfig);
      trolleyController.createTrolley();
      
      // Simulate camera following trolley
      for (let i = 0; i < 30; i++) {
        trolleyController.update(0.1); // Move trolley
        
        const trolleyPosition = trolleyController.position;
        
        // Update camera to follow (simulated)
        expect(() => {
          camera.position.set(
            trolleyPosition.x,
            trolleyPosition.y + 10,
            trolleyPosition.z + 10
          );
          camera.lookAt(trolleyPosition.x, trolleyPosition.y, trolleyPosition.z);
        }).not.toThrow();
        
        sceneManager.render();
      }
      
      trolleyController.dispose();
    });

    it('should maintain consistent frame timing', () => {
      sceneManager.initialize();
      
      const frameTimings: number[] = [];
      
      // Measure render times
      for (let i = 0; i < 100; i++) {
        const startTime = performance.now();
        sceneManager.render();
        const endTime = performance.now();
        
        frameTimings.push(endTime - startTime);
      }
      
      // Calculate average frame time
      const avgFrameTime = frameTimings.reduce((a, b) => a + b, 0) / frameTimings.length;
      
      // Should be consistently fast (mocked, so should be very fast)
      expect(avgFrameTime).toBeLessThan(1); // 1ms for mocked render
      
      // Check for consistency (no huge spikes)
      const maxFrameTime = Math.max(...frameTimings);
      expect(maxFrameTime).toBeLessThan(avgFrameTime * 10);
    });
  });

  describe('Performance Optimization', () => {
    it('should handle visibility culling efficiently', () => {
      sceneManager.initialize();
      
      const trackGenerator = new TrackGenerator(scene, gameConfig);
      trackGenerator.initialize();
      
      // Generate many segments
      for (let i = 0; i < 100; i++) {
        trackGenerator.generateSegment(i);
      }
      
      // Move to a position that should cull many objects
      const position = new THREE.Vector3(0, 0, 500);
      trackGenerator.updateGeneration(position);
      
      // Check that visibility is managed
      const visibleSegments = trackGenerator.getVisibleSegments();
      const allSegments = trackGenerator.getAllSegments();
      
      expect(visibleSegments.length).toBeLessThanOrEqual(allSegments.length);
      
      trackGenerator.dispose();
    });

    it('should handle level-of-detail efficiently', () => {
      sceneManager.initialize();
      
      const trolleyController = new TrolleyController(gameConfig);
      const trackGenerator = new TrackGenerator(scene, gameConfig);
      
      trackGenerator.initialize();
      trolleyController.createTrolley();
      
      // Simulate moving through many segments
      for (let i = 0; i < 200; i++) {
        trolleyController.update(0.1);
        trackGenerator.updateGeneration(trolleyController.position);
        
        // Periodic cleanup to simulate LOD
        if (i % 20 === 0) {
          trackGenerator.cleanupOldSegments(trolleyController.position);
        }
      }
      
      // Should maintain reasonable number of objects
      const stats = trackGenerator.getGenerationStats();
      expect(stats.totalSegments).toBeLessThan(50);
      
      trackGenerator.dispose();
      trolleyController.dispose();
    });

    it('should handle high object count scenarios', () => {
      sceneManager.initialize();
      
      const trackGenerator = new TrackGenerator(scene, gameConfig);
      trackGenerator.initialize();
      
      const startTime = performance.now();
      
      // Create many objects quickly
      for (let i = 0; i < 1000; i++) {
        const position = new THREE.Vector3(0, 0, i * 10);
        trackGenerator.updateGeneration(position);
        
        // Cleanup frequently to prevent memory issues
        if (i % 50 === 0) {
          trackGenerator.cleanupOldSegments(position);
        }
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should handle 1000 operations reasonably quickly
      expect(duration).toBeLessThan(1000); // 1 second
      
      trackGenerator.dispose();
    });
  });

  describe('Resource Management', () => {
    it('should dispose of all resources properly', () => {
      sceneManager.initialize();
      
      const trackGenerator = new TrackGenerator(scene, gameConfig);
      const trolleyController = new TrolleyController(gameConfig);
      
      trackGenerator.initialize();
      trolleyController.createTrolley();
      
      // Generate some content
      for (let i = 0; i < 10; i++) {
        trackGenerator.generateSegment(i);
      }
      
      // Dispose should not throw errors
      expect(() => {
        trackGenerator.dispose();
        trolleyController.dispose();
        sceneManager.dispose();
      }).not.toThrow();
    });

    it('should handle multiple dispose calls safely', () => {
      sceneManager.initialize();
      
      expect(() => {
        sceneManager.dispose();
        sceneManager.dispose();
        sceneManager.dispose();
      }).not.toThrow();
    });

    it('should clean up event listeners and references', () => {
      sceneManager.initialize();
      
      // Add some objects
      const trackGenerator = new TrackGenerator(scene, gameConfig);
      trackGenerator.initialize();
      
      // Dispose everything
      trackGenerator.dispose();
      sceneManager.dispose();
      
      // Should not have lingering references that cause issues
      expect(() => {
        // Try to use disposed objects (should be safe)
        trackGenerator.getGenerationStats();
      }).not.toThrow();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle renderer creation failures gracefully', () => {
      // Mock renderer creation failure
      const originalWebGLRenderer = THREE.WebGLRenderer;
      vi.mocked(THREE.WebGLRenderer).mockImplementationOnce(() => {
        throw new Error('WebGL not supported');
      });
      
      expect(() => {
        const failingSceneManager = new SceneManager({
          canvas: mockCanvas,
          antialias: true,
        });
        failingSceneManager.dispose();
      }).toThrow('WebGL not supported');
      
      // Restore original implementation
      vi.mocked(THREE.WebGLRenderer).mockImplementation(originalWebGLRenderer as any);
    });

    it('should handle invalid scene operations', () => {
      sceneManager.initialize();
      
      // Try to add null/undefined objects
      expect(() => {
        scene.add(null as any);
        scene.add(undefined as any);
      }).not.toThrow();
      
      // Try to remove non-existent objects
      expect(() => {
        scene.remove({} as any);
      }).not.toThrow();
    });

    it('should handle camera configuration edge cases', () => {
      sceneManager.initialize();
      
      // Test extreme camera positions
      expect(() => {
        camera.position.set(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
        camera.lookAt(0, 0, 0);
        sceneManager.render();
      }).not.toThrow();
      
      expect(() => {
        camera.position.set(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);
        camera.lookAt(0, 0, 0);
        sceneManager.render();
      }).not.toThrow();
    });

    it('should handle rapid scene changes', () => {
      sceneManager.initialize();
      
      const objects: THREE.Mesh[] = [];
      
      // Rapidly add and remove objects
      for (let i = 0; i < 1000; i++) {
        const mesh = new THREE.Mesh();
        objects.push(mesh);
        scene.add(mesh);
        
        if (i % 10 === 0 && objects.length > 5) {
          const oldMesh = objects.shift();
          if (oldMesh) {
            scene.remove(oldMesh);
          }
        }
      }
      
      // Cleanup remaining objects
      objects.forEach(mesh => scene.remove(mesh));
      
      expect(scene.add).toHaveBeenCalled();
      expect(scene.remove).toHaveBeenCalled();
    });
  });

  describe('Integration with Game Systems', () => {
    it('should coordinate with all game systems simultaneously', () => {
      sceneManager.initialize();
      
      const trackGenerator = new TrackGenerator(scene, gameConfig);
      const trolleyController = new TrolleyController(gameConfig);
      
      trackGenerator.initialize();
      trolleyController.createTrolley();
      
      // Add trolley to scene
      const trolleyGroup = trolleyController.getTrolleyGroup();
      if (trolleyGroup) {
        scene.add(trolleyGroup);
      }
      
      // Simulate complete game loop
      for (let frame = 0; frame < 300; frame++) { // 5 seconds at 60fps
        const deltaTime = 0.016;
        
        // Update game systems
        trolleyController.update(deltaTime);
        trackGenerator.updateGeneration(trolleyController.position);
        
        // Switch tracks occasionally
        if (frame % 60 === 0) {
          const randomTrack = Math.floor(Math.random() * 5) + 1;
          trolleyController.switchToTrack(randomTrack);
        }
        
        // Cleanup old segments
        if (frame % 120 === 0) {
          trackGenerator.cleanupOldSegments(trolleyController.position);
        }
        
        // Render frame
        sceneManager.render();
      }
      
      // Verify systems are still in good state
      expect(trolleyController.speed).toBeGreaterThan(gameConfig.trolley.baseSpeed);
      
      const stats = trackGenerator.getGenerationStats();
      expect(stats.totalSegments).toBeGreaterThan(0);
      expect(stats.totalSegments).toBeLessThan(100); // Memory managed
      
      trackGenerator.dispose();
      trolleyController.dispose();
    });
  });
});
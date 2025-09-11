/**
 * Integration tests for game systems
 * Tests requirements: 1.2, 10.1, 10.2 - Complete gameplay flow, performance, memory management
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GameEngine } from '../engine/GameEngine';
import { SceneManager } from '../engine/SceneManager';
import { GameState } from '../models/GameState';
import { GameConfig } from '../models/GameConfig';
import { TrolleyController } from '../systems/TrolleyController';
import { TrackGenerator } from '../systems/TrackGenerator';
import { InputManager } from '../systems/InputManager';
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

// Mock Three.js WebGL renderer
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
    })),
    Scene: vi.fn().mockImplementation(() => ({
      add: vi.fn(),
      remove: vi.fn(),
      children: [],
    })),
    PerspectiveCamera: vi.fn().mockImplementation(() => ({
      position: { set: vi.fn(), copy: vi.fn() },
      lookAt: vi.fn(),
      updateProjectionMatrix: vi.fn(),
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
    AmbientLight: vi.fn().mockImplementation(() => ({ intensity: 0.4 })),
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
    })),
  };
});

describe('Game Systems Integration Tests', () => {
  let gameConfig: GameConfig;
  let gameState: GameState;
  let scene: THREE.Scene;
  let camera: THREE.Camera;

  beforeEach(() => {
    gameConfig = {
      tracks: {
        count: 5,
        width: 2.0,
        segmentLength: 10.0,
      },
      trolley: {
        baseSpeed: 5.0,
        speedIncrease: 0.03,
        maxSpeedMultiplier: 5.0,
      },
      difficulty: {
        minPeoplePerTrack: 1,
        maxPeoplePerTrack: 5,
        barrierIncreaseThreshold: 5.0,
      },
      rendering: {
        viewDistance: 50.0,
        maxVisibleSegments: 10,
      },
    };

    gameState = new GameState();
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Gameplay Flow', () => {
    it('should handle complete game initialization', () => {
      // Test that all systems can be created and initialized together
      const trolleyController = new TrolleyController(gameConfig);
      const trackGenerator = new TrackGenerator(scene, gameConfig);
      
      expect(trolleyController).toBeDefined();
      expect(trackGenerator).toBeDefined();
      expect(gameState).toBeDefined();
      
      // Initialize systems
      trackGenerator.initialize();
      trolleyController.createTrolley();
      
      // Verify initial state
      expect(gameState.score).toBe(0);
      expect(gameState.currentSegment).toBe(0);
      expect(trolleyController.currentTrack).toBe(1);
      expect(trolleyController.speed).toBe(gameConfig.trolley.baseSpeed);
      
      // Cleanup
      trackGenerator.dispose();
      trolleyController.dispose();
    });

    it('should simulate basic gameplay progression', () => {
      const trolleyController = new TrolleyController(gameConfig);
      const trackGenerator = new TrackGenerator(scene, gameConfig);
      
      trackGenerator.initialize();
      trolleyController.createTrolley();
      
      // Simulate several game updates
      for (let i = 0; i < 10; i++) {
        const deltaTime = 0.016; // 60 FPS
        
        // Update trolley position
        trolleyController.update(deltaTime);
        
        // Update track generation based on trolley position
        trackGenerator.updateGeneration(trolleyController.position);
        
        // Simulate segment completion
        if (i % 3 === 0) {
          gameState.incrementSegment();
          trolleyController.increaseSpeed();
          
          // Simulate some people avoided
          gameState.processSegmentCompletion(5, 1); // 5 total, 1 hit, 4 avoided
        }
      }
      
      // Verify progression
      expect(gameState.currentSegment).toBeGreaterThan(0);
      expect(gameState.score).toBeGreaterThan(0);
      expect(trolleyController.speed).toBeGreaterThan(gameConfig.trolley.baseSpeed);
      
      // Cleanup
      trackGenerator.dispose();
      trolleyController.dispose();
    });

    it('should handle game over scenario', () => {
      const trolleyController = new TrolleyController(gameConfig);
      
      // Simulate hitting a barrier
      const collisionResults = [
        { type: 'obstacle' as const, object: {} }
      ];
      
      gameState.processCollisionResults(collisionResults);
      
      expect(gameState.isGameOver).toBe(true);
      expect(gameState.hitBarrier).toBe(true);
      
      // Game should stop progressing
      const initialSegment = gameState.currentSegment;
      gameState.incrementSegment(); // This should still work
      expect(gameState.currentSegment).toBe(initialSegment + 1);
      
      trolleyController.dispose();
    });

    it('should handle pause and resume functionality', () => {
      const trolleyController = new TrolleyController(gameConfig);
      
      // Test pause
      gameState.setPaused(true);
      expect(gameState.isPaused).toBe(true);
      
      // Game state should still be modifiable when paused
      gameState.updateScore(1, 3);
      expect(gameState.score).toBe(2); // 3 - 1
      
      // Resume
      gameState.setPaused(false);
      expect(gameState.isPaused).toBe(false);
      
      trolleyController.dispose();
    });
  });

  describe('System Interaction and Data Flow', () => {
    it('should coordinate trolley movement with track generation', () => {
      const trolleyController = new TrolleyController(gameConfig);
      const trackGenerator = new TrackGenerator(scene, gameConfig);
      
      trackGenerator.initialize();
      trolleyController.createTrolley();
      
      const initialStats = trackGenerator.getGenerationStats();
      
      // Move trolley forward significantly
      for (let i = 0; i < 100; i++) {
        trolleyController.update(0.1); // Large delta time to move quickly
        trackGenerator.updateGeneration(trolleyController.position);
      }
      
      const finalStats = trackGenerator.getGenerationStats();
      
      // Should have generated more segments
      expect(finalStats.lastGeneratedSegment).toBeGreaterThan(initialStats.lastGeneratedSegment);
      
      // Cleanup old segments should have been triggered
      trackGenerator.cleanupOldSegments(trolleyController.position);
      
      trackGenerator.dispose();
      trolleyController.dispose();
    });

    it('should handle track switching with path generation', () => {
      const trolleyController = new TrolleyController(gameConfig);
      const trackGenerator = new TrackGenerator(scene, gameConfig);
      
      trackGenerator.initialize();
      trolleyController.createTrolley();
      
      // Test track switching
      expect(trolleyController.currentTrack).toBe(1);
      
      trolleyController.switchToTrack(3);
      expect(trolleyController.targetTrack).toBe(3);
      expect(trolleyController.isTransitioning).toBe(true);
      
      // Update until transition completes
      let updates = 0;
      while (trolleyController.isTransitioning && updates < 100) {
        trolleyController.update(0.016);
        updates++;
      }
      
      expect(trolleyController.currentTrack).toBe(3);
      expect(trolleyController.isTransitioning).toBe(false);
      
      trackGenerator.dispose();
      trolleyController.dispose();
    });

    it('should coordinate speed increases with difficulty scaling', () => {
      const trolleyController = new TrolleyController(gameConfig);
      
      // Increase speed multiple times to reach high-speed threshold
      let speedIncreases = 0;
      while (!trolleyController.isHighSpeed() && speedIncreases < 100) {
        trolleyController.increaseSpeed();
        gameState.incrementSegment();
        speedIncreases++;
      }
      
      expect(trolleyController.isHighSpeed()).toBe(true);
      expect(trolleyController.getSpeedMultiplier()).toBeGreaterThanOrEqual(
        gameConfig.difficulty.barrierIncreaseThreshold
      );
      expect(gameState.currentSegment).toBeGreaterThan(0);
      
      trolleyController.dispose();
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle extended gameplay sessions without memory leaks', () => {
      const trolleyController = new TrolleyController(gameConfig);
      const trackGenerator = new TrackGenerator(scene, gameConfig);
      
      trackGenerator.initialize();
      trolleyController.createTrolley();
      
      const initialStats = trackGenerator.getGenerationStats();
      
      // Simulate long gameplay session
      for (let i = 0; i < 1000; i++) {
        trolleyController.update(0.1); // Move quickly
        trackGenerator.updateGeneration(trolleyController.position);
        
        // Periodic cleanup
        if (i % 100 === 0) {
          trackGenerator.cleanupOldSegments(trolleyController.position);
        }
        
        // Simulate game events
        if (i % 50 === 0) {
          gameState.incrementSegment();
          trolleyController.increaseSpeed();
          gameState.processSegmentCompletion(5, Math.floor(Math.random() * 3));
        }
      }
      
      const finalStats = trackGenerator.getGenerationStats();
      
      // Should not accumulate too many segments (memory management)
      expect(finalStats.totalSegments).toBeLessThan(50);
      
      // Game state should be consistent
      expect(gameState.currentSegment).toBeGreaterThan(0);
      expect(gameState.score).toBeDefined();
      expect(typeof gameState.score).toBe('number');
      
      trackGenerator.dispose();
      trolleyController.dispose();
    });

    it('should maintain consistent frame rate during complex operations', () => {
      const trolleyController = new TrolleyController(gameConfig);
      const trackGenerator = new TrackGenerator(scene, gameConfig);
      
      trackGenerator.initialize();
      trolleyController.createTrolley();
      
      const startTime = performance.now();
      const iterations = 1000;
      
      // Perform many operations that should be optimized
      for (let i = 0; i < iterations; i++) {
        trolleyController.update(0.016);
        trackGenerator.updateGeneration(trolleyController.position);
        
        // Switch tracks frequently
        if (i % 10 === 0) {
          const randomTrack = Math.floor(Math.random() * 5) + 1;
          trolleyController.switchToTrack(randomTrack);
        }
        
        // Update game state
        if (i % 20 === 0) {
          gameState.updateScore(1, 2);
        }
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const avgTimePerFrame = duration / iterations;
      
      // Should maintain reasonable performance (less than 16ms per frame for 60 FPS)
      expect(avgTimePerFrame).toBeLessThan(16);
      
      trackGenerator.dispose();
      trolleyController.dispose();
    });

    it('should handle rapid state changes efficiently', () => {
      const startTime = performance.now();
      
      // Rapid game state changes
      for (let i = 0; i < 10000; i++) {
        gameState.updateScore(1, 1);
        
        if (i % 100 === 0) {
          gameState.incrementSegment();
        }
        
        if (i % 500 === 0) {
          gameState.setPaused(!gameState.isPaused);
        }
        
        if (i % 1000 === 0) {
          gameState.setCurrentTrackPosition(Math.floor(Math.random() * 5) + 1);
        }
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should handle 10k operations quickly
      expect(duration).toBeLessThan(100);
      
      // State should be consistent
      expect(gameState.score).toBe(0); // 10k added, 10k subtracted
      expect(gameState.peopleHit).toBe(10000);
      expect(gameState.peopleAvoided).toBe(10000);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle system initialization failures gracefully', () => {
      // Test with invalid configuration
      const invalidConfig = {
        ...gameConfig,
        tracks: {
          ...gameConfig.tracks,
          count: 0, // Invalid
        },
      };
      
      expect(() => {
        const trolleyController = new TrolleyController(invalidConfig);
        trolleyController.dispose();
      }).not.toThrow();
    });

    it('should handle concurrent system operations', () => {
      const trolleyController = new TrolleyController(gameConfig);
      const trackGenerator = new TrackGenerator(scene, gameConfig);
      
      trackGenerator.initialize();
      trolleyController.createTrolley();
      
      // Simulate concurrent operations
      const operations = [];
      
      for (let i = 0; i < 100; i++) {
        operations.push(() => {
          trolleyController.update(0.016);
          trackGenerator.updateGeneration(trolleyController.position);
          gameState.updateScore(1, 1);
        });
      }
      
      // Execute all operations
      expect(() => {
        operations.forEach(op => op());
      }).not.toThrow();
      
      trackGenerator.dispose();
      trolleyController.dispose();
    });

    it('should handle resource cleanup properly', () => {
      const trolleyController = new TrolleyController(gameConfig);
      const trackGenerator = new TrackGenerator(scene, gameConfig);
      
      trackGenerator.initialize();
      trolleyController.createTrolley();
      
      // Generate some content
      for (let i = 0; i < 10; i++) {
        trolleyController.update(0.1);
        trackGenerator.updateGeneration(trolleyController.position);
      }
      
      // Cleanup should not throw errors
      expect(() => {
        trackGenerator.dispose();
        trolleyController.dispose();
      }).not.toThrow();
      
      // Multiple dispose calls should be safe
      expect(() => {
        trackGenerator.dispose();
        trolleyController.dispose();
      }).not.toThrow();
    });
  });

  describe('Cross-Browser Compatibility Simulation', () => {
    it('should handle different timing scenarios', () => {
      const trolleyController = new TrolleyController(gameConfig);
      
      // Test with various delta times (simulating different frame rates)
      const deltaTimes = [0.008, 0.016, 0.033, 0.1, 0.5]; // 120fps to 2fps
      
      deltaTimes.forEach(deltaTime => {
        expect(() => {
          trolleyController.update(deltaTime);
        }).not.toThrow();
      });
      
      trolleyController.dispose();
    });

    it('should handle precision differences', () => {
      const trolleyController = new TrolleyController(gameConfig);
      
      // Test with high precision and low precision numbers
      const precisionTests = [
        0.016666666666666666, // High precision
        0.017, // Rounded
        1/60, // Calculated
        0.016000000000000014, // Floating point error
      ];
      
      precisionTests.forEach(deltaTime => {
        expect(() => {
          trolleyController.update(deltaTime);
        }).not.toThrow();
      });
      
      trolleyController.dispose();
    });

    it('should handle memory constraints simulation', () => {
      const trackGenerator = new TrackGenerator(scene, gameConfig);
      
      trackGenerator.initialize();
      
      // Simulate memory pressure by generating many segments
      const position = new THREE.Vector3(0, 0, 0);
      
      for (let i = 0; i < 100; i++) {
        position.z += 50; // Move forward
        trackGenerator.updateGeneration(position);
        
        // Force cleanup frequently (simulating memory pressure)
        if (i % 5 === 0) {
          trackGenerator.cleanupOldSegments(position);
        }
      }
      
      const stats = trackGenerator.getGenerationStats();
      expect(stats.totalSegments).toBeLessThan(50); // Should manage memory
      
      trackGenerator.dispose();
    });
  });

  describe('State Consistency', () => {
    it('should maintain consistent state across system interactions', () => {
      const trolleyController = new TrolleyController(gameConfig);
      const trackGenerator = new TrackGenerator(scene, gameConfig);
      
      trackGenerator.initialize();
      trolleyController.createTrolley();
      
      // Perform complex sequence of operations
      for (let i = 0; i < 50; i++) {
        // Move trolley
        trolleyController.update(0.1);
        
        // Switch tracks occasionally
        if (i % 10 === 0) {
          trolleyController.switchToTrack((i % 5) + 1);
        }
        
        // Update track generation
        trackGenerator.updateGeneration(trolleyController.position);
        
        // Update game state
        gameState.incrementSegment();
        gameState.processSegmentCompletion(5, Math.floor(Math.random() * 3));
        
        // Increase speed
        trolleyController.increaseSpeed();
      }
      
      // Verify all systems are in consistent state
      expect(trolleyController.currentTrack).toBeGreaterThanOrEqual(1);
      expect(trolleyController.currentTrack).toBeLessThanOrEqual(5);
      expect(trolleyController.speed).toBeGreaterThan(gameConfig.trolley.baseSpeed);
      expect(gameState.currentSegment).toBe(50);
      expect(gameState.score).toBeDefined();
      expect(typeof gameState.score).toBe('number');
      
      const stats = trackGenerator.getGenerationStats();
      expect(stats.totalSegments).toBeGreaterThan(0);
      
      trackGenerator.dispose();
      trolleyController.dispose();
    });

    it('should handle state serialization and restoration', () => {
      // Set up complex game state
      gameState.updateScore(10, 25);
      gameState.incrementSegment();
      gameState.incrementSegment();
      gameState.setCurrentTrackPosition(4);
      
      // Serialize state
      const serializedState = gameState.serialize();
      
      // Create new game state and restore
      const newGameState = new GameState();
      newGameState.deserialize(serializedState);
      
      // Verify state is identical
      expect(newGameState.score).toBe(gameState.score);
      expect(newGameState.peopleHit).toBe(gameState.peopleHit);
      expect(newGameState.peopleAvoided).toBe(gameState.peopleAvoided);
      expect(newGameState.currentSegment).toBe(gameState.currentSegment);
      expect(newGameState.currentTrackPosition).toBe(gameState.currentTrackPosition);
    });
  });
});
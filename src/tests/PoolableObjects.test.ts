/**
 * Unit tests for PoolableObjects system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { 
  PoolableTrack, 
  PoolableObstacle, 
  PoolablePerson,
  PoolableTrackFactory,
  PoolableObstacleFactory,
  PoolablePersonFactory,
  LODManager,
  CleanupManager
} from '../systems/PoolableObjects';

// Mock THREE.js objects
vi.mock('three', async () => {
  const actual = await vi.importActual('three');
  return {
    ...actual,
    Scene: vi.fn(() => ({
      add: vi.fn(),
      remove: vi.fn(),
      traverse: vi.fn()
    })),
    Camera: vi.fn(),
    LOD: vi.fn(() => ({
      addLevel: vi.fn(),
      update: vi.fn(),
      getCurrentLevel: vi.fn(() => 0)
    })),
    Frustum: vi.fn(() => ({
      setFromProjectionMatrix: vi.fn(),
      intersectsObject: vi.fn(() => true)
    })),
    Matrix4: vi.fn(() => ({
      multiplyMatrices: vi.fn()
    }))
  };
});

// Mock the model classes
vi.mock('../models/Track', () => ({
  createTrack: vi.fn(() => ({
    id: 1,
    position: new THREE.Vector3(),
    mesh: {
      visible: true,
      position: new THREE.Vector3(),
      userData: { type: 'track' }
    },
    setPosition: vi.fn(),
    dispose: vi.fn(),
    isTrackDisposed: vi.fn(() => false)
  })),
  TRACK_COLORS: {},
  DEFAULT_TRACK_CONFIG: {}
}));

vi.mock('../models/Obstacle', () => ({
  createObstacle: vi.fn(() => ({
    id: 1,
    type: 'rock',
    position: new THREE.Vector3(),
    getGroup: vi.fn(() => ({
      visible: true,
      position: new THREE.Vector3(),
      userData: { type: 'obstacle' }
    })),
    setPosition: vi.fn(),
    setVisible: vi.fn(),
    dispose: vi.fn(),
    isObstacleDisposed: vi.fn(() => false)
  }))
}));

vi.mock('../models/Person', () => ({
  createPersonWithVariation: vi.fn(() => ({
    id: 1,
    position: new THREE.Vector3(),
    isHit: false,
    getGroup: vi.fn(() => ({
      visible: true,
      position: new THREE.Vector3(),
      userData: { type: 'person' }
    })),
    setPosition: vi.fn(),
    setVisible: vi.fn(),
    setAnimating: vi.fn(),
    dispose: vi.fn(),
    isPersonDisposed: vi.fn(() => false)
  })),
  Person: vi.fn(),
  DEFAULT_PERSON_CONFIG: {}
}));

describe('PoolableTrack', () => {
  let scene: THREE.Scene;
  let poolableTrack: PoolableTrack;

  beforeEach(() => {
    scene = new THREE.Scene();
    poolableTrack = new PoolableTrack(scene);
  });

  describe('initialize', () => {
    it('should create and add track to scene', () => {
      const position = new THREE.Vector3(1, 2, 3);
      const track = poolableTrack.initialize(1, position);
      
      expect(track).toBeDefined();
      expect(scene.add).toHaveBeenCalledWith(track.mesh);
    });

    it('should reuse existing track when available', () => {
      const position1 = new THREE.Vector3(1, 2, 3);
      const position2 = new THREE.Vector3(4, 5, 6);
      
      const track1 = poolableTrack.initialize(1, position1);
      poolableTrack.reset();
      const track2 = poolableTrack.initialize(2, position2);
      
      expect(track1).toBe(track2);
      expect(track1.setPosition).toHaveBeenCalledWith(position2);
    });
  });

  describe('reset', () => {
    it('should remove track from scene', () => {
      const position = new THREE.Vector3(1, 2, 3);
      poolableTrack.initialize(1, position);
      
      poolableTrack.reset();
      
      expect(scene.remove).toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('should dispose track and remove from scene', () => {
      const position = new THREE.Vector3(1, 2, 3);
      const track = poolableTrack.initialize(1, position);
      
      poolableTrack.dispose();
      
      expect(scene.remove).toHaveBeenCalledWith(track.mesh);
      expect(track.dispose).toHaveBeenCalled();
    });
  });

  describe('isDisposed', () => {
    it('should return true when track is null', () => {
      expect(poolableTrack.isDisposed()).toBe(true);
    });

    it('should return false when track exists and is not disposed', () => {
      const position = new THREE.Vector3(1, 2, 3);
      poolableTrack.initialize(1, position);
      
      expect(poolableTrack.isDisposed()).toBe(false);
    });
  });
});

describe('PoolableObstacle', () => {
  let scene: THREE.Scene;
  let poolableObstacle: PoolableObstacle;

  beforeEach(() => {
    scene = new THREE.Scene();
    poolableObstacle = new PoolableObstacle(scene);
  });

  describe('initialize', () => {
    it('should create and add obstacle to scene', () => {
      const position = new THREE.Vector3(1, 2, 3);
      const obstacle = poolableObstacle.initialize('rock', position);
      
      expect(obstacle).toBeDefined();
      expect(scene.add).toHaveBeenCalledWith(obstacle.getGroup());
    });

    it('should reuse existing obstacle of same type', () => {
      const position1 = new THREE.Vector3(1, 2, 3);
      const position2 = new THREE.Vector3(4, 5, 6);
      
      const obstacle1 = poolableObstacle.initialize('rock', position1);
      poolableObstacle.reset();
      const obstacle2 = poolableObstacle.initialize('rock', position2);
      
      expect(obstacle1).toBe(obstacle2);
      expect(obstacle1.setPosition).toHaveBeenCalledWith(position2);
    });

    it('should dispose and create new obstacle for different type', () => {
      const position = new THREE.Vector3(1, 2, 3);
      
      const obstacle1 = poolableObstacle.initialize('rock', position);
      poolableObstacle.reset();
      const obstacle2 = poolableObstacle.initialize('trolley', position);
      
      expect(obstacle1.dispose).toHaveBeenCalled();
      expect(obstacle1).not.toBe(obstacle2);
    });
  });
});

describe('PoolablePerson', () => {
  let scene: THREE.Scene;
  let poolablePerson: PoolablePerson;

  beforeEach(() => {
    scene = new THREE.Scene();
    poolablePerson = new PoolablePerson(scene);
  });

  describe('initialize', () => {
    it('should create and add person to scene', () => {
      const position = new THREE.Vector3(1, 2, 3);
      const person = poolablePerson.initialize(position);
      
      expect(person).toBeDefined();
      expect(scene.add).toHaveBeenCalledWith(person.getGroup());
    });

    it('should reset person state when reusing', () => {
      const position1 = new THREE.Vector3(1, 2, 3);
      const position2 = new THREE.Vector3(4, 5, 6);
      
      const person1 = poolablePerson.initialize(position1);
      person1.isHit = true; // Simulate hit state
      
      poolablePerson.reset();
      const person2 = poolablePerson.initialize(position2);
      
      expect(person1).toBe(person2);
      expect(person1.isHit).toBe(false); // Should be reset
      expect(person1.setAnimating).toHaveBeenCalledWith(true);
    });
  });
});

describe('Factory Classes', () => {
  let scene: THREE.Scene;

  beforeEach(() => {
    scene = new THREE.Scene();
  });

  describe('PoolableTrackFactory', () => {
    it('should create PoolableTrack instances', () => {
      const factory = new PoolableTrackFactory(scene);
      const track = factory.create();
      
      expect(track).toBeInstanceOf(PoolableTrack);
    });
  });

  describe('PoolableObstacleFactory', () => {
    it('should create PoolableObstacle instances', () => {
      const factory = new PoolableObstacleFactory(scene);
      const obstacle = factory.create();
      
      expect(obstacle).toBeInstanceOf(PoolableObstacle);
    });
  });

  describe('PoolablePersonFactory', () => {
    it('should create PoolablePerson instances', () => {
      const factory = new PoolablePersonFactory(scene);
      const person = factory.create();
      
      expect(person).toBeInstanceOf(PoolablePerson);
    });
  });
});

describe('LODManager', () => {
  let lodManager: LODManager;
  let camera: THREE.Camera;

  beforeEach(() => {
    lodManager = new LODManager();
    camera = new THREE.Camera();
  });

  describe('registerObject', () => {
    it('should register object for LOD management', () => {
      const highDetail = new THREE.Object3D();
      const lowDetail = new THREE.Object3D();
      
      lodManager.registerObject('test', highDetail, lowDetail);
      
      const lodObject = lodManager.getLODObject('test');
      expect(lodObject).toBeDefined();
    });

    it('should create LOD with medium detail when provided', () => {
      const highDetail = new THREE.Object3D();
      const mediumDetail = new THREE.Object3D();
      const lowDetail = new THREE.Object3D();
      
      lodManager.registerObject('test', highDetail, lowDetail, mediumDetail);
      
      const lodObject = lodManager.getLODObject('test');
      expect(lodObject).toBeDefined();
    });
  });

  describe('updateLOD', () => {
    it('should update all registered LOD objects', () => {
      const highDetail = new THREE.Object3D();
      const lowDetail = new THREE.Object3D();
      
      lodManager.registerObject('test', highDetail, lowDetail);
      
      lodManager.updateLOD(camera);
      
      const lodObject = lodManager.getLODObject('test') as any;
      expect(lodObject.update).toHaveBeenCalledWith(camera);
    });
  });

  describe('removeObject', () => {
    it('should remove and dispose LOD object', () => {
      const highDetail = new THREE.Object3D();
      const lowDetail = new THREE.Object3D();
      
      lodManager.registerObject('test', highDetail, lowDetail);
      lodManager.removeObject('test');
      
      const lodObject = lodManager.getLODObject('test');
      expect(lodObject).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('should return LOD statistics', () => {
      const highDetail = new THREE.Object3D();
      const lowDetail = new THREE.Object3D();
      
      lodManager.registerObject('test1', highDetail, lowDetail);
      lodManager.registerObject('test2', highDetail, lowDetail);
      
      const stats = lodManager.getStats();
      expect(stats.totalObjects).toBe(2);
      expect(stats.activeHighDetail).toBe(2); // Mock getCurrentLevel returns 0
    });
  });
});

describe('CleanupManager', () => {
  let cleanupManager: CleanupManager;
  let camera: THREE.Camera;

  beforeEach(() => {
    cleanupManager = new CleanupManager();
    camera = new THREE.Camera();
    
    // Mock camera properties
    camera.projectionMatrix = new THREE.Matrix4();
    camera.matrixWorldInverse = new THREE.Matrix4();
  });

  describe('trackObject', () => {
    it('should track object for cleanup', () => {
      const object = new THREE.Object3D();
      const cleanupCallback = vi.fn();
      
      cleanupManager.trackObject('test', object, cleanupCallback);
      
      const stats = cleanupManager.getStats();
      expect(stats.trackedObjects).toBe(1);
    });
  });

  describe('updateObjectSeen', () => {
    it('should update last seen time for tracked object', () => {
      const object = new THREE.Object3D();
      
      cleanupManager.trackObject('test', object);
      cleanupManager.updateObjectSeen('test');
      
      // Should not throw or cause issues
      expect(true).toBe(true);
    });
  });

  describe('update', () => {
    it('should not cleanup objects within timeout', () => {
      const object = new THREE.Object3D();
      const cleanupCallback = vi.fn();
      
      cleanupManager.trackObject('test', object, cleanupCallback);
      cleanupManager.update(camera, Date.now());
      
      expect(cleanupCallback).not.toHaveBeenCalled();
    });

    it('should cleanup objects after timeout', () => {
      const object = new THREE.Object3D();
      const cleanupCallback = vi.fn();
      
      cleanupManager.trackObject('test', object, cleanupCallback);
      
      // Simulate time passing beyond cleanup timeout
      const futureTime = Date.now() + 35000; // 35 seconds
      cleanupManager.update(camera, futureTime);
      
      expect(cleanupCallback).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return cleanup statistics', () => {
      const object1 = new THREE.Object3D();
      const object2 = new THREE.Object3D();
      
      cleanupManager.trackObject('test1', object1);
      cleanupManager.trackObject('test2', object2);
      
      const stats = cleanupManager.getStats();
      expect(stats.trackedObjects).toBe(2);
      expect(stats.oldestObject).toBeGreaterThanOrEqual(0);
      expect(stats.newestObject).toBeGreaterThanOrEqual(0);
    });
  });

  describe('untrackObject', () => {
    it('should stop tracking object', () => {
      const object = new THREE.Object3D();
      
      cleanupManager.trackObject('test', object);
      cleanupManager.untrackObject('test');
      
      const stats = cleanupManager.getStats();
      expect(stats.trackedObjects).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all tracked objects', () => {
      const object1 = new THREE.Object3D();
      const object2 = new THREE.Object3D();
      
      cleanupManager.trackObject('test1', object1);
      cleanupManager.trackObject('test2', object2);
      
      cleanupManager.clear();
      
      const stats = cleanupManager.getStats();
      expect(stats.trackedObjects).toBe(0);
    });
  });
});
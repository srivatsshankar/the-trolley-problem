/**
 * PoolableObjects - Poolable wrappers for game objects
 * Implements requirements: 10.1, 10.2, 10.3
 */

import * as THREE from 'three';
import { Poolable, PoolableFactory } from './ObjectPool';
import { Track, createTrack, TrackConfig } from '../models/Track';
import { Obstacle, createObstacle, ObstacleType, ObstacleConfig } from '../models/Obstacle';
import { Person, createPersonWithVariation, PersonConfig, DEFAULT_PERSON_CONFIG } from '../models/Person';

/**
 * Poolable Track wrapper
 */
export class PoolableTrack implements Poolable {
  private track: Track | null = null;
  private isActive: boolean = false;

  constructor(private scene: THREE.Scene) {}

  public initialize(id: number, position: THREE.Vector3, config?: Partial<TrackConfig>): Track {
    if (this.track) {
      // Reuse existing track
      this.track.setPosition(position);
      this.scene.add(this.track.mesh);
    } else {
      // Create new track
      this.track = createTrack(id, position, 'NORMAL', config);
      this.scene.add(this.track.mesh);
    }
    
    this.isActive = true;
    return this.track;
  }

  public getTrack(): Track | null {
    return this.track;
  }

  public reset(): void {
    if (this.track && this.isActive) {
      // Remove from scene but don't dispose
      this.scene.remove(this.track.mesh);
      this.track.mesh.visible = true; // Reset visibility
      this.isActive = false;
    }
  }

  public dispose(): void {
    if (this.track) {
      this.scene.remove(this.track.mesh);
      this.track.dispose();
      this.track = null;
    }
    this.isActive = false;
  }

  public isDisposed(): boolean {
    return this.track === null || this.track.isTrackDisposed();
  }
}

/**
 * Poolable Obstacle wrapper
 */
export class PoolableObstacle implements Poolable {
  private obstacle: Obstacle | null = null;
  private isActive: boolean = false;

  constructor(private scene: THREE.Scene) {}

  public initialize(type: ObstacleType, position: THREE.Vector3, config?: Partial<ObstacleConfig>): Obstacle {
    if (this.obstacle && this.obstacle.type === type) {
      // Reuse existing obstacle of same type
      this.obstacle.setPosition(position);
      this.scene.add(this.obstacle.getGroup());
    } else {
      // Dispose old obstacle if different type
      if (this.obstacle) {
        this.obstacle.dispose();
      }
      
      // Create new obstacle
      this.obstacle = createObstacle(type, position, config);
      this.scene.add(this.obstacle.getGroup());
    }
    
    this.isActive = true;
    return this.obstacle;
  }

  public getObstacle(): Obstacle | null {
    return this.obstacle;
  }

  public reset(): void {
    if (this.obstacle && this.isActive) {
      // Remove from scene but don't dispose
      this.scene.remove(this.obstacle.getGroup());
      this.obstacle.setVisible(true); // Reset visibility
      this.isActive = false;
    }
  }

  public dispose(): void {
    if (this.obstacle) {
      this.scene.remove(this.obstacle.getGroup());
      this.obstacle.dispose();
      this.obstacle = null;
    }
    this.isActive = false;
  }

  public isDisposed(): boolean {
    return this.obstacle === null || this.obstacle.isObstacleDisposed();
  }
}

/**
 * Poolable Person wrapper
 */
export class PoolablePerson implements Poolable {
  private person: Person | null = null;
  private isActive: boolean = false;

  constructor(private scene: THREE.Scene) {}

  public initialize(position: THREE.Vector3, config?: Partial<PersonConfig>): Person {
    if (this.person) {
      // Reuse existing person
      this.person.setPosition(position);
      this.person.isHit = false; // Reset hit state
      this.person.setAnimating(true); // Re-enable animations
      this.scene.add(this.person.getGroup());
    } else {
      // Create new person
      if (config) {
        this.person = new Person({ ...DEFAULT_PERSON_CONFIG, position, ...config });
      } else {
        this.person = createPersonWithVariation(position);
      }
      this.scene.add(this.person.getGroup());
    }
    
    this.isActive = true;
    return this.person;
  }

  public getPerson(): Person | null {
    return this.person;
  }

  public reset(): void {
    if (this.person && this.isActive) {
      // Remove from scene but don't dispose
      this.scene.remove(this.person.getGroup());
      this.person.setVisible(true); // Reset visibility
      this.person.setAnimating(false); // Stop animations
      this.isActive = false;
    }
  }

  public dispose(): void {
    if (this.person) {
      this.scene.remove(this.person.getGroup());
      this.person.dispose();
      this.person = null;
    }
    this.isActive = false;
  }

  public isDisposed(): boolean {
    return this.person === null || this.person.isPersonDisposed();
  }
}

/**
 * Factory for creating poolable tracks
 */
export class PoolableTrackFactory implements PoolableFactory<PoolableTrack> {
  constructor(private scene: THREE.Scene) {}

  public create(): PoolableTrack {
    return new PoolableTrack(this.scene);
  }
}

/**
 * Factory for creating poolable obstacles
 */
export class PoolableObstacleFactory implements PoolableFactory<PoolableObstacle> {
  constructor(private scene: THREE.Scene) {}

  public create(): PoolableObstacle {
    return new PoolableObstacle(this.scene);
  }
}

/**
 * Factory for creating poolable people
 */
export class PoolablePersonFactory implements PoolableFactory<PoolablePerson> {
  constructor(private scene: THREE.Scene) {}

  public create(): PoolablePerson {
    return new PoolablePerson(this.scene);
  }
}

/**
 * Level of Detail (LOD) manager for distant objects
 */
export class LODManager {
  private lodObjects: Map<string, {
    object: THREE.Object3D;
    highDetail: THREE.Object3D;
    lowDetail: THREE.Object3D;
    mediumDetail?: THREE.Object3D;
  }> = new Map();

  private readonly HIGH_DETAIL_DISTANCE = 50;
  private readonly MEDIUM_DETAIL_DISTANCE = 100;
  // private readonly _LOW_DETAIL_DISTANCE = 200;

  /**
   * Register an object for LOD management
   */
  public registerObject(
    id: string,
    highDetail: THREE.Object3D,
    lowDetail: THREE.Object3D,
    mediumDetail?: THREE.Object3D
  ): void {
    // Create LOD object
    const lod = new THREE.LOD();
    lod.addLevel(highDetail, 0);
    
    if (mediumDetail) {
      lod.addLevel(mediumDetail, this.HIGH_DETAIL_DISTANCE);
      lod.addLevel(lowDetail, this.MEDIUM_DETAIL_DISTANCE);
    } else {
      lod.addLevel(lowDetail, this.HIGH_DETAIL_DISTANCE);
    }

    this.lodObjects.set(id, {
      object: lod,
      highDetail,
      lowDetail,
      mediumDetail
    });
  }

  /**
   * Update LOD based on camera position
   */
  public updateLOD(camera: THREE.Camera): void {
    this.lodObjects.forEach(lodData => {
      if (lodData.object instanceof THREE.LOD) {
        lodData.object.update(camera);
      }
    });
  }

  /**
   * Get LOD object by ID
   */
  public getLODObject(id: string): THREE.Object3D | undefined {
    return this.lodObjects.get(id)?.object;
  }

  /**
   * Remove LOD object
   */
  public removeObject(id: string): void {
    const lodData = this.lodObjects.get(id);
    if (lodData) {
      // Dispose of all detail levels
      lodData.highDetail.traverse(child => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });

      lodData.lowDetail.traverse(child => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });

      if (lodData.mediumDetail) {
        lodData.mediumDetail.traverse(child => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(mat => mat.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
      }

      this.lodObjects.delete(id);
    }
  }

  /**
   * Clear all LOD objects
   */
  public clear(): void {
    const ids = Array.from(this.lodObjects.keys());
    ids.forEach(id => this.removeObject(id));
  }

  /**
   * Get LOD statistics
   */
  public getStats(): {
    totalObjects: number;
    activeHighDetail: number;
    activeMediumDetail: number;
    activeLowDetail: number;
  } {
    let activeHigh = 0;
    let activeMedium = 0;
    let activeLow = 0;

    this.lodObjects.forEach(lodData => {
      if (lodData.object instanceof THREE.LOD) {
        const currentLevel = lodData.object.getCurrentLevel();
        if (currentLevel === 0) activeHigh++;
        else if (currentLevel === 1 && lodData.mediumDetail) activeMedium++;
        else activeLow++;
      }
    });

    return {
      totalObjects: this.lodObjects.size,
      activeHighDetail: activeHigh,
      activeMediumDetail: activeMedium,
      activeLowDetail: activeLow
    };
  }
}

/**
 * Automatic cleanup system for off-screen objects
 */
export class CleanupManager {
  private trackedObjects: Map<string, {
    object: THREE.Object3D;
    lastSeen: number;
    cleanupCallback?: () => void;
  }> = new Map();

  private readonly CLEANUP_TIMEOUT = 30000; // 30 seconds
  private readonly UPDATE_INTERVAL = 5000; // 5 seconds
  private lastUpdate: number = 0;

  /**
   * Track an object for automatic cleanup
   */
  public trackObject(
    id: string,
    object: THREE.Object3D,
    cleanupCallback?: () => void
  ): void {
    this.trackedObjects.set(id, {
      object,
      lastSeen: Date.now(),
      cleanupCallback
    });
  }

  /**
   * Update object last seen time
   */
  public updateObjectSeen(id: string): void {
    const tracked = this.trackedObjects.get(id);
    if (tracked) {
      tracked.lastSeen = Date.now();
    }
  }

  /**
   * Update cleanup system
   */
  public update(camera: THREE.Camera, currentTime: number): void {
    if (currentTime - this.lastUpdate < this.UPDATE_INTERVAL) {
      return;
    }

    const frustum = new THREE.Frustum();
    const matrix = new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    frustum.setFromProjectionMatrix(matrix);

    const objectsToCleanup: string[] = [];

    this.trackedObjects.forEach((tracked, id) => {
      // Check if object is in view
      const inView = frustum.intersectsObject(tracked.object);
      
      if (inView) {
        tracked.lastSeen = currentTime;
      } else {
        // Check if object should be cleaned up
        const timeSinceLastSeen = currentTime - tracked.lastSeen;
        if (timeSinceLastSeen > this.CLEANUP_TIMEOUT) {
          objectsToCleanup.push(id);
        }
      }
    });

    // Cleanup old objects
    objectsToCleanup.forEach(id => {
      const tracked = this.trackedObjects.get(id);
      if (tracked) {
        if (tracked.cleanupCallback) {
          tracked.cleanupCallback();
        }
        this.trackedObjects.delete(id);
      }
    });

    if (objectsToCleanup.length > 0) {
      console.log(`[CleanupManager] Cleaned up ${objectsToCleanup.length} objects`);
    }

    this.lastUpdate = currentTime;
  }

  /**
   * Stop tracking an object
   */
  public untrackObject(id: string): void {
    this.trackedObjects.delete(id);
  }

  /**
   * Get cleanup statistics
   */
  public getStats(): {
    trackedObjects: number;
    oldestObject: number;
    newestObject: number;
  } {
    const now = Date.now();
    let oldest = now;
    let newest = 0;

    this.trackedObjects.forEach(tracked => {
      oldest = Math.min(oldest, tracked.lastSeen);
      newest = Math.max(newest, tracked.lastSeen);
    });

    return {
      trackedObjects: this.trackedObjects.size,
      oldestObject: oldest === now ? 0 : now - oldest,
      newestObject: newest === 0 ? 0 : now - newest
    };
  }

  /**
   * Clear all tracked objects
   */
  public clear(): void {
    this.trackedObjects.clear();
  }
}
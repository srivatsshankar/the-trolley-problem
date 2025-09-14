/**
 * FrustumCulling - Advanced view frustum culling system
 * Implements requirements: 10.1, 10.2
 */

import * as THREE from 'three';

export interface CullableObject {
  object: THREE.Object3D;
  id: string;
  priority: 'high' | 'medium' | 'low';
  lastVisible: number;
  boundingSphere?: THREE.Sphere;
  customCullDistance?: number;
}

export interface CullingStats {
  totalObjects: number;
  visibleObjects: number;
  culledObjects: number;
  culledByFrustum: number;
  culledByDistance: number;
  culledByOcclusion: number;
  performanceGain: number; // Percentage of objects culled
}

export interface CullingConfig {
  enableFrustumCulling: boolean;
  enableDistanceCulling: boolean;
  enableOcclusionCulling: boolean;
  maxCullDistance: number;
  occlusionTestSamples: number;
  updateFrequency: number; // How often to update culling (in ms)
  priorityDistances: {
    high: number;
    medium: number;
    low: number;
  };
  /** Additional distance ahead to preload content */
  preloadDistance: number;
}

/**
 * Advanced frustum culling system with distance and occlusion culling
 */
export class FrustumCullingSystem {
  private camera: THREE.Camera;
  private config: CullingConfig;
  private cullableObjects: Map<string, CullableObject> = new Map();
  
  // Culling components
  private frustum: THREE.Frustum = new THREE.Frustum();
  private cameraMatrix: THREE.Matrix4 = new THREE.Matrix4();
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  
  // Performance tracking
  private stats: CullingStats = {
    totalObjects: 0,
    visibleObjects: 0,
    culledObjects: 0,
    culledByFrustum: 0,
    culledByDistance: 0,
    culledByOcclusion: 0,
    performanceGain: 0
  };
  
  // Update timing
  private lastUpdate: number = 0;
  private updateCounter: number = 0;
  
  // Temporary objects for calculations
  private tempVector: THREE.Vector3 = new THREE.Vector3();
  private tempBox: THREE.Box3 = new THREE.Box3();

  constructor(camera: THREE.Camera, config: Partial<CullingConfig> = {}) {
    this.camera = camera;
    this.config = {
      enableFrustumCulling: true,
      enableDistanceCulling: true,
      enableOcclusionCulling: false, // Expensive, disabled by default
      maxCullDistance: 200,
      occlusionTestSamples: 5,
      updateFrequency: 16, // ~60 FPS
      priorityDistances: {
        high: 50,
        medium: 100,
        low: 200
      },
      preloadDistance: 40, // Preload content 40 units ahead
      ...config
    };
  }

  /**
   * Register an object for culling
   */
  public registerObject(
    id: string,
    object: THREE.Object3D,
    priority: 'high' | 'medium' | 'low' = 'medium',
    customCullDistance?: number
  ): void {
    // Calculate bounding sphere for more accurate culling
    const boundingSphere = this.calculateBoundingSphere(object);
    
    const cullableObject: CullableObject = {
      object,
      id,
      priority,
      lastVisible: Date.now(),
      boundingSphere,
      customCullDistance
    };
    
    this.cullableObjects.set(id, cullableObject);
  }

  /**
   * Unregister an object from culling
   */
  public unregisterObject(id: string): void {
    this.cullableObjects.delete(id);
  }

  /**
   * Update culling for all registered objects
   */
  public update(currentTime: number): CullingStats {
    // Check if we should update based on frequency
    if (currentTime - this.lastUpdate < this.config.updateFrequency) {
      return this.stats;
    }

    this.lastUpdate = currentTime;
    this.updateCounter++;

    // Update frustum from camera
    this.updateFrustum();

    // Reset stats
    this.resetStats();

    // Process all cullable objects
    this.cullableObjects.forEach((cullableObject) => {
      this.processCullableObject(cullableObject, currentTime);
    });

    // Calculate performance gain
    this.stats.performanceGain = this.stats.totalObjects > 0 
      ? (this.stats.culledObjects / this.stats.totalObjects) * 100 
      : 0;

    return this.stats;
  }

  /**
   * Update frustum from camera
   */
  private updateFrustum(): void {
    this.cameraMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.cameraMatrix);
  }

  /**
   * Reset statistics for new frame
   */
  private resetStats(): void {
    this.stats.totalObjects = this.cullableObjects.size;
    this.stats.visibleObjects = 0;
    this.stats.culledObjects = 0;
    this.stats.culledByFrustum = 0;
    this.stats.culledByDistance = 0;
    this.stats.culledByOcclusion = 0;
  }

  /**
   * Process a single cullable object
   */
  private processCullableObject(cullableObject: CullableObject, currentTime: number): void {
    const { object, priority, customCullDistance } = cullableObject;
    let shouldBeVisible = true;

    // Get object world position
    object.getWorldPosition(this.tempVector);
    const distanceToCamera = this.camera.position.distanceTo(this.tempVector);

    // Distance culling - but extend distance for preloading
    if (this.config.enableDistanceCulling && shouldBeVisible) {
      const baseCullDistance = customCullDistance || this.config.priorityDistances[priority];
      // Extend culling distance with preload distance for better content visibility
      const effectiveCullDistance = baseCullDistance + this.config.preloadDistance;
      
      if (distanceToCamera > effectiveCullDistance) {
        shouldBeVisible = false;
        this.stats.culledByDistance++;
      }
    }

    // Frustum culling
    if (this.config.enableFrustumCulling && shouldBeVisible) {
      if (!this.isObjectInFrustum(object, cullableObject.boundingSphere)) {
        shouldBeVisible = false;
        this.stats.culledByFrustum++;
      }
    }

    // Occlusion culling (expensive, only for high priority objects)
    if (this.config.enableOcclusionCulling && shouldBeVisible && priority === 'high') {
      if (this.isObjectOccluded(object, distanceToCamera)) {
        shouldBeVisible = false;
        this.stats.culledByOcclusion++;
      }
    }

    // Apply visibility
    if (object.visible !== shouldBeVisible) {
      object.visible = shouldBeVisible;
      
      // Update last visible time
      if (shouldBeVisible) {
        cullableObject.lastVisible = currentTime;
      }
    }

    // Update statistics
    if (shouldBeVisible) {
      this.stats.visibleObjects++;
    } else {
      this.stats.culledObjects++;
    }
  }

  /**
   * Check if object is within camera frustum
   */
  private isObjectInFrustum(object: THREE.Object3D, boundingSphere?: THREE.Sphere): boolean {
    if (boundingSphere) {
      // Use bounding sphere for more accurate culling
      return this.frustum.intersectsSphere(boundingSphere);
    } else {
      // Fallback to object intersection
      return this.frustum.intersectsObject(object);
    }
  }

  /**
   * Check if object is occluded by other objects (expensive)
   */
  private isObjectOccluded(object: THREE.Object3D, distance: number): boolean {
    if (!this.config.enableOcclusionCulling) {
      return false;
    }

    // Get object world position
    object.getWorldPosition(this.tempVector);
    
    // Cast rays from camera to object to check for occlusion
    const direction = this.tempVector.clone().sub(this.camera.position).normalize();
    this.raycaster.set(this.camera.position, direction);
    this.raycaster.far = distance;

    // Simple occlusion test - if there are objects between camera and target
    // This is a simplified version - a full implementation would need scene context
    return false; // Disabled for now as it requires scene context
  }

  /**
   * Calculate bounding sphere for an object
   */
  private calculateBoundingSphere(object: THREE.Object3D): THREE.Sphere | undefined {
    try {
      // Calculate bounding box first
      this.tempBox.setFromObject(object);
      
      if (this.tempBox.isEmpty()) {
        return undefined;
      }

      // Create bounding sphere from bounding box
      const center = new THREE.Vector3();
      const radius = this.tempBox.getBoundingSphere(new THREE.Sphere(center, 0)).radius;
      
      return new THREE.Sphere(center, radius);
    } catch (error) {
      console.warn('[FrustumCulling] Failed to calculate bounding sphere:', error);
      return undefined;
    }
  }

  /**
   * Get objects that haven't been visible for a certain time
   */
  public getStaleObjects(maxAge: number = 30000): CullableObject[] {
    const currentTime = Date.now();
    const staleObjects: CullableObject[] = [];

    this.cullableObjects.forEach((cullableObject) => {
      const age = currentTime - cullableObject.lastVisible;
      if (age > maxAge) {
        staleObjects.push(cullableObject);
      }
    });

    return staleObjects;
  }

  /**
   * Get objects within a certain distance from camera
   */
  public getObjectsInRange(maxDistance: number): CullableObject[] {
    const objectsInRange: CullableObject[] = [];

    this.cullableObjects.forEach((cullableObject) => {
      cullableObject.object.getWorldPosition(this.tempVector);
      const distance = this.camera.position.distanceTo(this.tempVector);
      
      if (distance <= maxDistance) {
        objectsInRange.push(cullableObject);
      }
    });

    return objectsInRange;
  }

  /**
   * Get objects by priority level
   */
  public getObjectsByPriority(priority: 'high' | 'medium' | 'low'): CullableObject[] {
    const objects: CullableObject[] = [];

    this.cullableObjects.forEach((cullableObject) => {
      if (cullableObject.priority === priority) {
        objects.push(cullableObject);
      }
    });

    return objects;
  }

  /**
   * Update object priority
   */
  public updateObjectPriority(id: string, priority: 'high' | 'medium' | 'low'): void {
    const cullableObject = this.cullableObjects.get(id);
    if (cullableObject) {
      cullableObject.priority = priority;
    }
  }

  /**
   * Force visibility update for specific object
   */
  public forceUpdateObject(id: string): void {
    const cullableObject = this.cullableObjects.get(id);
    if (cullableObject) {
      this.processCullableObject(cullableObject, Date.now());
    }
  }

  /**
   * Get current culling statistics
   */
  public getStats(): CullingStats {
    return { ...this.stats };
  }

  /**
   * Get detailed performance report
   */
  public getPerformanceReport(): {
    stats: CullingStats;
    config: CullingConfig;
    objectBreakdown: {
      high: number;
      medium: number;
      low: number;
    };
    averageDistance: number;
    updateFrequency: number;
  } {
    const objectBreakdown = { high: 0, medium: 0, low: 0 };
    let totalDistance = 0;
    let visibleCount = 0;

    this.cullableObjects.forEach((cullableObject) => {
      objectBreakdown[cullableObject.priority]++;
      
      if (cullableObject.object.visible) {
        cullableObject.object.getWorldPosition(this.tempVector);
        totalDistance += this.camera.position.distanceTo(this.tempVector);
        visibleCount++;
      }
    });

    return {
      stats: this.getStats(),
      config: { ...this.config },
      objectBreakdown,
      averageDistance: visibleCount > 0 ? totalDistance / visibleCount : 0,
      updateFrequency: this.updateCounter > 0 ? 
        (Date.now() - this.lastUpdate + this.config.updateFrequency) / this.updateCounter : 0
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<CullingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Clear all registered objects
   */
  public clear(): void {
    this.cullableObjects.clear();
    this.resetStats();
  }

  /**
   * Log performance statistics
   */
  public logStats(): void {
    const report = this.getPerformanceReport();
    
    console.log('[FrustumCulling] Performance Report:');
    console.log(`  Total Objects: ${report.stats.totalObjects}`);
    console.log(`  Visible: ${report.stats.visibleObjects}`);
    console.log(`  Culled: ${report.stats.culledObjects} (${report.stats.performanceGain.toFixed(1)}%)`);
    console.log(`    - By Frustum: ${report.stats.culledByFrustum}`);
    console.log(`    - By Distance: ${report.stats.culledByDistance}`);
    console.log(`    - By Occlusion: ${report.stats.culledByOcclusion}`);
    console.log(`  Priority Breakdown: High=${report.objectBreakdown.high}, Medium=${report.objectBreakdown.medium}, Low=${report.objectBreakdown.low}`);
    console.log(`  Average Distance: ${report.averageDistance.toFixed(1)}`);
    console.log(`  Update Frequency: ${report.updateFrequency.toFixed(1)}ms`);
  }

  /**
   * Dispose of the culling system
   */
  public dispose(): void {
    this.clear();
    console.log('[FrustumCulling] Disposed');
  }
}
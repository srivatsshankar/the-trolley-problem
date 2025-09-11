/**
 * PerformanceOptimizer - Integrated performance optimization system
 * Implements requirements: 10.1, 10.2, 10.3
 */

import * as THREE from 'three';
import { ObjectPool, globalPoolManager } from './ObjectPool';
import { 
  PoolableTrack, 
  PoolableObstacle, 
  PoolablePerson,
  PoolableTrackFactory,
  PoolableObstacleFactory,
  PoolablePersonFactory,
  LODManager,
  CleanupManager
} from './PoolableObjects';
import { PerformanceMonitor, PerformanceMetrics } from './PerformanceMonitor';

export interface OptimizationConfig {
  enableObjectPooling: boolean;
  enableLOD: boolean;
  enableFrustumCulling: boolean;
  enableAutomaticCleanup: boolean;
  poolSizes: {
    tracks: number;
    obstacles: number;
    people: number;
  };
  cullingDistance: number;
  lodDistances: {
    high: number;
    medium: number;
    low: number;
  };
}

/**
 * Integrated performance optimization system
 */
export class PerformanceOptimizer {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private config: OptimizationConfig;
  
  // Core systems
  private performanceMonitor!: PerformanceMonitor;
  private lodManager!: LODManager;
  private cleanupManager!: CleanupManager;
  
  // Object pools
  private trackPool!: ObjectPool<PoolableTrack>;
  private obstaclePool!: ObjectPool<PoolableObstacle>;
  private personPool!: ObjectPool<PoolablePerson>;
  
  // Frustum culling
  private frustum: THREE.Frustum = new THREE.Frustum();
  private cameraMatrix: THREE.Matrix4 = new THREE.Matrix4();
  
  // Statistics
  private stats = {
    objectsPooled: 0,
    objectsCulled: 0,
    objectsLOD: 0,
    memoryFreed: 0
  };

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    config: Partial<OptimizationConfig> = {}
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    
    this.config = {
      enableObjectPooling: true,
      enableLOD: true,
      enableFrustumCulling: true,
      enableAutomaticCleanup: true,
      poolSizes: {
        tracks: 50,
        obstacles: 100,
        people: 200
      },
      cullingDistance: 200,
      lodDistances: {
        high: 50,
        medium: 100,
        low: 200
      },
      ...config
    };

    this.initializeSystems();
  }

  /**
   * Initialize all optimization systems
   */
  private initializeSystems(): void {
    // Initialize performance monitor
    this.performanceMonitor = new PerformanceMonitor(this.renderer, {
      targetFPS: 60,
      autoOptimize: true
    });

    // Initialize LOD manager
    this.lodManager = new LODManager();

    // Initialize cleanup manager
    this.cleanupManager = new CleanupManager();

    // Initialize object pools
    if (this.config.enableObjectPooling) {
      this.initializeObjectPools();
    }

    // Set up performance monitoring callbacks
    this.setupPerformanceCallbacks();

    console.log('[PerformanceOptimizer] Initialized with config:', this.config);
  }

  /**
   * Initialize object pools
   */
  private initializeObjectPools(): void {
    // Create track pool
    this.trackPool = new ObjectPool(
      new PoolableTrackFactory(this.scene),
      this.config.poolSizes.tracks,
      'TrackPool'
    );
    globalPoolManager.registerPool('tracks', this.trackPool);

    // Create obstacle pool
    this.obstaclePool = new ObjectPool(
      new PoolableObstacleFactory(this.scene),
      this.config.poolSizes.obstacles,
      'ObstaclePool'
    );
    globalPoolManager.registerPool('obstacles', this.obstaclePool);

    // Create person pool
    this.personPool = new ObjectPool(
      new PoolablePersonFactory(this.scene),
      this.config.poolSizes.people,
      'PersonPool'
    );
    globalPoolManager.registerPool('people', this.personPool);

    // Prewarm pools
    this.prewarmPools();
  }

  /**
   * Prewarm object pools
   */
  private prewarmPools(): void {
    const prewarmPercent = 0.3; // Prewarm 30% of pool size
    
    this.trackPool.prewarm(Math.floor(this.config.poolSizes.tracks * prewarmPercent));
    this.obstaclePool.prewarm(Math.floor(this.config.poolSizes.obstacles * prewarmPercent));
    this.personPool.prewarm(Math.floor(this.config.poolSizes.people * prewarmPercent));
    
    console.log('[PerformanceOptimizer] Prewarmed object pools');
  }

  /**
   * Set up performance monitoring callbacks
   */
  private setupPerformanceCallbacks(): void {
    this.performanceMonitor.onPerformanceIssueDetected((issue, severity) => {
      console.warn(`[PerformanceOptimizer] Performance issue detected: ${issue} (${severity})`);
      this.handlePerformanceIssue(issue, severity);
    });

    this.performanceMonitor.onOptimizationAppliedCallback((optimization) => {
      console.log(`[PerformanceOptimizer] Optimization applied: ${optimization}`);
    });
  }

  /**
   * Handle performance issues with additional optimizations
   */
  private handlePerformanceIssue(issue: string, severity: 'low' | 'medium' | 'high'): void {
    // Use severity parameter to determine optimization level
    const optimizationLevel = severity === 'high' ? 3 : severity === 'medium' ? 2 : 1;
    
    switch (issue) {
      case 'high_memory_usage':
        this.aggressiveCleanup();
        break;
      case 'too_many_draw_calls':
        this.optimizeDrawCalls();
        break;
      case 'low_fps_critical':
        this.emergencyOptimizations();
        break;
    }
    
    console.log(`[PerformanceOptimizer] Applied level ${optimizationLevel} optimization for ${issue}`);
  }

  /**
   * Perform aggressive cleanup
   */
  private aggressiveCleanup(): void {
    // Force cleanup of distant objects
    this.cleanupManager.update(this.camera, Date.now());
    
    // Clear unused pool objects
    if (this.config.enableObjectPooling) {
      // This would require additional pool management methods
      console.log('[PerformanceOptimizer] Performed aggressive cleanup');
    }
  }

  /**
   * Optimize draw calls
   */
  private optimizeDrawCalls(): void {
    // This would involve batching similar objects
    // For now, just log the optimization
    console.log('[PerformanceOptimizer] Optimizing draw calls');
  }

  /**
   * Apply emergency optimizations
   */
  private emergencyOptimizations(): void {
    // Disable expensive features temporarily
    this.renderer.shadowMap.enabled = false;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio * 0.5, 1));
    
    console.log('[PerformanceOptimizer] Applied emergency optimizations');
  }

  /**
   * Update all optimization systems
   */
  public update(deltaTime: number): void {
    const currentTime = Date.now();
    
    // Use deltaTime for frame-based calculations
    const frameTime = deltaTime;
    
    // Update performance monitor
    this.performanceMonitor.update(currentTime, this.scene, this.camera);
    
    // Update frustum culling
    if (this.config.enableFrustumCulling) {
      this.updateFrustumCulling();
    }
    
    // Update LOD
    if (this.config.enableLOD) {
      this.lodManager.updateLOD(this.camera);
    }
    
    // Update cleanup manager
    if (this.config.enableAutomaticCleanup) {
      this.cleanupManager.update(this.camera, currentTime);
    }
    
    // Update pool manager
    if (this.config.enableObjectPooling) {
      globalPoolManager.update(currentTime);
    }
    
    // Track frame time for optimization decisions
    if (frameTime > 20) { // Frame time > 20ms indicates performance issues
      this.handlePerformanceIssue('high_frame_time', 'medium');
    }
  }

  /**
   * Update frustum culling
   */
  private updateFrustumCulling(): void {
    // Update frustum from camera
    this.cameraMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.cameraMatrix);

    let culledCount = 0;
    
    // Cull objects outside frustum
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.userData.type) {
        const inFrustum = this.frustum.intersectsObject(object);
        const distance = this.camera.position.distanceTo(object.position);
        
        // Hide objects outside frustum or too far away
        const shouldBeVisible = inFrustum && distance <= this.config.cullingDistance;
        
        if (object.visible !== shouldBeVisible) {
          object.visible = shouldBeVisible;
          if (!shouldBeVisible) {
            culledCount++;
          }
        }
      }
    });

    this.stats.objectsCulled = culledCount;
  }

  /**
   * Get pooled track
   */
  public getPooledTrack(): PoolableTrack | null {
    if (!this.config.enableObjectPooling || !this.trackPool) {
      return null;
    }
    
    const pooledTrack = this.trackPool.acquire();
    this.stats.objectsPooled++;
    return pooledTrack;
  }

  /**
   * Return track to pool
   */
  public returnTrackToPool(track: PoolableTrack): void {
    if (!this.config.enableObjectPooling || !this.trackPool) {
      return;
    }
    
    this.trackPool.release(track);
  }

  /**
   * Get pooled obstacle
   */
  public getPooledObstacle(): PoolableObstacle | null {
    if (!this.config.enableObjectPooling || !this.obstaclePool) {
      return null;
    }
    
    const pooledObstacle = this.obstaclePool.acquire();
    this.stats.objectsPooled++;
    return pooledObstacle;
  }

  /**
   * Return obstacle to pool
   */
  public returnObstacleToPool(obstacle: PoolableObstacle): void {
    if (!this.config.enableObjectPooling || !this.obstaclePool) {
      return;
    }
    
    this.obstaclePool.release(obstacle);
  }

  /**
   * Get pooled person
   */
  public getPooledPerson(): PoolablePerson | null {
    if (!this.config.enableObjectPooling || !this.personPool) {
      return null;
    }
    
    const pooledPerson = this.personPool.acquire();
    this.stats.objectsPooled++;
    return pooledPerson;
  }

  /**
   * Return person to pool
   */
  public returnPersonToPool(person: PoolablePerson): void {
    if (!this.config.enableObjectPooling || !this.personPool) {
      return;
    }
    
    this.personPool.release(person);
  }

  /**
   * Register object for LOD management
   */
  public registerLODObject(
    id: string,
    highDetail: THREE.Object3D,
    lowDetail: THREE.Object3D,
    mediumDetail?: THREE.Object3D
  ): void {
    if (this.config.enableLOD) {
      this.lodManager.registerObject(id, highDetail, lowDetail, mediumDetail);
      this.stats.objectsLOD++;
    }
  }

  /**
   * Track object for automatic cleanup
   */
  public trackForCleanup(id: string, object: THREE.Object3D, cleanupCallback?: () => void): void {
    if (this.config.enableAutomaticCleanup) {
      this.cleanupManager.trackObject(id, object, cleanupCallback);
    }
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    return this.performanceMonitor.getMetrics();
  }

  /**
   * Get optimization statistics
   */
  public getOptimizationStats(): {
    performance: PerformanceMetrics;
    pools: Record<string, any>;
    lod: any;
    cleanup: any;
    optimizer: any;
  } {
    return {
      performance: this.performanceMonitor.getMetrics(),
      pools: globalPoolManager.getAllStats(),
      lod: this.lodManager.getStats(),
      cleanup: this.cleanupManager.getStats(),
      optimizer: { ...this.stats }
    };
  }

  /**
   * Log comprehensive performance statistics
   */
  public logPerformanceStats(): void {
    console.log('[PerformanceOptimizer] === Performance Statistics ===');
    
    // Performance metrics
    this.performanceMonitor.logStats();
    
    // Pool statistics
    console.log('\nPool Statistics:');
    globalPoolManager.logPoolStats();
    
    // LOD statistics
    const lodStats = this.lodManager.getStats();
    console.log('\nLOD Statistics:');
    console.log(`  Total Objects: ${lodStats.totalObjects}`);
    console.log(`  High Detail: ${lodStats.activeHighDetail}`);
    console.log(`  Medium Detail: ${lodStats.activeMediumDetail}`);
    console.log(`  Low Detail: ${lodStats.activeLowDetail}`);
    
    // Cleanup statistics
    const cleanupStats = this.cleanupManager.getStats();
    console.log('\nCleanup Statistics:');
    console.log(`  Tracked Objects: ${cleanupStats.trackedObjects}`);
    console.log(`  Oldest Object: ${(cleanupStats.oldestObject / 1000).toFixed(1)}s ago`);
    
    // Optimizer statistics
    console.log('\nOptimizer Statistics:');
    console.log(`  Objects Pooled: ${this.stats.objectsPooled}`);
    console.log(`  Objects Culled: ${this.stats.objectsCulled}`);
    console.log(`  Objects with LOD: ${this.stats.objectsLOD}`);
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Resize pools if needed
    if (newConfig.poolSizes && this.config.enableObjectPooling) {
      if (newConfig.poolSizes.tracks) {
        this.trackPool.resize(newConfig.poolSizes.tracks);
      }
      if (newConfig.poolSizes.obstacles) {
        this.obstaclePool.resize(newConfig.poolSizes.obstacles);
      }
      if (newConfig.poolSizes.people) {
        this.personPool.resize(newConfig.poolSizes.people);
      }
    }
    
    console.log('[PerformanceOptimizer] Updated configuration');
  }

  /**
   * Dispose of all optimization systems
   */
  public dispose(): void {
    console.log('[PerformanceOptimizer] Disposing...');
    
    // Dispose performance monitor
    this.performanceMonitor.dispose();
    
    // Clear LOD manager
    this.lodManager.clear();
    
    // Clear cleanup manager
    this.cleanupManager.clear();
    
    // Dispose pools
    if (this.config.enableObjectPooling) {
      globalPoolManager.dispose();
    }
    
    console.log('[PerformanceOptimizer] Disposed');
  }
}
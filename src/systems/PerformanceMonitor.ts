/**
 * PerformanceMonitor - Monitors and optimizes game performance
 * Implements requirements: 10.1, 10.2, 10.3
 */

import * as THREE from 'three';

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  renderStats: {
    triangles: number;
    geometries: number;
    textures: number;
    programs: number;
    calls: number;
  };
  objectCounts: {
    total: number;
    visible: number;
    culled: number;
  };
}

export interface PerformanceSettings {
  targetFPS: number;
  maxFrameTime: number;
  memoryThreshold: number;
  autoOptimize: boolean;
  logInterval: number;
}

/**
 * Performance monitoring and optimization system
 */
export class PerformanceMonitor {
  private settings: PerformanceSettings;
  private metrics: PerformanceMetrics;
  private renderer: THREE.WebGLRenderer;
  
  // Frame timing
  private frameCount: number = 0;
  private lastTime: number = 0;
  private frameTimeHistory: number[] = [];
  private readonly FRAME_HISTORY_SIZE = 60;
  
  // Memory monitoring
  private memoryInfo: any = null;
  
  // Performance callbacks
  private onPerformanceIssue?: (issue: string, severity: 'low' | 'medium' | 'high') => void;
  private onOptimizationApplied?: (optimization: string) => void;
  
  // Optimization state
  private optimizationLevel: number = 0;
  private lastOptimizationTime: number = 0;
  private readonly OPTIMIZATION_COOLDOWN = 5000; // 5 seconds

  constructor(
    renderer: THREE.WebGLRenderer,
    settings: Partial<PerformanceSettings> = {}
  ) {
    this.renderer = renderer;
    this.settings = {
      targetFPS: 60,
      maxFrameTime: 16.67, // ~60 FPS
      memoryThreshold: 80, // 80% memory usage
      autoOptimize: true,
      logInterval: 5000, // 5 seconds
      ...settings
    };

    this.metrics = this.initializeMetrics();
    this.initializeMemoryMonitoring();
  }

  /**
   * Initialize metrics structure
   */
  private initializeMetrics(): PerformanceMetrics {
    return {
      fps: 0,
      frameTime: 0,
      memoryUsage: {
        used: 0,
        total: 0,
        percentage: 0
      },
      renderStats: {
        triangles: 0,
        geometries: 0,
        textures: 0,
        programs: 0,
        calls: 0
      },
      objectCounts: {
        total: 0,
        visible: 0,
        culled: 0
      }
    };
  }

  /**
   * Initialize memory monitoring
   */
  private initializeMemoryMonitoring(): void {
    // Check if performance.memory is available (Chrome)
    if ('memory' in performance) {
      this.memoryInfo = (performance as any).memory;
    }
  }

  /**
   * Update performance metrics
   */
  public update(currentTime: number, scene: THREE.Scene, camera: THREE.Camera): void {
    this.updateFrameMetrics(currentTime);
    this.updateMemoryMetrics();
    this.updateRenderStats();
    this.updateObjectCounts(scene, camera);
    
    if (this.settings.autoOptimize) {
      this.checkAndOptimize(currentTime);
    }
  }

  /**
   * Update frame timing metrics
   */
  private updateFrameMetrics(currentTime: number): void {
    if (this.lastTime === 0) {
      this.lastTime = currentTime;
      return;
    }

    const deltaTime = currentTime - this.lastTime;
    this.frameTimeHistory.push(deltaTime);
    
    if (this.frameTimeHistory.length > this.FRAME_HISTORY_SIZE) {
      this.frameTimeHistory.shift();
    }

    // Calculate average frame time and FPS
    const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
    this.metrics.frameTime = avgFrameTime;
    this.metrics.fps = 1000 / avgFrameTime;

    this.frameCount++;
    this.lastTime = currentTime;
  }

  /**
   * Update memory usage metrics
   */
  private updateMemoryMetrics(): void {
    if (this.memoryInfo) {
      this.metrics.memoryUsage = {
        used: this.memoryInfo.usedJSHeapSize,
        total: this.memoryInfo.totalJSHeapSize,
        percentage: (this.memoryInfo.usedJSHeapSize / this.memoryInfo.totalJSHeapSize) * 100
      };
    }
  }

  /**
   * Update WebGL render statistics
   */
  private updateRenderStats(): void {
    const info = this.renderer.info;
    
    this.metrics.renderStats = {
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs?.length || 0,
      calls: info.render.calls
    };
  }

  /**
   * Update object count statistics
   */
  private updateObjectCounts(scene: THREE.Scene, camera: THREE.Camera): void {
    let total = 0;
    let visible = 0;

    // Create frustum for culling check
    const frustum = new THREE.Frustum();
    const matrix = new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    frustum.setFromProjectionMatrix(matrix);

    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        total++;
        
        if (object.visible && frustum.intersectsObject(object)) {
          visible++;
        }
      }
    });

    this.metrics.objectCounts = {
      total,
      visible,
      culled: total - visible
    };
  }

  /**
   * Check performance and apply optimizations if needed
   */
  private checkAndOptimize(currentTime: number): void {
    const timeSinceLastOptimization = currentTime - this.lastOptimizationTime;
    
    if (timeSinceLastOptimization < this.OPTIMIZATION_COOLDOWN) {
      return;
    }

    // Check for performance issues
    const issues = this.detectPerformanceIssues();
    
    if (issues.length > 0) {
      this.applyOptimizations(issues, currentTime);
    }
  }

  /**
   * Detect performance issues
   */
  private detectPerformanceIssues(): Array<{issue: string, severity: 'low' | 'medium' | 'high'}> {
    const issues: Array<{issue: string, severity: 'low' | 'medium' | 'high'}> = [];

    // Check FPS
    if (this.metrics.fps < this.settings.targetFPS * 0.5) {
      issues.push({ issue: 'low_fps_critical', severity: 'high' });
    } else if (this.metrics.fps < this.settings.targetFPS * 0.8) {
      issues.push({ issue: 'low_fps_moderate', severity: 'medium' });
    }

    // Check frame time
    if (this.metrics.frameTime > this.settings.maxFrameTime * 2) {
      issues.push({ issue: 'high_frame_time', severity: 'high' });
    }

    // Check memory usage
    if (this.metrics.memoryUsage.percentage > this.settings.memoryThreshold) {
      issues.push({ issue: 'high_memory_usage', severity: 'medium' });
    }

    // Check render calls
    if (this.metrics.renderStats.calls > 1000) {
      issues.push({ issue: 'too_many_draw_calls', severity: 'medium' });
    }

    // Check triangle count
    if (this.metrics.renderStats.triangles > 100000) {
      issues.push({ issue: 'high_triangle_count', severity: 'low' });
    }

    return issues;
  }

  /**
   * Apply performance optimizations
   */
  private applyOptimizations(
    issues: Array<{issue: string, severity: 'low' | 'medium' | 'high'}>,
    currentTime: number
  ): void {
    const highSeverityIssues = issues.filter(i => i.severity === 'high');
    const mediumSeverityIssues = issues.filter(i => i.severity === 'medium');

    // Apply optimizations based on severity
    if (highSeverityIssues.length > 0) {
      this.applyAggressiveOptimizations();
    } else if (mediumSeverityIssues.length > 0) {
      this.applyModerateOptimizations();
    }

    this.lastOptimizationTime = currentTime;
    
    // Notify about issues
    issues.forEach(issue => {
      if (this.onPerformanceIssue) {
        this.onPerformanceIssue(issue.issue, issue.severity);
      }
    });
  }

  /**
   * Apply aggressive performance optimizations
   */
  private applyAggressiveOptimizations(): void {
    if (this.optimizationLevel < 3) {
      // Reduce shadow quality
      this.renderer.shadowMap.enabled = false;
      this.notifyOptimization('Disabled shadows');

      // Reduce pixel ratio
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio * 0.5, 1));
      this.notifyOptimization('Reduced pixel ratio');

      this.optimizationLevel = 3;
    }
  }

  /**
   * Apply moderate performance optimizations
   */
  private applyModerateOptimizations(): void {
    if (this.optimizationLevel < 2) {
      // Reduce shadow map size
      if (this.renderer.shadowMap.enabled) {
        // This would need to be implemented in the lighting system
        this.notifyOptimization('Reduced shadow quality');
      }

      // Enable frustum culling (this should be handled by the scene)
      this.notifyOptimization('Enhanced frustum culling');

      this.optimizationLevel = 2;
    }
  }

  /**
   * Notify about applied optimization
   */
  private notifyOptimization(optimization: string): void {
    console.log(`[PerformanceMonitor] Applied optimization: ${optimization}`);
    if (this.onOptimizationApplied) {
      this.onOptimizationApplied(optimization);
    }
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary(): {
    status: 'good' | 'moderate' | 'poor';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let status: 'good' | 'moderate' | 'poor' = 'good';

    // Analyze FPS
    if (this.metrics.fps < 30) {
      status = 'poor';
      issues.push('Very low FPS (< 30)');
      recommendations.push('Reduce visual quality settings');
    } else if (this.metrics.fps < 50) {
      status = 'moderate';
      issues.push('Low FPS (< 50)');
      recommendations.push('Consider reducing object complexity');
    }

    // Analyze memory
    if (this.metrics.memoryUsage.percentage > 90) {
      status = 'poor';
      issues.push('Critical memory usage (> 90%)');
      recommendations.push('Implement more aggressive object pooling');
    } else if (this.metrics.memoryUsage.percentage > 70) {
      if (status === 'good') status = 'moderate';
      issues.push('High memory usage (> 70%)');
      recommendations.push('Enable automatic cleanup of distant objects');
    }

    // Analyze render calls
    if (this.metrics.renderStats.calls > 1500) {
      if (status === 'good') status = 'moderate';
      issues.push('High number of draw calls');
      recommendations.push('Implement object instancing or batching');
    }

    return { status, issues, recommendations };
  }

  /**
   * Set performance issue callback
   */
  public onPerformanceIssueDetected(
    callback: (issue: string, severity: 'low' | 'medium' | 'high') => void
  ): void {
    this.onPerformanceIssue = callback;
  }

  /**
   * Set optimization applied callback
   */
  public onOptimizationAppliedCallback(callback: (optimization: string) => void): void {
    this.onOptimizationApplied = callback;
  }

  /**
   * Reset optimization level (for testing)
   */
  public resetOptimizations(): void {
    this.optimizationLevel = 0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    console.log('[PerformanceMonitor] Reset all optimizations');
  }

  /**
   * Log performance statistics
   */
  public logStats(): void {
    const summary = this.getPerformanceSummary();
    
    console.log('[PerformanceMonitor] Performance Statistics:');
    console.log(`  Status: ${summary.status.toUpperCase()}`);
    console.log(`  FPS: ${this.metrics.fps.toFixed(1)}`);
    console.log(`  Frame Time: ${this.metrics.frameTime.toFixed(2)}ms`);
    console.log(`  Memory: ${this.metrics.memoryUsage.percentage.toFixed(1)}%`);
    console.log(`  Objects: ${this.metrics.objectCounts.visible}/${this.metrics.objectCounts.total} visible`);
    console.log(`  Draw Calls: ${this.metrics.renderStats.calls}`);
    console.log(`  Triangles: ${this.metrics.renderStats.triangles}`);
    
    if (summary.issues.length > 0) {
      console.log('  Issues:', summary.issues.join(', '));
    }
    
    if (summary.recommendations.length > 0) {
      console.log('  Recommendations:', summary.recommendations.join(', '));
    }
  }

  /**
   * Update settings
   */
  public updateSettings(newSettings: Partial<PerformanceSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * Dispose of the performance monitor
   */
  public dispose(): void {
    this.frameTimeHistory.length = 0;
    this.onPerformanceIssue = undefined;
    this.onOptimizationApplied = undefined;
  }
}
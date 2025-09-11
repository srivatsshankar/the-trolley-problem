/**
 * PerformanceTester - Cross-platform performance testing and benchmarking
 * Implements requirements: 10.1, 10.2
 */

import * as THREE from 'three';
import { PerformanceMonitor } from './PerformanceMonitor';
import { FrustumCullingSystem } from './FrustumCulling';
import { PerformanceOptimizer } from './PerformanceOptimizer';

export interface PerformanceTestConfig {
  testDuration: number; // milliseconds
  objectCounts: number[];
  testTypes: ('baseline' | 'culling' | 'pooling' | 'combined')[];
  targetFPS: number;
  warmupTime: number;
}

export interface TestResult {
  testType: string;
  objectCount: number;
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
  averageFrameTime: number;
  memoryUsage: {
    start: number;
    end: number;
    peak: number;
  };
  renderStats: {
    averageTriangles: number;
    averageDrawCalls: number;
  };
  cullingStats?: {
    averageVisible: number;
    averageCulled: number;
    cullingEfficiency: number;
  };
  passed: boolean;
  score: number; // Performance score (0-100)
}

export interface BenchmarkReport {
  deviceInfo: {
    userAgent: string;
    platform: string;
    webglRenderer: string;
    webglVersion: string;
  };
  testConfig: PerformanceTestConfig;
  results: TestResult[];
  overallScore: number;
  recommendations: string[];
}

/**
 * Performance testing and benchmarking system
 */
export class PerformanceTester {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private performanceMonitor: PerformanceMonitor;
  private frustumCulling: FrustumCullingSystem;
  private optimizer: PerformanceOptimizer;
  
  // Test objects
  private testObjects: THREE.Object3D[] = [];
  private testMaterials: THREE.Material[] = [];
  private testGeometries: THREE.BufferGeometry[] = [];
  
  // Test state
  // private _isRunning: boolean = false;
  // private _currentTest: string = '';
  // private _testStartTime: number = 0;
  private frameData: Array<{fps: number, frameTime: number, memory: number}> = [];

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    
    this.performanceMonitor = new PerformanceMonitor(renderer, {
      autoOptimize: false // Disable auto-optimization during testing
    });
    
    this.frustumCulling = new FrustumCullingSystem(camera);
    
    this.optimizer = new PerformanceOptimizer(scene, camera, renderer, {
      enableObjectPooling: false, // Will be enabled per test
      enableLOD: false,
      enableFrustumCulling: false,
      enableAutomaticCleanup: false
    });
  }

  /**
   * Run comprehensive performance benchmark
   */
  public async runBenchmark(config: Partial<PerformanceTestConfig> = {}): Promise<BenchmarkReport> {
    const testConfig: PerformanceTestConfig = {
      testDuration: 5000, // 5 seconds per test
      objectCounts: [100, 500, 1000, 2000],
      testTypes: ['baseline', 'culling', 'pooling', 'combined'],
      targetFPS: 60,
      warmupTime: 1000, // 1 second warmup
      ...config
    };

    console.log('[PerformanceTester] Starting benchmark...');
    
    const results: TestResult[] = [];
    
    // Run tests for each object count and test type
    for (const objectCount of testConfig.objectCounts) {
      for (const testType of testConfig.testTypes) {
        console.log(`[PerformanceTester] Running ${testType} test with ${objectCount} objects...`);
        
        const result = await this.runSingleTest(testType, objectCount, testConfig);
        results.push(result);
        
        // Clean up between tests
        await this.cleanupTest();
        await this.wait(500); // Brief pause between tests
      }
    }

    // Generate report
    const report = this.generateBenchmarkReport(testConfig, results);
    
    console.log('[PerformanceTester] Benchmark completed');
    this.logBenchmarkReport(report);
    
    return report;
  }

  /**
   * Run a single performance test
   */
  private async runSingleTest(
    testType: string,
    objectCount: number,
    config: PerformanceTestConfig
  ): Promise<TestResult> {
    // this._currentTest = `${testType}_${objectCount}`;
    // this._isRunning = true;
    this.frameData = [];
    
    // Setup test environment
    await this.setupTest(testType, objectCount);
    
    // Warmup period
    await this.runTestPhase(config.warmupTime, true);
    
    // Record initial memory
    const startMemory = this.getMemoryUsage();
    
    // Main test period
    // this._testStartTime = Date.now();
    await this.runTestPhase(config.testDuration, false);
    
    // Record final memory
    const endMemory = this.getMemoryUsage();
    
    // Calculate results
    const result = this.calculateTestResult(
      testType,
      objectCount,
      config.targetFPS,
      startMemory,
      endMemory
    );
    
    // this._isRunning = false;
    return result;
  }

  /**
   * Setup test environment based on test type
   */
  private async setupTest(testType: string, objectCount: number): Promise<void> {
    // Create test objects
    this.createTestObjects(objectCount);
    
    // Configure systems based on test type
    switch (testType) {
      case 'baseline':
        // No optimizations
        break;
        
      case 'culling':
        this.setupFrustumCulling();
        break;
        
      case 'pooling':
        this.setupObjectPooling();
        break;
        
      case 'combined':
        this.setupFrustumCulling();
        this.setupObjectPooling();
        break;
    }
  }

  /**
   * Create test objects for performance testing
   */
  private createTestObjects(count: number): void {
    // Create various types of objects to simulate real game conditions
    const objectTypes = ['cube', 'sphere', 'cylinder', 'complex'];
    
    for (let i = 0; i < count; i++) {
      const type = objectTypes[i % objectTypes.length];
      const object = this.createTestObject(type, i);
      
      this.testObjects.push(object);
      this.scene.add(object);
      
      // Register with frustum culling if enabled
      if (this.frustumCulling) {
        const priority = i < count * 0.2 ? 'high' : i < count * 0.6 ? 'medium' : 'low';
        this.frustumCulling.registerObject(`test_${i}`, object, priority);
      }
    }
  }

  /**
   * Create a single test object
   */
  private createTestObject(type: string, index: number): THREE.Object3D {
    let geometry: THREE.BufferGeometry;
    
    switch (type) {
      case 'cube':
        geometry = new THREE.BoxGeometry(1, 1, 1);
        break;
      case 'sphere':
        geometry = new THREE.SphereGeometry(0.5, 16, 16);
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
        break;
      case 'complex':
        geometry = new THREE.IcosahedronGeometry(0.5, 2); // More complex geometry
        break;
      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
    }
    
    const material = new THREE.MeshLambertMaterial({
      color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5)
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position objects in a grid around the camera
    const gridSize = Math.ceil(Math.sqrt(index + 1));
    const x = (index % gridSize - gridSize / 2) * 3;
    const z = (Math.floor(index / gridSize) - gridSize / 2) * 3;
    const y = Math.random() * 2 - 1;
    
    mesh.position.set(x, y, z);
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    
    // Add some animation
    mesh.userData.rotationSpeed = {
      x: (Math.random() - 0.5) * 0.02,
      y: (Math.random() - 0.5) * 0.02,
      z: (Math.random() - 0.5) * 0.02
    };
    
    this.testGeometries.push(geometry);
    this.testMaterials.push(material);
    
    return mesh;
  }

  /**
   * Setup frustum culling for test
   */
  private setupFrustumCulling(): void {
    this.frustumCulling.updateConfig({
      enableFrustumCulling: true,
      enableDistanceCulling: true,
      maxCullDistance: 50
    });
  }

  /**
   * Setup object pooling for test
   */
  private setupObjectPooling(): void {
    this.optimizer.updateConfig({
      enableObjectPooling: true,
      poolSizes: {
        tracks: 20,
        obstacles: 50,
        people: 100
      }
    });
  }

  /**
   * Run test phase (warmup or main test)
   */
  private async runTestPhase(duration: number, isWarmup: boolean): Promise<void> {
    const startTime = Date.now();
    let frameCount = 0;
    
    return new Promise((resolve) => {
      const testLoop = () => {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        
        if (elapsed >= duration) {
          resolve();
          return;
        }
        
        // Update systems
        this.updateTestSystems(currentTime);
        
        // Animate test objects
        this.animateTestObjects();
        
        // Update performance monitor
        this.performanceMonitor.update(currentTime, this.scene, this.camera);
        
        // Record frame data (only during main test, not warmup)
        if (!isWarmup) {
          const metrics = this.performanceMonitor.getMetrics();
          this.frameData.push({
            fps: metrics.fps,
            frameTime: metrics.frameTime,
            memory: metrics.memoryUsage.used
          });
        }
        
        frameCount++;
        requestAnimationFrame(testLoop);
      };
      
      testLoop();
    });
  }

  /**
   * Update test systems
   */
  private updateTestSystems(currentTime: number): void {
    // Update frustum culling
    this.frustumCulling.update(currentTime);
    
    // Update optimizer
    this.optimizer.update(16.67); // Assume ~60 FPS delta
  }

  /**
   * Animate test objects
   */
  private animateTestObjects(): void {
    this.testObjects.forEach((object) => {
      if (object.userData.rotationSpeed) {
        object.rotation.x += object.userData.rotationSpeed.x;
        object.rotation.y += object.userData.rotationSpeed.y;
        object.rotation.z += object.userData.rotationSpeed.z;
      }
    });
  }

  /**
   * Calculate test result from collected data
   */
  private calculateTestResult(
    testType: string,
    objectCount: number,
    targetFPS: number,
    startMemory: number,
    endMemory: number
  ): TestResult {
    if (this.frameData.length === 0) {
      throw new Error('No frame data collected');
    }
    
    // Calculate FPS statistics
    const fpsValues = this.frameData.map(frame => frame.fps);
    const averageFPS = fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length;
    const minFPS = Math.min(...fpsValues);
    const maxFPS = Math.max(...fpsValues);
    
    // Calculate frame time statistics
    const frameTimeValues = this.frameData.map(frame => frame.frameTime);
    const averageFrameTime = frameTimeValues.reduce((a, b) => a + b, 0) / frameTimeValues.length;
    
    // Calculate memory statistics
    const memoryValues = this.frameData.map(frame => frame.memory);
    const peakMemory = Math.max(...memoryValues);
    
    // Get render statistics
    const renderMetrics = this.performanceMonitor.getMetrics();
    
    // Get culling statistics if available
    let cullingStats;
    if (testType === 'culling' || testType === 'combined') {
      const stats = this.frustumCulling.getStats();
      cullingStats = {
        averageVisible: stats.visibleObjects,
        averageCulled: stats.culledObjects,
        cullingEfficiency: stats.performanceGain
      };
    }
    
    // Calculate performance score (0-100)
    const fpsScore = Math.min((averageFPS / targetFPS) * 100, 100);
    const memoryScore = Math.max(100 - ((endMemory - startMemory) / startMemory) * 100, 0);
    const stabilityScore = Math.max(100 - ((maxFPS - minFPS) / averageFPS) * 100, 0);
    const score = (fpsScore * 0.5 + memoryScore * 0.3 + stabilityScore * 0.2);
    
    return {
      testType,
      objectCount,
      averageFPS: Math.round(averageFPS * 100) / 100,
      minFPS: Math.round(minFPS * 100) / 100,
      maxFPS: Math.round(maxFPS * 100) / 100,
      averageFrameTime: Math.round(averageFrameTime * 100) / 100,
      memoryUsage: {
        start: startMemory,
        end: endMemory,
        peak: peakMemory
      },
      renderStats: {
        averageTriangles: renderMetrics.renderStats.triangles,
        averageDrawCalls: renderMetrics.renderStats.calls
      },
      cullingStats,
      passed: averageFPS >= targetFPS * 0.8, // Pass if within 80% of target
      score: Math.round(score * 100) / 100
    };
  }

  /**
   * Generate comprehensive benchmark report
   */
  private generateBenchmarkReport(
    config: PerformanceTestConfig,
    results: TestResult[]
  ): BenchmarkReport {
    // Calculate overall score
    const overallScore = results.reduce((sum, result) => sum + result.score, 0) / results.length;
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(results);
    
    // Get device information
    const deviceInfo = this.getDeviceInfo();
    
    return {
      deviceInfo,
      testConfig: config,
      results,
      overallScore: Math.round(overallScore * 100) / 100,
      recommendations
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(results: TestResult[]): string[] {
    const recommendations: string[] = [];
    
    // Analyze results for patterns
    const baselineResults = results.filter(r => r.testType === 'baseline');
    const cullingResults = results.filter(r => r.testType === 'culling');
    const poolingResults = results.filter(r => r.testType === 'pooling');
    // const _combinedResults = results.filter(r => r.testType === 'combined');
    
    // Check if culling helps
    if (cullingResults.length > 0 && baselineResults.length > 0) {
      const cullingImprovement = this.calculateImprovement(baselineResults, cullingResults);
      if (cullingImprovement > 10) {
        recommendations.push(`Frustum culling provides ${cullingImprovement.toFixed(1)}% performance improvement`);
      }
    }
    
    // Check if pooling helps
    if (poolingResults.length > 0 && baselineResults.length > 0) {
      const poolingImprovement = this.calculateImprovement(baselineResults, poolingResults);
      if (poolingImprovement > 5) {
        recommendations.push(`Object pooling provides ${poolingImprovement.toFixed(1)}% performance improvement`);
      }
    }
    
    // Check overall performance
    const averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    if (averageScore < 60) {
      recommendations.push('Consider reducing visual quality or object complexity');
    }
    
    // Check memory usage
    const highMemoryTests = results.filter(r => 
      (r.memoryUsage.end - r.memoryUsage.start) / r.memoryUsage.start > 0.5
    );
    if (highMemoryTests.length > 0) {
      recommendations.push('High memory usage detected - implement more aggressive cleanup');
    }
    
    return recommendations;
  }

  /**
   * Calculate performance improvement percentage
   */
  private calculateImprovement(baseline: TestResult[], optimized: TestResult[]): number {
    const baselineAvg = baseline.reduce((sum, r) => sum + r.averageFPS, 0) / baseline.length;
    const optimizedAvg = optimized.reduce((sum, r) => sum + r.averageFPS, 0) / optimized.length;
    
    return ((optimizedAvg - baselineAvg) / baselineAvg) * 100;
  }

  /**
   * Get device and browser information
   */
  private getDeviceInfo(): BenchmarkReport['deviceInfo'] {
    const gl = this.renderer.getContext();
    
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      webglRenderer: gl.getParameter(gl.RENDERER) || 'Unknown',
      webglVersion: gl.getParameter(gl.VERSION) || 'Unknown'
    };
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Clean up test objects and resources
   */
  private async cleanupTest(): Promise<void> {
    // Remove test objects from scene
    this.testObjects.forEach(object => {
      this.scene.remove(object);
      this.frustumCulling.unregisterObject(`test_${this.testObjects.indexOf(object)}`);
    });
    
    // Dispose geometries and materials
    this.testGeometries.forEach(geometry => geometry.dispose());
    this.testMaterials.forEach(material => material.dispose());
    
    // Clear arrays
    this.testObjects.length = 0;
    this.testGeometries.length = 0;
    this.testMaterials.length = 0;
    
    // Clear culling system
    this.frustumCulling.clear();
    
    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }
  }

  /**
   * Log benchmark report to console
   */
  private logBenchmarkReport(report: BenchmarkReport): void {
    console.log('\n[PerformanceTester] === BENCHMARK REPORT ===');
    console.log(`Overall Score: ${report.overallScore}/100`);
    console.log(`Device: ${report.deviceInfo.platform}`);
    console.log(`WebGL: ${report.deviceInfo.webglRenderer}`);
    
    console.log('\nTest Results:');
    report.results.forEach(result => {
      console.log(`  ${result.testType} (${result.objectCount} objects):`);
      console.log(`    FPS: ${result.averageFPS} (${result.minFPS}-${result.maxFPS})`);
      console.log(`    Score: ${result.score}/100 ${result.passed ? '✓' : '✗'}`);
      if (result.cullingStats) {
        console.log(`    Culling: ${result.cullingStats.cullingEfficiency.toFixed(1)}% efficiency`);
      }
    });
    
    if (report.recommendations.length > 0) {
      console.log('\nRecommendations:');
      report.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }
  }

  /**
   * Utility function to wait
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Dispose of the performance tester
   */
  public dispose(): void {
    this.cleanupTest();
    this.performanceMonitor.dispose();
    this.frustumCulling.dispose();
    this.optimizer.dispose();
    console.log('[PerformanceTester] Disposed');
  }
}
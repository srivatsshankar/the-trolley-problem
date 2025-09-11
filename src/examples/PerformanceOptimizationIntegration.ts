/**
 * Performance Optimization Integration Example
 * Demonstrates how to integrate and use the performance optimization systems
 * Implements requirements: 10.1, 10.2
 */

import * as THREE from 'three';
import { FrustumCullingSystem } from '../systems/FrustumCulling';
import { PerformanceMonitor } from '../systems/PerformanceMonitor';
import { PerformanceOptimizer } from '../systems/PerformanceOptimizer';
import { PerformanceTester } from '../systems/PerformanceTester';

/**
 * Complete performance optimization integration example
 */
export class PerformanceOptimizationDemo {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  
  // Performance systems
  private frustumCulling!: FrustumCullingSystem;
  private performanceMonitor!: PerformanceMonitor;
  private optimizer!: PerformanceOptimizer;
  private tester!: PerformanceTester;
  
  // Demo objects
  private demoObjects: THREE.Object3D[] = [];
  private animationId: number = 0;
  
  // Performance tracking
  private lastLogTime: number = 0;
  private readonly LOG_INTERVAL = 5000; // 5 seconds

  constructor(canvas: HTMLCanvasElement) {
    this.initializeThreeJS(canvas);
    this.initializePerformanceSystems();
    this.createDemoScene();
    this.setupEventListeners();
  }

  /**
   * Initialize Three.js components
   */
  private initializeThreeJS(canvas: HTMLCanvasElement): void {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // Sky blue

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 10, 20);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ 
      canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);
  }

  /**
   * Initialize performance optimization systems
   */
  private initializePerformanceSystems(): void {
    // Frustum culling system
    this.frustumCulling = new FrustumCullingSystem(this.camera, {
      enableFrustumCulling: true,
      enableDistanceCulling: true,
      enableOcclusionCulling: false, // Disabled for performance
      maxCullDistance: 100,
      updateFrequency: 16, // ~60 FPS
      priorityDistances: {
        high: 30,
        medium: 60,
        low: 100
      }
    });

    // Performance monitor
    this.performanceMonitor = new PerformanceMonitor(this.renderer, {
      targetFPS: 60,
      maxFrameTime: 16.67,
      memoryThreshold: 75,
      autoOptimize: true,
      logInterval: 5000
    });

    // Performance optimizer (integrates all systems)
    this.optimizer = new PerformanceOptimizer(
      this.scene,
      this.camera,
      this.renderer,
      {
        enableObjectPooling: true,
        enableLOD: true,
        enableFrustumCulling: true,
        enableAutomaticCleanup: true,
        poolSizes: {
          tracks: 50,
          obstacles: 100,
          people: 200
        },
        cullingDistance: 100,
        lodDistances: {
          high: 30,
          medium: 60,
          low: 100
        }
      }
    );

    // Performance tester
    this.tester = new PerformanceTester(this.scene, this.camera, this.renderer);

    // Set up performance callbacks
    this.setupPerformanceCallbacks();
  }

  /**
   * Set up performance monitoring callbacks
   */
  private setupPerformanceCallbacks(): void {
    this.performanceMonitor.onPerformanceIssueDetected((issue, severity) => {
      console.warn(`[Demo] Performance issue: ${issue} (${severity})`);
      
      // Apply additional optimizations based on issue
      switch (issue) {
        case 'low_fps_critical':
          this.applyEmergencyOptimizations();
          break;
        case 'high_memory_usage':
          this.cleanupDistantObjects();
          break;
        case 'too_many_draw_calls':
          this.optimizeDrawCalls();
          break;
      }
    });

    this.performanceMonitor.onOptimizationAppliedCallback((optimization) => {
      console.log(`[Demo] Optimization applied: ${optimization}`);
    });
  }

  /**
   * Create demo scene with various objects for testing
   */
  private createDemoScene(): void {
    // Create ground plane
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Create various test objects
    this.createTestObjects();
    
    console.log(`[Demo] Created scene with ${this.demoObjects.length} objects`);
  }

  /**
   * Create test objects for performance testing
   */
  private createTestObjects(): void {
    const objectTypes = [
      { geometry: new THREE.BoxGeometry(1, 1, 1), color: 0xff6b6b },
      { geometry: new THREE.SphereGeometry(0.5, 16, 16), color: 0x4ecdc4 },
      { geometry: new THREE.CylinderGeometry(0.5, 0.5, 1, 12), color: 0x45b7d1 },
      { geometry: new THREE.ConeGeometry(0.5, 1, 8), color: 0xf9ca24 },
      { geometry: new THREE.IcosahedronGeometry(0.5, 1), color: 0x6c5ce7 }
    ];

    // Create objects in a grid pattern
    const gridSize = 20;
    const spacing = 5;
    let objectIndex = 0;

    for (let x = -gridSize; x <= gridSize; x += spacing) {
      for (let z = -gridSize; z <= gridSize; z += spacing) {
        const typeIndex = objectIndex % objectTypes.length;
        const objectType = objectTypes[typeIndex];
        
        const material = new THREE.MeshLambertMaterial({ 
          color: objectType.color 
        });
        const mesh = new THREE.Mesh(objectType.geometry, material);
        
        mesh.position.set(
          x + (Math.random() - 0.5) * 2,
          Math.random() * 3 + 0.5,
          z + (Math.random() - 0.5) * 2
        );
        
        mesh.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );
        
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Add animation data
        mesh.userData = {
          rotationSpeed: {
            x: (Math.random() - 0.5) * 0.02,
            y: (Math.random() - 0.5) * 0.02,
            z: (Math.random() - 0.5) * 0.02
          },
          originalPosition: mesh.position.clone(),
          bobSpeed: Math.random() * 0.02 + 0.01,
          bobHeight: Math.random() * 0.5 + 0.2
        };
        
        this.scene.add(mesh);
        this.demoObjects.push(mesh);
        
        // Register with frustum culling system
        const distance = Math.sqrt(x * x + z * z);
        let priority: 'high' | 'medium' | 'low' = 'low';
        
        if (distance < 20) priority = 'high';
        else if (distance < 40) priority = 'medium';
        
        this.frustumCulling.registerObject(
          `object_${objectIndex}`,
          mesh,
          priority
        );
        
        // Register with optimizer for cleanup tracking
        this.optimizer.trackForCleanup(
          `object_${objectIndex}`,
          mesh,
          () => {
            console.log(`[Demo] Cleaned up object ${objectIndex}`);
          }
        );
        
        objectIndex++;
      }
    }
  }

  /**
   * Set up event listeners for demo controls
   */
  private setupEventListeners(): void {
    // Keyboard controls
    window.addEventListener('keydown', (event) => {
      switch (event.key.toLowerCase()) {
        case 'p':
          this.logPerformanceStats();
          break;
        case 'b':
          this.runBenchmark();
          break;
        case 'r':
          this.resetOptimizations();
          break;
        case 'c':
          this.toggleFrustumCulling();
          break;
        case 'o':
          this.toggleObjectPooling();
          break;
        case 'l':
          this.toggleLOD();
          break;
      }
    });

    // Window resize
    window.addEventListener('resize', () => {
      this.handleResize();
    });

    console.log('[Demo] Controls:');
    console.log('  P - Log performance statistics');
    console.log('  B - Run performance benchmark');
    console.log('  R - Reset optimizations');
    console.log('  C - Toggle frustum culling');
    console.log('  O - Toggle object pooling');
    console.log('  L - Toggle LOD');
  }

  /**
   * Main animation loop
   */
  public animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    
    const currentTime = Date.now();
    
    // Update camera movement (orbit around scene)
    const time = currentTime * 0.0005;
    this.camera.position.x = Math.cos(time) * 30;
    this.camera.position.z = Math.sin(time) * 30;
    this.camera.position.y = 15 + Math.sin(time * 0.5) * 5;
    this.camera.lookAt(0, 0, 0);
    
    // Animate demo objects
    this.animateObjects(currentTime);
    
    // Update performance systems
    this.updatePerformanceSystems(currentTime);
    
    // Render scene
    this.renderer.render(this.scene, this.camera);
    
    // Log performance stats periodically
    if (currentTime - this.lastLogTime > this.LOG_INTERVAL) {
      this.logPerformanceStats();
      this.lastLogTime = currentTime;
    }
  }

  /**
   * Animate demo objects
   */
  private animateObjects(currentTime: number): void {
    this.demoObjects.forEach((object) => {
      const userData = object.userData;
      
      // Rotation animation
      if (userData.rotationSpeed) {
        object.rotation.x += userData.rotationSpeed.x;
        object.rotation.y += userData.rotationSpeed.y;
        object.rotation.z += userData.rotationSpeed.z;
      }
      
      // Bobbing animation
      if (userData.originalPosition && userData.bobSpeed && userData.bobHeight) {
        const bobOffset = Math.sin(currentTime * userData.bobSpeed) * userData.bobHeight;
        object.position.y = userData.originalPosition.y + bobOffset;
      }
    });
  }

  /**
   * Update all performance systems
   */
  private updatePerformanceSystems(currentTime: number): void {
    // Update frustum culling
    this.frustumCulling.update(currentTime);
    
    // Update performance monitor
    this.performanceMonitor.update(currentTime, this.scene, this.camera);
    
    // Update optimizer (includes all subsystems)
    this.optimizer.update(16.67); // Assume ~60 FPS delta
  }

  /**
   * Apply emergency optimizations
   */
  private applyEmergencyOptimizations(): void {
    console.log('[Demo] Applying emergency optimizations...');
    
    // Disable shadows
    this.renderer.shadowMap.enabled = false;
    
    // Reduce pixel ratio
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio * 0.5, 1));
    
    // Increase culling distance
    this.frustumCulling.updateConfig({
      maxCullDistance: 50,
      priorityDistances: {
        high: 15,
        medium: 30,
        low: 50
      }
    });
    
    console.log('[Demo] Emergency optimizations applied');
  }

  /**
   * Clean up distant objects
   */
  private cleanupDistantObjects(): void {
    console.log('[Demo] Cleaning up distant objects...');
    
    const cameraPosition = this.camera.position;
    let cleanedCount = 0;
    
    this.demoObjects.forEach((object, _index) => {
      const distance = cameraPosition.distanceTo(object.position);
      
      if (distance > 80) {
        object.visible = false;
        cleanedCount++;
      }
    });
    
    console.log(`[Demo] Cleaned up ${cleanedCount} distant objects`);
  }

  /**
   * Optimize draw calls
   */
  private optimizeDrawCalls(): void {
    console.log('[Demo] Optimizing draw calls...');
    
    // In a real implementation, this would involve:
    // - Batching similar objects
    // - Using instanced rendering
    // - Merging geometries
    
    // For demo purposes, just reduce visible objects
    let hiddenCount = 0;
    this.demoObjects.forEach((object, index) => {
      if (index % 3 === 0) { // Hide every 3rd object
        object.visible = false;
        hiddenCount++;
      }
    });
    
    console.log(`[Demo] Optimized draw calls by hiding ${hiddenCount} objects`);
  }

  /**
   * Log comprehensive performance statistics
   */
  private logPerformanceStats(): void {
    console.log('\n[Demo] === PERFORMANCE STATISTICS ===');
    
    // Performance monitor stats
    this.performanceMonitor.logStats();
    
    // Frustum culling stats
    this.frustumCulling.logStats();
    
    // Optimizer stats
    this.optimizer.logPerformanceStats();
    
    console.log('=====================================\n');
  }

  /**
   * Run performance benchmark
   */
  private async runBenchmark(): Promise<void> {
    console.log('[Demo] Starting performance benchmark...');
    
    try {
      const report = await this.tester.runBenchmark({
        testDuration: 3000, // 3 seconds per test
        objectCounts: [50, 100, 200],
        testTypes: ['baseline', 'culling', 'combined'],
        targetFPS: 60,
        warmupTime: 500
      });
      
      console.log('[Demo] Benchmark completed!');
      console.log(`Overall Score: ${report.overallScore}/100`);
      
      if (report.recommendations.length > 0) {
        console.log('Recommendations:');
        report.recommendations.forEach(rec => console.log(`  - ${rec}`));
      }
      
    } catch (error) {
      console.error('[Demo] Benchmark failed:', error);
    }
  }

  /**
   * Reset all optimizations
   */
  private resetOptimizations(): void {
    console.log('[Demo] Resetting optimizations...');
    
    // Reset renderer settings
    this.renderer.shadowMap.enabled = true;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    
    // Reset object visibility
    this.demoObjects.forEach(object => {
      object.visible = true;
    });
    
    // Reset performance monitor
    this.performanceMonitor.resetOptimizations();
    
    // Reset frustum culling config
    this.frustumCulling.updateConfig({
      enableFrustumCulling: true,
      enableDistanceCulling: true,
      maxCullDistance: 100,
      priorityDistances: {
        high: 30,
        medium: 60,
        low: 100
      }
    });
    
    console.log('[Demo] All optimizations reset');
  }

  /**
   * Toggle frustum culling
   */
  private toggleFrustumCulling(): void {
    const currentConfig = this.frustumCulling.getPerformanceReport().config;
    const newState = !currentConfig.enableFrustumCulling;
    
    this.frustumCulling.updateConfig({
      enableFrustumCulling: newState
    });
    
    console.log(`[Demo] Frustum culling ${newState ? 'enabled' : 'disabled'}`);
  }

  /**
   * Toggle object pooling
   */
  private toggleObjectPooling(): void {
    // This would require modifying the optimizer config
    console.log('[Demo] Object pooling toggle (not implemented in demo)');
  }

  /**
   * Toggle LOD
   */
  private toggleLOD(): void {
    // This would require modifying the optimizer config
    console.log('[Demo] LOD toggle (not implemented in demo)');
  }

  /**
   * Handle window resize
   */
  private handleResize(): void {
    const canvas = this.renderer.domElement;
    
    this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    console.log('[Demo] Disposing resources...');
    
    // Stop animation
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    // Dispose performance systems
    this.frustumCulling.dispose();
    this.performanceMonitor.dispose();
    this.optimizer.dispose();
    this.tester.dispose();
    
    // Dispose Three.js resources
    this.demoObjects.forEach(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    
    this.renderer.dispose();
    
    console.log('[Demo] Resources disposed');
  }
}

// Export for use in other modules
export default PerformanceOptimizationDemo;
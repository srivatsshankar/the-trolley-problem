/**
 * VisualEffectsIntegration - Example showing how to integrate PathPreviewSystem and VisualEffectsSystem
 * Demonstrates requirements: 5.1, 5.2, 1.5, 5.4, 5.5
 */

import * as THREE from 'three';
import { PathPreviewSystem, createPathPreviewSystem } from '../systems/PathPreviewSystem';
import { VisualEffectsSystem, createVisualEffectsSystem } from '../systems/VisualEffectsSystem';
import { LightingSystem, createLightingSystem } from '../systems/LightingSystem';
import { TrolleyController } from '../systems/TrolleyController';
import { InputManager } from '../systems/InputManager';
import { TrackGenerator } from '../systems/TrackGenerator';
import { GameConfig, DEFAULT_CONFIG } from '../models/GameConfig';

export class VisualEffectsIntegration {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  
  // Core systems
  private trolleyController!: TrolleyController;
  private trackGenerator!: TrackGenerator;
  private inputManager!: InputManager;
  
  // Visual systems
  private pathPreviewSystem!: PathPreviewSystem;
  private visualEffectsSystem!: VisualEffectsSystem;
  private lightingSystem!: LightingSystem;
  
  private gameConfig: GameConfig;
  private isRunning: boolean = false;
  private lastTime: number = 0;
  
  constructor(canvas: HTMLCanvasElement) {
    this.gameConfig = { ...DEFAULT_CONFIG };
    
    // Initialize Three.js
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    
    this.setupRenderer();
    this.initializeSystems();
    this.setupEventHandlers();
    
    console.log('[VisualEffectsIntegration] Created with enhanced visual effects');
  }
  
  /**
   * Setup renderer configuration
   */
  private setupRenderer(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x87CEEB, 1); // Sky blue background
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Enable tone mapping for better colors
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
  }
  
  /**
   * Initialize all game systems
   */
  private initializeSystems(): void {
    // Core game systems
    this.trolleyController = new TrolleyController(this.gameConfig);
    this.trackGenerator = new TrackGenerator(this.scene, this.gameConfig);
    
    // Visual enhancement systems
    this.pathPreviewSystem = createPathPreviewSystem(
      this.scene,
      this.trolleyController,
      this.gameConfig
    );
    
    this.visualEffectsSystem = createVisualEffectsSystem(
      this.scene,
      this.camera,
      this.trolleyController,
      this.gameConfig
    );
    
    this.lightingSystem = createLightingSystem(
      this.scene,
      this.renderer
    );
    
    // Input system (integrates with path preview)
    this.inputManager = new InputManager(
      this.scene,
      this.trolleyController,
      this.trackGenerator,
      this.gameConfig
    );
    
    // Setup camera position
    this.camera.position.set(0, 10, -8);
    this.camera.lookAt(0, 0, 0);
    
    // Create initial scene content
    this.createInitialScene();
  }
  
  /**
   * Create initial scene content
   */
  private createInitialScene(): void {
    // Add trolley to scene
    this.trolleyController.createTrolley();
    const trolleyGroup = this.trolleyController.getTrolleyGroup();
    if (trolleyGroup) {
      this.scene.add(trolleyGroup);
    }
    
    // Generate initial track segments
    for (let i = 0; i < 5; i++) {
      const segment = this.trackGenerator.generateSegment(i);
      segment.tracks.forEach(track => {
        this.scene.add(track.mesh);
      });
      // Note: Obstacles and people are managed separately by their respective managers
      // They are not directly attached to tracks
    }
    
    // Add ground plane
    this.addGroundPlane();
    
    // Mount input UI
    this.inputManager.mount();
  }
  
  /**
   * Add ground plane for better visual reference
   */
  private addGroundPlane(): void {
    const groundGeometry = new THREE.PlaneGeometry(100, 200);
    const groundMaterial = this.lightingSystem.createCartoonMaterial(
      new THREE.Color(0x90EE90), // Light green
      { roughness: 0.9, metalness: 0.0 }
    );
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    
    this.scene.add(ground);
  }
  
  /**
   * Setup event handlers for demonstrations
   */
  private setupEventHandlers(): void {
    // Handle window resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // Keyboard controls for demonstration
    window.addEventListener('keydown', (event) => {
      this.handleKeyDown(event);
    });
    
    // Track selection events
    this.inputManager.getPathPreviewSystem().clearAllPaths(); // Clear any existing paths
  }
  
  /**
   * Handle keyboard input for demonstrations
   */
  private handleKeyDown(event: KeyboardEvent): void {
    const trolleyPos = this.trolleyController.position;
    
    switch (event.key) {
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
        // Track selection
        const trackNumber = parseInt(event.key);
        this.inputManager.selectTrack(trackNumber);
        
        // Create visual feedback
        this.demonstrateTrackSwitchEffects(trackNumber);
        break;
        
      case ' ': // Spacebar - create collision effect
        this.visualEffectsSystem.createCollisionEffect(trolleyPos, 1.5);
        this.lightingSystem.createDramaticLighting(0.5);
        break;
        
      case 'e': // E - create explosion effect
        this.visualEffectsSystem.createExplosionEffect(trolleyPos, 2.0);
        this.lightingSystem.createDramaticLighting(1.0);
        break;
        
      case 's': // S - create speed effect
        this.visualEffectsSystem.createSpeedEffect(trolleyPos);
        this.trolleyController.increaseSpeed();
        break;
        
      case 'r': // R - reset trolley position
        this.trolleyController.reset();
        this.visualEffectsSystem.clearAllParticles();
        break;
        
      case 't': // T - toggle time of day
        const timeRatio = (Date.now() % 10000) / 10000;
        this.lightingSystem.setTimeOfDay(timeRatio);
        break;
    }
  }
  
  /**
   * Demonstrate track switching effects
   */
  private demonstrateTrackSwitchEffects(targetTrack: number): void {
    const currentPos = this.trolleyController.position.clone();
    const targetPos = new THREE.Vector3(
      this.trolleyController.getTrackPosition(targetTrack),
      currentPos.y,
      currentPos.z
    );
    
    // Create path preview
    const segmentIndex = Math.floor(currentPos.z / this.gameConfig.tracks.segmentLength) + 1;
    this.pathPreviewSystem.createPathPreview(targetTrack, segmentIndex);
    
    // Create track switch particle effect
    this.visualEffectsSystem.createTrackSwitchEffect(currentPos, targetPos);
    
    // Highlight the path briefly
    setTimeout(() => {
      this.pathPreviewSystem.highlightPath(targetTrack, segmentIndex);
    }, 200);
    
    // Make path opaque after "button check"
    setTimeout(() => {
      this.pathPreviewSystem.makePathOpaque(targetTrack, segmentIndex);
    }, 1000);
  }
  
  /**
   * Start the demonstration
   */
  public start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastTime = performance.now();
    this.animate();
    
    console.log('[VisualEffectsIntegration] Started - Use keys 1-5 for tracks, Space for collision, E for explosion, S for speed');
  }
  
  /**
   * Stop the demonstration
   */
  public stop(): void {
    this.isRunning = false;
  }
  
  /**
   * Main animation loop
   */
  private animate(): void {
    if (!this.isRunning) return;
    
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    
    // Update all systems
    this.update(deltaTime);
    
    // Render scene
    this.renderer.render(this.scene, this.camera);
    
    // Continue animation loop
    requestAnimationFrame(() => this.animate());
  }
  
  /**
   * Update all systems
   */
  private update(deltaTime: number): void {
    // Update core systems
    this.trolleyController.update(deltaTime);
    this.inputManager.update(deltaTime);
    
    // Update visual systems
    this.pathPreviewSystem.update(deltaTime);
    this.visualEffectsSystem.update(deltaTime);
    this.lightingSystem.update(deltaTime);
    
    // Generate new track segments as needed
    this.updateTrackGeneration();
    
    // Demonstrate automatic effects based on game state
    this.updateAutomaticEffects(deltaTime);
  }
  
  /**
   * Update track generation
   */
  private updateTrackGeneration(): void {
    const trolleyZ = this.trolleyController.position.z;
    const segmentLength = this.gameConfig.tracks.segmentLength;
    const currentSegment = Math.floor(trolleyZ / segmentLength);
    
    // Generate segments ahead of trolley
    for (let i = currentSegment + 3; i < currentSegment + 8; i++) {
      if (!this.trackGenerator.getSegment(i)) {
        const segment = this.trackGenerator.generateSegment(i);
        
        // Add to scene
        segment.tracks.forEach(track => {
          this.scene.add(track.mesh);
        });
        // Note: Obstacles and people are managed separately by their respective managers
        // They are not directly attached to tracks
      }
    }
    
    // Clean up old segments
    this.trackGenerator.cleanupOldSegments(new THREE.Vector3(0, 0, (currentSegment - 5) * 100));
  }
  
  /**
   * Update automatic visual effects based on game state
   */
  private updateAutomaticEffects(_deltaTime: number): void {
    const speedMultiplier = this.trolleyController.getSpeedMultiplier();
    
    // Create speed particles when going fast
    if (speedMultiplier > 2.0 && Math.random() < 0.1) {
      const trolleyPos = this.trolleyController.position;
      this.visualEffectsSystem.createSpeedEffect(trolleyPos);
    }
    
    // Adjust lighting based on speed
    if (speedMultiplier > 3.0) {
      this.lightingSystem.updateConfig({
        directionalIntensity: 1.2 + (speedMultiplier - 3.0) * 0.1
      });
    }
  }
  
  /**
   * Get demonstration instructions
   */
  public getInstructions(): string {
    return `
Visual Effects Integration Demo:

Controls:
- Keys 1-5: Select track (creates path preview and switch effects)
- Spacebar: Create collision effect
- E: Create explosion effect  
- S: Increase speed (creates speed effect)
- R: Reset trolley position
- T: Toggle time of day lighting

Features Demonstrated:
- Curved path visualization (translucent → opaque)
- Particle effects for collisions and interactions
- Smooth camera following
- Visual indicators for speed and difficulty
- Enhanced lighting for cartoonish feel
- Dynamic lighting effects
- Material enhancements

The demo shows integration between:
- PathPreviewSystem (curved path previews)
- VisualEffectsSystem (particles, camera, indicators)
- LightingSystem (enhanced cartoonish lighting)
    `;
  }
  
  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this.stop();
    
    // Dispose of visual systems
    this.pathPreviewSystem.dispose();
    this.visualEffectsSystem.dispose();
    this.lightingSystem.dispose();
    
    // Dispose of core systems
    this.inputManager.dispose();
    this.trolleyController.dispose();
    this.trackGenerator.dispose();
    
    // Dispose of Three.js resources
    this.renderer.dispose();
    
    console.log('[VisualEffectsIntegration] Disposed');
  }
}

/**
 * Factory function to create and start the integration demo
 */
export function createVisualEffectsDemo(canvas: HTMLCanvasElement): VisualEffectsIntegration {
  const demo = new VisualEffectsIntegration(canvas);
  
  // Display instructions
  console.log(demo.getInstructions());
  
  return demo;
}

/**
 * Example usage
 */
export function runVisualEffectsDemo(): void {
  // Create canvas element
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  document.body.appendChild(canvas);
  
  // Create and start demo
  const demo = createVisualEffectsDemo(canvas);
  demo.start();
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    demo.dispose();
  });
}
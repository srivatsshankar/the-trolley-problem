/**
 * VisualEffectsSystem - Handles particle effects, camera following, and visual polish
 * Implements requirements: 1.5, 5.4, 5.5
 */

import * as THREE from 'three';
import { TrolleyController } from './TrolleyController';
import { GameConfig } from '../models/GameConfig';

export interface VisualEffectsConfig {
  particleCount: number;
  particleLifetime: number;
  cameraFollowSpeed: number;
  cameraOffset: THREE.Vector3;
  speedIndicatorThreshold: number;
  difficultyIndicatorThreshold: number;
  enableParticles: boolean;
  enableCameraFollow: boolean;
  enableSpeedIndicators: boolean;
  enableWheelSparks?: boolean;
}

export interface ParticleEffect {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  lifetime: number;
  maxLifetime: number;
  color: THREE.Color;
  size: number;
  mesh: THREE.Mesh;
  type: 'collision' | 'speed' | 'track-switch' | 'explosion' | 'spark';
}

export interface SpeedIndicator {
  mesh: THREE.Mesh;
  originalScale: THREE.Vector3;
  pulsePhase: number;
  isActive: boolean;
}

export class VisualEffectsSystem {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private trolleyController: TrolleyController;
  // private _gameConfig: GameConfig;
  private config: VisualEffectsConfig;
  
  // Particle system
  private activeParticles: Map<string, ParticleEffect> = new Map();
  private particleGeometry: THREE.SphereGeometry = new THREE.SphereGeometry(0.1, 8, 6);
  private particleMaterials: Map<string, THREE.MeshBasicMaterial> = new Map();
  // Wheel sparks
  private wheelSparkEnabled: boolean = false;
  private lastSparkTime: number = 0;
  private sparkInterval: number = 0.045; // slightly faster bursts
  private sparkColorPalette: number[] = [0xFFD166, 0xFCA311, 0xFF6B35, 0xFFE066];
  
  // Camera following
  private targetCameraPosition: THREE.Vector3 = new THREE.Vector3();
  private currentCameraPosition: THREE.Vector3 = new THREE.Vector3();
  
  // Visual indicators
  private speedIndicators: SpeedIndicator[] = [];
  private difficultyIndicator?: THREE.Mesh;
  
  // Animation time
  private animationTime: number = 0;
  private particleIdCounter: number = 0;
  
  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    trolleyController: TrolleyController,
    _gameConfig: GameConfig,
    config?: Partial<VisualEffectsConfig>
  ) {
    this.scene = scene;
    this.camera = camera;
    this.trolleyController = trolleyController;
    // this._gameConfig = gameConfig;
    
    this.config = {
      particleCount: 100,
      particleLifetime: 2.0,
      cameraFollowSpeed: 2.0,
      cameraOffset: new THREE.Vector3(0, 10, -8),
      speedIndicatorThreshold: 2.0,
      difficultyIndicatorThreshold: 5.0,
      enableParticles: true,
      enableCameraFollow: true,
      enableSpeedIndicators: true,
      enableWheelSparks: true,
      ...config
    };
    
    this.initializeParticleSystem();
    this.initializeVisualIndicators();
    this.initializeCameraSystem();
    
    console.log('[VisualEffectsSystem] Created with enhanced visual effects and polish');
  }
  
  /**
   * Initialize particle system components
   */
  private initializeParticleSystem(): void {
    // Create shared particle geometry
    this.particleGeometry = new THREE.SphereGeometry(0.1, 8, 6);
    
    // Create materials for different particle types
    this.particleMaterials.set('collision', new THREE.MeshBasicMaterial({
      color: 0xFF4444,
      transparent: true,
      opacity: 0.8
    }));
    
    this.particleMaterials.set('speed', new THREE.MeshBasicMaterial({
      color: 0x44FF44,
      transparent: true,
      opacity: 0.6
    }));
    
    this.particleMaterials.set('track-switch', new THREE.MeshBasicMaterial({
      color: 0x4444FF,
      transparent: true,
      opacity: 0.7
    }));
    
    this.particleMaterials.set('explosion', new THREE.MeshBasicMaterial({
      color: 0xFFAA00,
      transparent: true,
      opacity: 0.9
    }));

    // Blocky spark material (emissive-like)
    this.particleMaterials.set('spark', new THREE.MeshBasicMaterial({
      color: 0xFFD166,
      transparent: true,
      opacity: 0.95
    }));
  }
  
  /**
   * Initialize visual indicators for speed and difficulty
   */
  private initializeVisualIndicators(): void {
    if (!this.config.enableSpeedIndicators) return;
    
    // Create speed indicator rings around trolley
    for (let i = 0; i < 3; i++) {
      const geometry = new THREE.RingGeometry(1 + i * 0.5, 1.2 + i * 0.5, 16);
      const material = new THREE.MeshBasicMaterial({
        color: 0x00FF00,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2; // Lay flat
      mesh.visible = false;
      
      const indicator: SpeedIndicator = {
        mesh,
        originalScale: mesh.scale.clone(),
        pulsePhase: i * Math.PI / 3,
        isActive: false
      };
      
      this.speedIndicators.push(indicator);
      this.scene.add(mesh);
    }
    
    // Create difficulty indicator
    const difficultyGeometry = new THREE.ConeGeometry(0.5, 2, 8);
    const difficultyMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF0000,
      transparent: true,
      opacity: 0.7
    });
    
    this.difficultyIndicator = new THREE.Mesh(difficultyGeometry, difficultyMaterial);
    this.difficultyIndicator.visible = false;
    this.scene.add(this.difficultyIndicator);
  }
  
  /**
   * Initialize camera following system
   */
  private initializeCameraSystem(): void {
    if (!this.config.enableCameraFollow) return;
    
    // Set initial camera position
    const trolleyPos = this.trolleyController.position;
    this.currentCameraPosition.copy(trolleyPos).add(this.config.cameraOffset);
    this.targetCameraPosition.copy(this.currentCameraPosition);
    
    if (this.camera.position) {
      this.camera.position.copy(this.currentCameraPosition);
    }
  }
  
  /**
   * Create collision particle effect
   * Requirement 1.5: Visual effects for cartoonish feel
   */
  public createCollisionEffect(position: THREE.Vector3, intensity: number = 1.0): void {
    if (!this.config.enableParticles) return;
    
    const particleCount = Math.floor(10 * intensity);
    
    for (let i = 0; i < particleCount; i++) {
      this.createParticle({
        position: position.clone(),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          Math.random() * 3 + 1,
          (Math.random() - 0.5) * 4
        ),
        type: 'collision',
        lifetime: this.config.particleLifetime * (0.5 + Math.random() * 0.5),
        size: 0.1 + Math.random() * 0.1
      });
    }
    
    console.log(`[VisualEffectsSystem] Created collision effect at ${position.x}, ${position.y}, ${position.z}`);
  }
  
  /**
   * Create explosion particle effect
   */
  public createExplosionEffect(position: THREE.Vector3, intensity: number = 1.0): void {
    if (!this.config.enableParticles) return;
    
    const particleCount = Math.floor(20 * intensity);
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      
      this.createParticle({
        position: position.clone(),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          Math.random() * 2 + 1,
          Math.sin(angle) * speed
        ),
        type: 'explosion',
        lifetime: this.config.particleLifetime * (0.8 + Math.random() * 0.4),
        size: 0.15 + Math.random() * 0.1
      });
    }
    
    console.log(`[VisualEffectsSystem] Created explosion effect at ${position.x}, ${position.y}, ${position.z}`);
  }
  
  /**
   * Create track switch effect
   * Requirement 5.4, 5.5: Visual feedback for track switching
   */
  public createTrackSwitchEffect(fromPosition: THREE.Vector3, toPosition: THREE.Vector3): void {
    if (!this.config.enableParticles) return;
    
    const particleCount = 8;
    const direction = toPosition.clone().sub(fromPosition).normalize();
    
    for (let i = 0; i < particleCount; i++) {
      const t = i / (particleCount - 1);
      const position = fromPosition.clone().lerp(toPosition, t);
      
      this.createParticle({
        position,
        velocity: direction.clone().multiplyScalar(2).add(new THREE.Vector3(
          (Math.random() - 0.5) * 1,
          Math.random() * 1,
          (Math.random() - 0.5) * 1
        )),
        type: 'track-switch',
        lifetime: this.config.particleLifetime * 0.8,
        size: 0.08
      });
    }
    
    console.log('[VisualEffectsSystem] Created track switch effect');
  }
  
  /**
   * Create speed increase effect
   */
  public createSpeedEffect(position: THREE.Vector3): void {
    if (!this.config.enableParticles) return;
    
    const particleCount = 6;
    
    for (let i = 0; i < particleCount; i++) {
      this.createParticle({
        position: position.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          Math.random() * 0.5,
          (Math.random() - 0.5) * 2
        )),
        velocity: new THREE.Vector3(0, 1 + Math.random(), 0),
        type: 'speed',
        lifetime: this.config.particleLifetime * 0.6,
        size: 0.06
      });
    }
  }
  
  /**
   * Create individual particle
   */
  private createParticle(params: {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    type: 'collision' | 'speed' | 'track-switch' | 'explosion' | 'spark';
    lifetime: number;
    size: number;
  }): void {
    const id = `particle_${this.particleIdCounter++}`;
    const material = this.particleMaterials.get(params.type);
    
    if (!material) {
      console.warn(`[VisualEffectsSystem] Unknown particle type: ${params.type}`);
      return;
    }
    
    // Create particle mesh
    const geometry = this.particleGeometry.clone();
    geometry.scale(params.size, params.size, params.size);
    
    const mesh = new THREE.Mesh(geometry, material.clone());
    mesh.position.copy(params.position);
    
    // Create particle effect data
    const particle: ParticleEffect = {
      id,
      position: params.position.clone(),
      velocity: params.velocity.clone(),
      lifetime: params.lifetime,
      maxLifetime: params.lifetime,
      color: new THREE.Color((material as THREE.MeshBasicMaterial).color),
      size: params.size,
      mesh,
      type: params.type
    };
    
    this.activeParticles.set(id, particle);
    this.scene.add(mesh);
  }
  
  /**
   * Update visual effects system
   */
  public update(deltaTime: number): void {
    this.animationTime += deltaTime;
    
    // Update particles
    this.updateParticles(deltaTime);
    
    // Update camera following
    if (this.config.enableCameraFollow) {
      this.updateCameraFollow(deltaTime);
    }
    
    // Update visual indicators
    if (this.config.enableSpeedIndicators) {
      this.updateSpeedIndicators(deltaTime);
      this.updateDifficultyIndicator(deltaTime);
    }

    // Update wheel sparks
    if (this.wheelSparkEnabled && this.config.enableParticles && (this.config.enableWheelSparks ?? true)) {
      this.updateWheelSparks(deltaTime);
    }
  }

  /**
   * Toggle wheel sparks
   */
  public setWheelSparksEnabled(enabled: boolean): void {
    this.wheelSparkEnabled = enabled;
  }

  /**
   * Emit blocky, cartoonish sparks at the trolley wheels.
   * Creates tiny cubes with bright warm colors that burst backward.
   */
  private updateWheelSparks(deltaTime: number): void {
    this.lastSparkTime += deltaTime;
    if (this.lastSparkTime < this.sparkInterval) return;
    this.lastSparkTime = 0;

    const trolley = this.trolleyController.getTrolley();
    if (!trolley) return;

    const contacts = trolley.getWheelContactPoints();
    const speed = this.trolleyController.speed;
    if (speed <= 0) return;

  const baseCount = 6; // larger burst for drama
  const size = 0.055; // slightly larger cubes
  const lifetime = 0.6; // a bit longer-lived

    const trolleyPos = this.trolleyController.position;
    for (const c of contacts) {
      const sideSign = Math.sign(c.x - trolleyPos.x) || (Math.random() < 0.5 ? -1 : 1);
      for (let i = 0; i < baseCount; i++) {
        // Backward-biased velocity with stronger outward lateral component
        const lateral = sideSign * (0.6 + Math.random() * 1.4); // push to sides
        const vx = lateral + (Math.random() - 0.5) * 0.4; // add jitter
        const vy = Math.random() * 1.2 + 0.6; // a bit higher
        const vz = -(
          1.2 + Math.random() * 1.2 + Math.min(speed * 0.18, 3.0)
        ) + (Math.random() - 0.5) * 0.6; // backward with some spread

        const colorHex = this.sparkColorPalette[(Math.random() * this.sparkColorPalette.length) | 0];
        this.particleMaterials.get('spark')?.color.set(colorHex);

        this.createBlockyParticle({
          position: c.clone().add(new THREE.Vector3(0, 0.02, 0)),
          velocity: new THREE.Vector3(vx, vy, vz),
          lifetime: lifetime * (0.8 + Math.random() * 0.7),
          size: size * (0.8 + Math.random() * 0.6)
        });
      }
    }
  }

  /**
   * Create a blocky particle using a small BoxGeometry to emphasize the voxel/cartoon style.
   */
  private createBlockyParticle(params: { position: THREE.Vector3; velocity: THREE.Vector3; lifetime: number; size: number; }): void {
    const id = `particle_${this.particleIdCounter++}`;
    const material = this.particleMaterials.get('spark');
    if (!material) return;

    const geometry = new THREE.BoxGeometry(params.size, params.size, params.size);
    const mesh = new THREE.Mesh(geometry, material.clone());
    mesh.position.copy(params.position);

    const particle: ParticleEffect = {
      id,
      position: params.position.clone(),
      velocity: params.velocity.clone(),
      lifetime: params.lifetime,
      maxLifetime: params.lifetime,
      color: new THREE.Color((mesh.material as THREE.MeshBasicMaterial).color),
      size: params.size,
      mesh,
      type: 'spark'
    };

    this.activeParticles.set(id, particle);
    this.scene.add(mesh);
  }
  
  /**
   * Update particle system
   */
  private updateParticles(deltaTime: number): void {
    const particlesToRemove: string[] = [];
    
    this.activeParticles.forEach((particle, id) => {
      // Update lifetime
      particle.lifetime -= deltaTime;
      
      if (particle.lifetime <= 0) {
        particlesToRemove.push(id);
        return;
      }
      
      // Update position
      particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
      particle.mesh.position.copy(particle.position);
      
      // Apply gravity to certain particle types
      if (particle.type === 'collision' || particle.type === 'explosion') {
        particle.velocity.y -= 9.8 * deltaTime; // Gravity
      }
      if (particle.type === 'spark') {
        // Light gravity and drag to curve trajectories
        particle.velocity.y -= 7.5 * deltaTime;
        particle.velocity.multiplyScalar(0.982);
      }
      
      // Update opacity based on lifetime
      const lifetimeRatio = particle.lifetime / particle.maxLifetime;
      const material = particle.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = lifetimeRatio * 0.8;
      
      // Update size for some effects
      if (particle.type === 'explosion') {
        const scale = 1 + (1 - lifetimeRatio) * 2;
        particle.mesh.scale.setScalar(scale);
      }
      if (particle.type === 'spark') {
        // Fade quicker and keep blocky size constant for a chunky look
        const material = particle.mesh.material as THREE.MeshBasicMaterial;
        material.opacity = Math.max(0, lifetimeRatio * 0.9);
      }
    });
    
    // Remove expired particles
    particlesToRemove.forEach(id => {
      const particle = this.activeParticles.get(id);
      if (particle) {
        this.scene.remove(particle.mesh);
        particle.mesh.geometry.dispose();
        (particle.mesh.material as THREE.Material).dispose();
        this.activeParticles.delete(id);
      }
    });
  }
  
  /**
   * Update smooth camera following
   * Requirement 5.4: Smooth camera following and movement
   */
  private updateCameraFollow(deltaTime: number): void {
    const trolleyPos = this.trolleyController.position;
    
    // Calculate target camera position
    this.targetCameraPosition.copy(trolleyPos).add(this.config.cameraOffset);
    
    // Smooth interpolation to target position
    this.currentCameraPosition.lerp(
      this.targetCameraPosition,
      this.config.cameraFollowSpeed * deltaTime
    );
    
    // Update camera position
    if (this.camera.position) {
      this.camera.position.copy(this.currentCameraPosition);
    }
    
    // Make camera look at trolley
    if ('lookAt' in this.camera) {
      (this.camera as any).lookAt(trolleyPos);
    }
  }
  
  /**
   * Update speed indicators
   * Requirement 5.4: Visual indicators for speed increases
   */
  private updateSpeedIndicators(_deltaTime: number): void {
    // Disabled: Hide all speed indicators (yellow rings)
    this.speedIndicators.forEach((indicator, _index) => {
      indicator.isActive = false;
      indicator.mesh.visible = false;
    });
  }
  
  /**
   * Update difficulty indicator
   * Requirement 5.4: Visual indicators for difficulty changes
   */
  private updateDifficultyIndicator(_deltaTime: number): void {
    if (!this.difficultyIndicator) return;
    
    // Disabled: Hide the difficulty indicator (red arrow)
    this.difficultyIndicator.visible = false;
  }
  
  /**
   * Set camera follow target offset
   */
  public setCameraOffset(offset: THREE.Vector3): void {
    this.config.cameraOffset.copy(offset);
  }
  
  /**
   * Enable or disable specific effects
   */
  public setEffectsEnabled(effects: {
    particles?: boolean;
    cameraFollow?: boolean;
    speedIndicators?: boolean;
  }): void {
    if (effects.particles !== undefined) {
      this.config.enableParticles = effects.particles;
    }
    if (effects.cameraFollow !== undefined) {
      this.config.enableCameraFollow = effects.cameraFollow;
    }
    if (effects.speedIndicators !== undefined) {
      this.config.enableSpeedIndicators = effects.speedIndicators;
      
      // Hide indicators if disabled
      if (!effects.speedIndicators) {
        this.speedIndicators.forEach(indicator => {
          indicator.mesh.visible = false;
        });
        if (this.difficultyIndicator) {
          this.difficultyIndicator.visible = false;
        }
      }
    }
  }
  
  /**
   * Get current particle count
   */
  public getActiveParticleCount(): number {
    return this.activeParticles.size;
  }
  
  /**
   * Clear all active particles
   */
  public clearAllParticles(): void {
    this.activeParticles.forEach(particle => {
      this.scene.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      (particle.mesh.material as THREE.Material).dispose();
    });
    this.activeParticles.clear();
    
    console.log('[VisualEffectsSystem] Cleared all particles');
  }
  
  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<VisualEffectsConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
  
  /**
   * Dispose of all resources
   */
  public dispose(): void {
    // Clear all particles
    this.clearAllParticles();
    
    // Dispose of particle materials
    this.particleMaterials.forEach(material => material.dispose());
    this.particleMaterials.clear();
    
    // Dispose of particle geometry
    this.particleGeometry.dispose();
    
    // Remove speed indicators
    this.speedIndicators.forEach(indicator => {
      this.scene.remove(indicator.mesh);
      indicator.mesh.geometry.dispose();
      (indicator.mesh.material as THREE.Material).dispose();
    });
    this.speedIndicators = [];
    
    // Remove difficulty indicator
    if (this.difficultyIndicator) {
      this.scene.remove(this.difficultyIndicator);
      this.difficultyIndicator.geometry.dispose();
      (this.difficultyIndicator.material as THREE.Material).dispose();
      this.difficultyIndicator = undefined;
    }
    
    console.log('[VisualEffectsSystem] Disposed');
  }
}

/**
 * Default configuration for VisualEffectsSystem
 */
export const DEFAULT_VISUAL_EFFECTS_CONFIG: VisualEffectsConfig = {
  particleCount: 100,
  particleLifetime: 2.0,
  cameraFollowSpeed: 2.0,
  cameraOffset: new THREE.Vector3(0, 10, -8),
  speedIndicatorThreshold: 2.0,
  difficultyIndicatorThreshold: 5.0,
  enableParticles: true,
  enableCameraFollow: true,
  enableSpeedIndicators: true,
  enableWheelSparks: true
};

/**
 * Factory function to create VisualEffectsSystem
 */
export function createVisualEffectsSystem(
  scene: THREE.Scene,
  camera: THREE.Camera,
  trolleyController: TrolleyController,
  gameConfig: GameConfig,
  config?: Partial<VisualEffectsConfig>
): VisualEffectsSystem {
  return new VisualEffectsSystem(scene, camera, trolleyController, gameConfig, config);
}
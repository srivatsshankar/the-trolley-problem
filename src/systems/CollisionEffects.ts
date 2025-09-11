/**
 * CollisionEffects - Visual feedback system for collisions
 * Implements visual feedback requirements for collision detection
 */

import * as THREE from 'three';

export interface EffectConfig {
  duration: number;
  size: number;
  color: number;
  opacity: number;
  animationType: 'pulse' | 'expand' | 'flash';
}

export class CollisionEffects {
  private scene: THREE.Scene;
  private activeEffects: Map<string, CollisionEffect> = new Map();
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Show collision effect for obstacle hit
   */
  public showObstacleCollisionEffect(position: THREE.Vector3): void {
    const config: EffectConfig = {
      duration: 2000, // 2 seconds
      size: 0.5,
      color: 0xFF0000, // Red for danger
      opacity: 0.8,
      animationType: 'flash'
    };
    
    this.createCollisionEffect(position, config, 'obstacle');
  }

  /**
   * Show collision effect for person hit
   */
  public showPersonCollisionEffect(position: THREE.Vector3): void {
    const config: EffectConfig = {
      duration: 1500, // 1.5 seconds
      size: 0.3,
      color: 0xFFFF00, // Yellow for warning
      opacity: 0.6,
      animationType: 'pulse'
    };
    
    this.createCollisionEffect(position, config, 'person');
  }

  /**
   * Show warning effect when near collision
   */
  public showWarningEffect(position: THREE.Vector3): void {
    const config: EffectConfig = {
      duration: 500, // 0.5 seconds
      size: 0.2,
      color: 0xFFA500, // Orange for warning
      opacity: 0.4,
      animationType: 'expand'
    };
    
    this.createCollisionEffect(position, config, 'warning');
  }

  /**
   * Create a collision effect at the specified position
   */
  private createCollisionEffect(position: THREE.Vector3, config: EffectConfig, type: string): void {
    const effectId = `${type}_${Date.now()}_${Math.random()}`;
    const effect = new CollisionEffect(position, config, this.scene);
    
    this.activeEffects.set(effectId, effect);
    
    // Auto-remove after duration
    setTimeout(() => {
      this.removeEffect(effectId);
    }, config.duration);
  }

  /**
   * Remove a specific effect
   */
  private removeEffect(effectId: string): void {
    const effect = this.activeEffects.get(effectId);
    if (effect) {
      effect.dispose();
      this.activeEffects.delete(effectId);
    }
  }

  /**
   * Update all active effects
   */
  public update(deltaTime: number): void {
    for (const effect of this.activeEffects.values()) {
      effect.update(deltaTime);
    }
  }

  /**
   * Clear all active effects
   */
  public clearAllEffects(): void {
    for (const [_effectId, effect] of this.activeEffects) {
      effect.dispose();
    }
    this.activeEffects.clear();
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this.clearAllEffects();
  }
}

/**
 * Individual collision effect
 */
class CollisionEffect {
  private mesh: THREE.Mesh;
  private material: THREE.MeshBasicMaterial;
  private startTime: number;
  private config: EffectConfig;
  private scene: THREE.Scene;
  private initialScale: number;
  private initialOpacity: number;

  constructor(position: THREE.Vector3, config: EffectConfig, scene: THREE.Scene) {
    this.config = config;
    this.scene = scene;
    this.startTime = Date.now();
    this.initialScale = config.size;
    this.initialOpacity = config.opacity;

    // Create effect geometry
    const geometry = this.createEffectGeometry();
    
    // Create effect material
    this.material = new THREE.MeshBasicMaterial({
      color: config.color,
      transparent: true,
      opacity: config.opacity,
      side: THREE.DoubleSide
    });

    // Create mesh
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.copy(position);
    this.mesh.scale.setScalar(config.size);

    // Add to scene
    scene.add(this.mesh);
  }

  /**
   * Create geometry based on effect type
   */
  private createEffectGeometry(): THREE.BufferGeometry {
    // Create a simple sphere for all effect types
    return new THREE.SphereGeometry(1, 16, 16);
  }

  /**
   * Update effect animation
   */
  public update(_deltaTime: number): void {
    const elapsed = Date.now() - this.startTime;
    const progress = Math.min(elapsed / this.config.duration, 1);

    switch (this.config.animationType) {
      case 'pulse':
        this.updatePulseAnimation(progress);
        break;
      case 'expand':
        this.updateExpandAnimation(progress);
        break;
      case 'flash':
        this.updateFlashAnimation(progress);
        break;
    }
  }

  /**
   * Update pulse animation (size oscillation)
   */
  private updatePulseAnimation(progress: number): void {
    const pulseFrequency = 4; // 4 pulses per duration
    const pulse = Math.sin(progress * Math.PI * pulseFrequency);
    const scale = this.initialScale * (1 + pulse * 0.3);
    
    this.mesh.scale.setScalar(scale);
    
    // Fade out over time
    this.material.opacity = this.initialOpacity * (1 - progress);
  }

  /**
   * Update expand animation (growing size)
   */
  private updateExpandAnimation(progress: number): void {
    const scale = this.initialScale * (1 + progress * 2);
    this.mesh.scale.setScalar(scale);
    
    // Fade out as it expands
    this.material.opacity = this.initialOpacity * (1 - progress);
  }

  /**
   * Update flash animation (opacity flashing)
   */
  private updateFlashAnimation(progress: number): void {
    const flashFrequency = 6; // 6 flashes per duration
    const flash = Math.abs(Math.sin(progress * Math.PI * flashFrequency));
    
    this.material.opacity = this.initialOpacity * flash * (1 - progress * 0.5);
    
    // Slight scale variation
    const scaleVariation = 1 + Math.sin(progress * Math.PI * flashFrequency) * 0.1;
    this.mesh.scale.setScalar(this.initialScale * scaleVariation);
  }

  /**
   * Dispose of effect resources
   */
  public dispose(): void {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

/**
 * Factory function to create collision effects system
 */
export function createCollisionEffects(scene: THREE.Scene): CollisionEffects {
  return new CollisionEffects(scene);
}
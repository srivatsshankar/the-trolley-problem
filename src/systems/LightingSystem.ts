/**
 * LightingSystem - Enhanced lighting and material effects for cartoonish feel
 * Implements requirements: 1.5 (bright, vivid colors and cartoonish feel)
 */

import * as THREE from 'three';

export interface LightingConfig {
  ambientIntensity: number;
  directionalIntensity: number;
  directionalPosition: THREE.Vector3;
  enableShadows: boolean;
  shadowMapSize: number;
  enableToonShading: boolean;
  rimLightIntensity: number;
  colorTemperature: number;
}

export interface DynamicLight {
  light: THREE.Light;
  originalIntensity: number;
  animationPhase: number;
  type: 'pulse' | 'flicker' | 'rotate' | 'static';
}

export class LightingSystem {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private config: LightingConfig;
  
  // Core lighting
  private ambientLight!: THREE.AmbientLight;
  private directionalLight!: THREE.DirectionalLight;
  private rimLight!: THREE.DirectionalLight;
  
  // Dynamic lighting effects
  private dynamicLights: DynamicLight[] = [];
  
  // Animation time
  private animationTime: number = 0;
  
  constructor(
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    config?: Partial<LightingConfig>
  ) {
    this.scene = scene;
    this.renderer = renderer;
    
    this.config = {
      ambientIntensity: 0.6,
      directionalIntensity: 1.2,
      directionalPosition: new THREE.Vector3(10, 20, 10),
      enableShadows: true,
      shadowMapSize: 2048,
      enableToonShading: false,
      rimLightIntensity: 0.4,
      colorTemperature: 6500,
      ...config
    };
    
    this.initializeLighting();
    this.setupShadows();
    this.setupToonShading();
    
    console.log('[LightingSystem] Created with enhanced cartoonish lighting');
  }
  
  /**
   * Initialize core lighting setup
   */
  private initializeLighting(): void {
    // Ambient light for overall brightness
    this.ambientLight = new THREE.AmbientLight(
      this.getColorFromTemperature(this.config.colorTemperature),
      this.config.ambientIntensity
    );
    this.scene.add(this.ambientLight);
    
    // Main directional light (sun)
    this.directionalLight = new THREE.DirectionalLight(
      this.getColorFromTemperature(this.config.colorTemperature + 500),
      this.config.directionalIntensity
    );
    this.directionalLight.position.copy(this.config.directionalPosition);
    this.directionalLight.target.position.set(0, 0, 0);
    this.scene.add(this.directionalLight);
    this.scene.add(this.directionalLight.target);
    
    // Rim light for cartoonish outline effect
    this.rimLight = new THREE.DirectionalLight(
      0x88CCFF, // Cool blue rim light
      this.config.rimLightIntensity
    );
    this.rimLight.position.set(-10, 15, -10);
    this.scene.add(this.rimLight);
    
    // Add some fill lights for better illumination
    this.addFillLights();
  }
  
  /**
   * Add fill lights for better scene illumination
   */
  private addFillLights(): void {
    // Left fill light
    const leftFill = new THREE.DirectionalLight(0xFFEECC, 0.3);
    leftFill.position.set(-15, 10, 5);
    this.scene.add(leftFill);
    
    this.dynamicLights.push({
      light: leftFill,
      originalIntensity: 0.3,
      animationPhase: 0,
      type: 'pulse'
    });
    
    // Right fill light
    const rightFill = new THREE.DirectionalLight(0xCCEEFF, 0.25);
    rightFill.position.set(15, 8, -5);
    this.scene.add(rightFill);
    
    this.dynamicLights.push({
      light: rightFill,
      originalIntensity: 0.25,
      animationPhase: Math.PI,
      type: 'pulse'
    });
    
    // Top light for additional brightness
    const topLight = new THREE.PointLight(0xFFFFFF, 0.4, 50);
    topLight.position.set(0, 25, 0);
    this.scene.add(topLight);
    
    this.dynamicLights.push({
      light: topLight,
      originalIntensity: 0.4,
      animationPhase: Math.PI / 2,
      type: 'static'
    });
  }
  
  /**
   * Setup shadow system
   */
  private setupShadows(): void {
    if (!this.config.enableShadows) return;
    
    // Enable shadows on renderer
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Configure directional light shadows
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = this.config.shadowMapSize;
    this.directionalLight.shadow.mapSize.height = this.config.shadowMapSize;
    
    // Set shadow camera bounds
    const shadowCamera = this.directionalLight.shadow.camera as THREE.OrthographicCamera;
    shadowCamera.left = -50;
    shadowCamera.right = 50;
    shadowCamera.top = 50;
    shadowCamera.bottom = -50;
    shadowCamera.near = 0.1;
    shadowCamera.far = 100;
    
    // Soft shadows
    this.directionalLight.shadow.radius = 8;
    this.directionalLight.shadow.blurSamples = 25;
  }
  
  /**
   * Setup toon shading effects
   */
  private setupToonShading(): void {
    if (!this.config.enableToonShading) return;
    
    // This would typically involve custom shaders
    // For now, we'll use enhanced material properties
    console.log('[LightingSystem] Toon shading effects enabled');
  }
  
  /**
   * Get color from temperature (Kelvin)
   */
  private getColorFromTemperature(temperature: number): THREE.Color {
    // Simplified color temperature conversion
    if (temperature < 3000) {
      return new THREE.Color(1.0, 0.6, 0.3); // Warm
    } else if (temperature < 5000) {
      return new THREE.Color(1.0, 0.9, 0.7); // Neutral warm
    } else if (temperature < 7000) {
      return new THREE.Color(1.0, 1.0, 1.0); // Neutral
    } else {
      return new THREE.Color(0.8, 0.9, 1.0); // Cool
    }
  }
  
  /**
   * Update lighting system
   */
  public update(deltaTime: number): void {
    this.animationTime += deltaTime;
    
    // Update dynamic lights
    this.updateDynamicLights(deltaTime);
    
    // Update directional light position for dynamic shadows
    this.updateSunPosition(deltaTime);
  }
  
  /**
   * Update dynamic lighting effects
   */
  private updateDynamicLights(deltaTime: number): void {
    this.dynamicLights.forEach(dynamicLight => {
      dynamicLight.animationPhase += deltaTime;
      
      switch (dynamicLight.type) {
        case 'pulse':
          const pulseIntensity = dynamicLight.originalIntensity * 
            (0.8 + 0.2 * Math.sin(dynamicLight.animationPhase * 2));
          dynamicLight.light.intensity = pulseIntensity;
          break;
          
        case 'flicker':
          const flickerIntensity = dynamicLight.originalIntensity * 
            (0.7 + 0.3 * Math.random());
          dynamicLight.light.intensity = flickerIntensity;
          break;
          
        case 'rotate':
          if (dynamicLight.light instanceof THREE.DirectionalLight) {
            const angle = dynamicLight.animationPhase * 0.5;
            const radius = 20;
            dynamicLight.light.position.set(
              Math.cos(angle) * radius,
              15,
              Math.sin(angle) * radius
            );
          }
          break;
          
        case 'static':
          // No animation, keep original intensity
          break;
      }
    });
  }
  
  /**
   * Update sun position for dynamic lighting
   */
  private updateSunPosition(_deltaTime: number): void {
    // Subtle sun movement for dynamic shadows
    const sunAngle = this.animationTime * 0.1;
    const basePos = this.config.directionalPosition;
    
    this.directionalLight.position.set(
      basePos.x + Math.sin(sunAngle) * 2,
      basePos.y,
      basePos.z + Math.cos(sunAngle) * 2
    );
  }
  
  /**
   * Enhance material for cartoonish look
   */
  public enhanceMaterial(material: THREE.Material): THREE.Material {
    if (material instanceof THREE.MeshStandardMaterial) {
      // Enhance for cartoonish appearance
      material.roughness = Math.min(material.roughness + 0.2, 1.0);
      material.metalness = Math.max(material.metalness - 0.1, 0.0);
      
      // Increase color saturation
      if (material.color) {
        const hsl = { h: 0, s: 0, l: 0 };
        material.color.getHSL(hsl);
        hsl.s = Math.min(hsl.s * 1.2, 1.0); // Increase saturation
        hsl.l = Math.min(hsl.l * 1.1, 1.0); // Slightly brighter
        material.color.setHSL(hsl.h, hsl.s, hsl.l);
      }
      
      // Add slight emissive glow
      if (material.emissive) {
        material.emissiveIntensity = Math.min(material.emissiveIntensity + 0.1, 0.5);
      }
    }
    
    return material;
  }
  
  /**
   * Create cartoonish material
   */
  public createCartoonMaterial(baseColor: THREE.Color, options?: {
    roughness?: number;
    metalness?: number;
    emissiveIntensity?: number;
  }): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: options?.roughness ?? 0.8,
      metalness: options?.metalness ?? 0.1,
      emissive: baseColor.clone().multiplyScalar(0.1),
      emissiveIntensity: options?.emissiveIntensity ?? 0.2
    });
    
    // Enhance color saturation
    const hsl = { h: 0, s: 0, l: 0 };
    material.color.getHSL(hsl);
    hsl.s = Math.min(hsl.s * 1.3, 1.0);
    material.color.setHSL(hsl.h, hsl.s, hsl.l);
    
    return material;
  }
  
  /**
   * Add accent lighting for specific objects
   */
  public addAccentLight(position: THREE.Vector3, color: THREE.Color, intensity: number = 0.5): THREE.PointLight {
    const accentLight = new THREE.PointLight(color, intensity, 10);
    accentLight.position.copy(position);
    this.scene.add(accentLight);
    
    this.dynamicLights.push({
      light: accentLight,
      originalIntensity: intensity,
      animationPhase: Math.random() * Math.PI * 2,
      type: 'pulse'
    });
    
    return accentLight;
  }
  
  /**
   * Set time of day lighting
   */
  public setTimeOfDay(timeRatio: number): void {
    // timeRatio: 0 = dawn, 0.5 = noon, 1 = dusk
    const sunHeight = Math.sin(timeRatio * Math.PI) * 20 + 5;
    const sunAngle = timeRatio * Math.PI;
    
    this.directionalLight.position.set(
      Math.cos(sunAngle) * 15,
      sunHeight,
      Math.sin(sunAngle) * 15
    );
    
    // Adjust color temperature based on time
    let temperature = 6500; // Noon
    if (timeRatio < 0.3 || timeRatio > 0.7) {
      temperature = 3000; // Dawn/dusk
    }
    
    const sunColor = this.getColorFromTemperature(temperature);
    this.directionalLight.color = sunColor;
    this.ambientLight.color = sunColor.clone().multiplyScalar(0.8);
  }
  
  /**
   * Create dramatic lighting for special effects
   */
  public createDramaticLighting(intensity: number = 1.0): void {
    // Temporarily increase contrast
    this.directionalLight.intensity = this.config.directionalIntensity * (1 + intensity);
    this.ambientLight.intensity = this.config.ambientIntensity * (1 - intensity * 0.3);
    
    // Reset after short duration
    setTimeout(() => {
      this.directionalLight.intensity = this.config.directionalIntensity;
      this.ambientLight.intensity = this.config.ambientIntensity;
    }, 500);
  }
  
  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<LightingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Apply configuration changes
    if (newConfig.ambientIntensity !== undefined) {
      this.ambientLight.intensity = newConfig.ambientIntensity;
    }
    if (newConfig.directionalIntensity !== undefined) {
      this.directionalLight.intensity = newConfig.directionalIntensity;
    }
    if (newConfig.directionalPosition !== undefined) {
      this.directionalLight.position.copy(newConfig.directionalPosition);
    }
    if (newConfig.colorTemperature !== undefined) {
      const color = this.getColorFromTemperature(newConfig.colorTemperature);
      this.directionalLight.color = color;
      this.ambientLight.color = color.clone().multiplyScalar(0.8);
    }
  }
  
  /**
   * Get current lighting configuration
   */
  public getConfig(): LightingConfig {
    return { ...this.config };
  }
  
  /**
   * Dispose of all resources
   */
  public dispose(): void {
    // Remove lights from scene
    this.scene.remove(this.ambientLight);
    this.scene.remove(this.directionalLight);
    this.scene.remove(this.directionalLight.target);
    this.scene.remove(this.rimLight);
    
    // Remove dynamic lights
    this.dynamicLights.forEach(dynamicLight => {
      this.scene.remove(dynamicLight.light);
    });
    this.dynamicLights = [];
    
    console.log('[LightingSystem] Disposed');
  }
}

/**
 * Default configuration for LightingSystem
 */
export const DEFAULT_LIGHTING_CONFIG: LightingConfig = {
  ambientIntensity: 0.6,
  directionalIntensity: 1.2,
  directionalPosition: new THREE.Vector3(10, 20, 10),
  enableShadows: true,
  shadowMapSize: 2048,
  enableToonShading: false,
  rimLightIntensity: 0.4,
  colorTemperature: 6500
};

/**
 * Factory function to create LightingSystem
 */
export function createLightingSystem(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  config?: Partial<LightingConfig>
): LightingSystem {
  return new LightingSystem(scene, renderer, config);
}
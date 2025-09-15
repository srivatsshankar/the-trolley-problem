/**
 * Trolley 3D model and visual representation
 * Implements requirements: 5.4, 5.5, 1.4, 1.5
 */

import * as THREE from 'three';

export interface TrolleyConfig {
  size: {
    width: number;
    height: number;
    length: number;
  };
  colors: {
    body: number;
    roof: number;
    wheels: number;
    windows: number;
    chimney: number;
  };
  wheelSize: {
    width: number;
    height: number;
    depth: number;
  };
  wheelCount: number;
  chimney: {
    width: number;
    height: number;
    depth: number;
  };
}

export class Trolley {
  private group: THREE.Group;
  private body!: THREE.Mesh;
  private roof!: THREE.Mesh;
  private wheels: THREE.Mesh[];
  private windows: THREE.Mesh[];
  private chimney!: THREE.Mesh;
  private smokeParticles: THREE.Points[] = [];
  private topLightMesh?: THREE.Mesh;
  // No real PointLight on trolley to avoid ground lighting artifacts
  private config: TrolleyConfig;
  
  // Railway track constants (should match RailwayTrack.ts DEFAULT_RAILWAY_CONFIG)
  private static readonly RAIL_TOP_HEIGHT = 0.25; // tieHeight (0.15) + railHeight/2 (0.1)
  // Small hover offset to keep trolley slightly above rails (prevents intersecting visuals)
  private static readonly HOVER_OFFSET = 0.05;
  // Half of rail height from DEFAULT_RAILWAY_CONFIG.railHeight (0.2 / 2)
  private static readonly RAIL_HALF_HEIGHT = 0.1;
  
  // Animation properties
  private isAnimating: boolean = true;
  private rockingOffset: number = 0;
  private smokeTime: number = 0;
  private flickerTime: number = 0;
  private rockingAmplitudeBase: number = 0.03;
  private rockingBoost: number = 0;
  // Optional real-time window reflections
  private cubeCamera?: THREE.CubeCamera;
  private reflectionScene?: THREE.Scene;
  private reflectionRenderer?: THREE.WebGLRenderer;
  // (no accumulator needed when updating every frame)
  
  constructor(config: TrolleyConfig) {
    this.config = config;
    this.group = new THREE.Group();
    this.wheels = [];
    this.windows = [];
    
    this.createTrolleyModel();
  }
  
  /**
   * Create the complete 3D trolley model
   */
  private createTrolleyModel(): void {
    this.createBody();
    this.createRoof();
    this.createWheels();
    this.createWindows();
    this.createChimney();
    this.createSmokeSystem();
    this.createDetails();
    
    // Apply basic environment mapping for window reflections
    this.createBasicEnvironmentMap();
    
    // Set up the group for proper positioning
    this.group.name = 'Trolley';
    
    // Position trolley to hover slightly above the railway rails
    this.group.position.y = this.getBaseY();
  }

  /**
   * Compute the baseline Y so the trolley hovers slightly above rail tops.
   * Lowest wheel point (group.y - bodyHalf - wheelHeight) sits at rails + hover.
   */
  private getBaseY(): number {
    const bodyHalf = this.config.size.height / 2;
    const wheelH = this.config.wheelSize.height;
    // Rails top = center (RAIL_TOP_HEIGHT) + half rail height
    const railsTop = Trolley.RAIL_TOP_HEIGHT + Trolley.RAIL_HALF_HEIGHT;
    return railsTop + Trolley.HOVER_OFFSET + bodyHalf + wheelH;
  }
  
  /**
   * Create the main trolley body
   */
  private createBody(): void {
    const bodyGeometry = new THREE.BoxGeometry(
      this.config.size.width,
      this.config.size.height,
      this.config.size.length
    );
    
    const bodyMaterial = new THREE.MeshLambertMaterial({
      color: this.config.colors.body,
      transparent: false
    });
    
    this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.body.castShadow = true;
    this.body.receiveShadow = true;
    this.body.name = 'TrolleyBody';
    
    this.group.add(this.body);
  }
  
  /**
   * Create the trolley roof
   */
  private createRoof(): void {
    const roofGeometry = new THREE.BoxGeometry(
      this.config.size.width + 0.1,
      0.2,
      this.config.size.length + 0.1
    );
    
    const roofMaterial = new THREE.MeshLambertMaterial({
      color: this.config.colors.roof
    });
    
    this.roof = new THREE.Mesh(roofGeometry, roofMaterial);
    this.roof.position.y = this.config.size.height / 2 + 0.1;
    this.roof.castShadow = true;
    this.roof.name = 'TrolleyRoof';
    
    this.group.add(this.roof);
  }
  
  /**
   * Create trolley wheels (blocky/squarish design)
   */
  private createWheels(): void {
  // Create blocky wheel geometry (square wheels) positioned under the body
    const wheelGeometry = new THREE.BoxGeometry(
      this.config.wheelSize.width,
      this.config.wheelSize.height,
      this.config.wheelSize.depth
    );
    
    const wheelMaterial = new THREE.MeshLambertMaterial({
      color: this.config.colors.wheels
    });
    
    // Create wheels based on configuration
  const wheelPositions = this.calculateWheelPositions();
    
    for (let i = 0; i < wheelPositions.length; i++) {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.position.copy(wheelPositions[i]);
      wheel.castShadow = true;
      wheel.name = `TrolleyWheel${i}`;
      
      this.wheels.push(wheel);
      this.group.add(wheel);
    }
  }
  
  /**
   * Calculate wheel positions for 4 wheels (2 front, 2 back)
   */
  private calculateWheelPositions(): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    const wheelY = -this.config.size.height / 2 - this.config.wheelSize.height / 2;
  const wheelOffsetZ = this.config.size.length * 0.35; // near front/back
  // Place wheels flush with the sides: center them so the wheel outer face aligns with body edge
  const halfWidth = this.config.size.width / 2 - this.config.wheelSize.width / 2 + 0.001; // small epsilon to avoid z-fighting

  // Left side (x = -halfWidth)
  positions.push(new THREE.Vector3(-halfWidth, wheelY, wheelOffsetZ));
  positions.push(new THREE.Vector3(-halfWidth, wheelY, -wheelOffsetZ));
  // Right side (x = +halfWidth)
  positions.push(new THREE.Vector3(halfWidth, wheelY, wheelOffsetZ));
  positions.push(new THREE.Vector3(halfWidth, wheelY, -wheelOffsetZ));
    
    return positions;
  }
  
  /**
   * Create trolley windows (multiple windows for better detail)
   */
  private createWindows(): void {
    // Highly reflective, glassy windows that reflect environment and tracks
    const windowMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(this.config.colors.windows).multiplyScalar(0.98),
      metalness: 0.1,
      roughness: 0.01,
      clearcoat: 1.0,
      clearcoatRoughness: 0.01,
      transmission: 0.25,
      thickness: 0.05,
      ior: 1.52,
      transparent: true,
      opacity: 0.92,
      envMapIntensity: 3.5,
      specularIntensity: 1.0,
      specularColor: new THREE.Color(0xFFFFFF),
      reflectivity: 0.9,
      side: THREE.DoubleSide
    });
    
    // Front windshield
    const frontWindowGeometry = new THREE.PlaneGeometry(0.9, 0.7);
    const frontWindow = new THREE.Mesh(frontWindowGeometry, windowMaterial);
    frontWindow.position.set(0, 0.15, this.config.size.length / 2 + 0.01);
    frontWindow.name = 'FrontWindow';
    this.windows.push(frontWindow);
    this.group.add(frontWindow);
    
    // Back window
    const backWindow = new THREE.Mesh(frontWindowGeometry, windowMaterial);
    backWindow.position.set(0, 0.15, -this.config.size.length / 2 - 0.01);
    backWindow.rotation.y = Math.PI;
    backWindow.name = 'BackWindow';
    this.windows.push(backWindow);
    this.group.add(backWindow);
    
    // Side windows (multiple smaller windows for more detail)
  const sideWindowGeometry = new THREE.PlaneGeometry(0.6, 0.5);
    
    // Left side windows
    const leftWindow1 = new THREE.Mesh(sideWindowGeometry, windowMaterial);
    leftWindow1.position.set(-this.config.size.width / 2 - 0.01, 0.15, 0.4);
    leftWindow1.rotation.y = Math.PI / 2;
    leftWindow1.name = 'LeftWindow1';
    this.windows.push(leftWindow1);
    this.group.add(leftWindow1);
    
    const leftWindow2 = new THREE.Mesh(sideWindowGeometry, windowMaterial);
    leftWindow2.position.set(-this.config.size.width / 2 - 0.01, 0.15, -0.4);
    leftWindow2.rotation.y = Math.PI / 2;
    leftWindow2.name = 'LeftWindow2';
    this.windows.push(leftWindow2);
    this.group.add(leftWindow2);
    
    // Right side windows
    const rightWindow1 = new THREE.Mesh(sideWindowGeometry, windowMaterial);
    rightWindow1.position.set(this.config.size.width / 2 + 0.01, 0.15, 0.4);
    rightWindow1.rotation.y = -Math.PI / 2;
    rightWindow1.name = 'RightWindow1';
    this.windows.push(rightWindow1);
    this.group.add(rightWindow1);
    
    const rightWindow2 = new THREE.Mesh(sideWindowGeometry, windowMaterial);
    rightWindow2.position.set(this.config.size.width / 2 + 0.01, 0.15, -0.4);
    rightWindow2.rotation.y = -Math.PI / 2;
    rightWindow2.name = 'RightWindow2';
    this.windows.push(rightWindow2);
    this.group.add(rightWindow2);
  }
  
  /**
   * Create chimney with blocky design
   */
  private createChimney(): void {
    const chimneyGeometry = new THREE.BoxGeometry(
      this.config.chimney.width,
      this.config.chimney.height,
      this.config.chimney.depth
    );
    
    const chimneyMaterial = new THREE.MeshLambertMaterial({
      color: this.config.colors.chimney
    });
    
    this.chimney = new THREE.Mesh(chimneyGeometry, chimneyMaterial);
    this.chimney.position.set(
      0,
      this.config.size.height / 2 + this.config.chimney.height / 2 + 0.1,
      this.config.size.length / 3
    );
    this.chimney.castShadow = true;
    this.chimney.name = 'TrolleyChimney';
    
    this.group.add(this.chimney);
  }
  
  /**
   * Create smoke particle system
   */
  private createSmokeSystem(): void {
    // Create smoke particles
    const particleCount = 20;
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      // Start particles at chimney top
      positions[i3] = (Math.random() - 0.5) * 0.1; // x
      positions[i3 + 1] = 0; // y (will be offset by chimney position)
      positions[i3 + 2] = (Math.random() - 0.5) * 0.1; // z
      
      // Random upward velocities
      velocities[i3] = (Math.random() - 0.5) * 0.2; // x velocity
      velocities[i3 + 1] = Math.random() * 0.5 + 0.3; // y velocity (upward)
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.2; // z velocity
    }
    
    const smokeGeometry = new THREE.BufferGeometry();
    smokeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    smokeGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    
    const smokeMaterial = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 0.1,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    
    const smokePoints = new THREE.Points(smokeGeometry, smokeMaterial);
    smokePoints.name = 'TrolleySmoke';
    
    // Position smoke at chimney top
    smokePoints.position.set(
      0,
      this.config.size.height / 2 + this.config.chimney.height + 0.2,
      this.config.size.length / 3
    );
    
    this.smokeParticles.push(smokePoints);
    this.group.add(smokePoints);
  }
  
  /**
   * Update smoke particles animation
   */
  private updateSmoke(deltaTime: number): void {
    this.smokeTime += deltaTime;
    
    this.smokeParticles.forEach(smokeSystem => {
      const positions = smokeSystem.geometry.getAttribute('position') as THREE.BufferAttribute;
      const velocities = smokeSystem.geometry.getAttribute('velocity') as THREE.BufferAttribute;
      
      for (let i = 0; i < positions.count; i++) {
        const i3 = i * 3;
        
        // Update positions based on velocities
        positions.array[i3] += velocities.array[i3] * deltaTime; // x
        positions.array[i3 + 1] += velocities.array[i3 + 1] * deltaTime; // y
        positions.array[i3 + 2] += velocities.array[i3 + 2] * deltaTime; // z
        
        // Reset particles that have gone too high
        if (positions.array[i3 + 1] > 2.0) {
          positions.array[i3] = (Math.random() - 0.5) * 0.1;
          positions.array[i3 + 1] = 0;
          positions.array[i3 + 2] = (Math.random() - 0.5) * 0.1;
          
          // Randomize velocity again
          velocities.array[i3] = (Math.random() - 0.5) * 0.2;
          velocities.array[i3 + 1] = Math.random() * 0.5 + 0.3;
          velocities.array[i3 + 2] = (Math.random() - 0.5) * 0.2;
        }
      }
      
      positions.needsUpdate = true;
    });
  }
  
  /**
   * Create additional trolley details
   */
  private createDetails(): void {
    // Add a small top light that flickers (emissive mesh + optional point light)
    const lightGeom = new THREE.SphereGeometry(0.06, 12, 12);
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0x000000, // base off (no solid color)
      emissive: 0xFFD966,
      emissiveIntensity: 0.0,
      metalness: 0.2,
      roughness: 0.3
    });
    const topLight = new THREE.Mesh(lightGeom, lightMat);
  // Align flickering light to center (where the solid yellow dot was)
  topLight.position.set(0, this.config.size.height / 2 + 0.24, -this.config.size.length / 4);
    topLight.name = 'TrolleyTopLight';
    this.group.add(topLight);
    this.topLightMesh = topLight;

    // Intentionally do NOT add a real PointLight here.
    // The emissive mesh provides the visual without lighting the ground.
  }
  
  /**
   * Update trolley animations
   */
  public update(deltaTime: number, speed: number): void {
    if (!this.isAnimating) return;
  // Wheels remain static per updated visual requirement
    
    // Add gentle side-to-side rocking when moving
    if (speed > 0) {
      this.rockingOffset += deltaTime * speed * 0.8;
      const rockingAmplitude = this.rockingAmplitudeBase + this.rockingBoost;
      const rocking = Math.sin(this.rockingOffset) * rockingAmplitude;
      this.group.rotation.z = rocking;
    }
    
  // Add subtle vertical bobbing animation, relative to corrected base Y
    const bobbingAmplitude = 0.015;
    const bobbingFrequency = 4.0;
    const bobbing = Math.sin(Date.now() * 0.001 * bobbingFrequency) * bobbingAmplitude;
  this.group.position.y = this.getBaseY() + bobbing;
    
    // Update window reflections every frame if enabled
    if (this.cubeCamera && this.reflectionScene && this.reflectionRenderer) {
      const prevVis: boolean[] = [];
      // Hide windows to avoid self-reflection artifacts
      this.windows.forEach((w, idx) => { prevVis[idx] = w.visible; w.visible = false; });
      // Update cube camera from trolley position
      this.cubeCamera.position.copy(this.group.position);
      this.cubeCamera.update(this.reflectionRenderer, this.reflectionScene);
      // Restore windows
      this.windows.forEach((w, idx) => { w.visible = prevVis[idx]; });
    }

    // Top light flicker: simulate intermittent on/off with varying intensity
    this.flickerTime += deltaTime;
    const lightOn = Math.sin(this.flickerTime * 20.0) > 0.2 || Math.random() > 0.9; // occasional full off
    const baseIntensity = lightOn ? 1.0 : 0.0;
    const jitter = lightOn ? (0.2 + 0.3 * Math.random()) : 0.0;
    const intensity = baseIntensity * (0.6 + jitter);
    if (this.topLightMesh) {
      const mat = this.topLightMesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = intensity;
    }
    // No real PointLight intensity updates; keep lighting purely emissive.

    // Update smoke animation
    this.updateSmoke(deltaTime);
  }

  /**
   * Adjust base rocking amplitude.
   */
  public setRockingBaseAmplitude(value: number): void {
    this.rockingAmplitudeBase = Math.max(0, value);
  }

  /**
   * Enable/disable a temporary rocking boost (e.g., after a segment milestone).
   */
  public setRockingBoost(enabled: boolean): void {
    this.rockingBoost = enabled ? 0.012 : 0; // slight extra tilt
  }

  /**
   * Enable real-time reflections on windows using a cube camera.
   * Call this once after adding trolley to the scene, passing the same scene and renderer.
   */
  public enableWindowReflections(scene: THREE.Scene, renderer: THREE.WebGLRenderer, resolution: number = 256): void {
    // Create high-quality cube camera for better reflections
    const near = 0.1;
    const far = 100;
    const rt = new THREE.WebGLCubeRenderTarget(resolution, {
      format: THREE.RGBAFormat,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter
    });
    // Ensure color space matches renderer
    rt.texture.colorSpace = (THREE as any).SRGBColorSpace ?? rt.texture.colorSpace;
    this.cubeCamera = new THREE.CubeCamera(near, far, rt);
    this.group.add(this.cubeCamera);
    this.reflectionScene = scene;
    this.reflectionRenderer = renderer;
    
    // Assign envMap to all window materials with enhanced settings
    this.windows.forEach(mesh => {
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      mat.envMap = this.cubeCamera!.renderTarget.texture;
      mat.envMapIntensity = 3.5;
      mat.reflectivity = 0.9;
      mat.needsUpdate = true;
    });
  }
  
  /**
   * Create a basic environment map for window reflections when cube camera is not available
   */
  public createBasicEnvironmentMap(): void {
    // Create a simple gradient environment map for basic reflections
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d')!;
    
    // Create sky gradient
    const gradient = context.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, '#87CEEB'); // Sky blue at top
    gradient.addColorStop(0.7, '#B0E0E6'); // Lighter blue
    gradient.addColorStop(1, '#90EE90'); // Green at bottom (ground)
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    
    // Add some simple cloud patterns
    context.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 5; i++) {
      const x = (i * size / 5) + Math.random() * 10;
      const y = size * 0.2 + Math.random() * size * 0.3;
      const radius = 8 + Math.random() * 8;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.needsUpdate = true;
    
    // Apply to all window materials
    this.windows.forEach(mesh => {
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      if (!mat.envMap) { // Only set if no cube camera environment map exists
        mat.envMap = texture;
        mat.envMapIntensity = 2.0;
        mat.reflectivity = 0.7;
        mat.needsUpdate = true;
      }
    });
  }
  
  /**
   * Get the Three.js group containing the trolley model
   */
  public getGroup(): THREE.Group {
    return this.group;
  }

  /**
   * Get the world-space contact points for each wheel (bottom center of each wheel)
   * Useful for placing ground-level effects like sparks or dust.
   */
  public getWheelContactPoints(): THREE.Vector3[] {
    const contacts: THREE.Vector3[] = [];
    for (const wheel of this.wheels) {
      // Local bottom point of the wheel
      const local = new THREE.Vector3(
        wheel.position.x,
        wheel.position.y - this.config.wheelSize.height / 2,
        wheel.position.z
      );
      const world = this.group.localToWorld(local.clone());
      contacts.push(world);
    }
    return contacts;
  }
  
  /**
   * Set trolley position
   */
  public setPosition(position: THREE.Vector3): void {
  // Preserve computed Y (hover above rails), update X/Z from external position
  this.group.position.set(position.x, this.getBaseY(), position.z);
  }
  
  /**
   * Set trolley rotation
   */
  public setRotation(rotation: THREE.Euler): void {
    this.group.rotation.copy(rotation);
  }
  
  /**
   * Enable or disable animations
   */
  public setAnimating(animating: boolean): void {
    this.isAnimating = animating;
  }
  
  /**
   * Get bounding box for collision detection
   */
  public getBoundingBox(): THREE.Box3 {
    const box = new THREE.Box3();
    box.setFromObject(this.group);
    return box;
  }
  
  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
    
    // Clear arrays
    this.wheels.length = 0;
    this.windows.length = 0;
    this.smokeParticles.length = 0;
  }
  
  /**
   * Create visual feedback for direction changes
   */
  public showDirectionIndicator(direction: 'left' | 'right' | 'none'): void {
    // Remove existing indicators
    const existingIndicators = this.group.children.filter(child => 
      child.name.includes('DirectionIndicator')
    );
    existingIndicators.forEach(indicator => this.group.remove(indicator));
    
    if (direction === 'none') return;
    
    // Create arrow indicator
    const arrowGeometry = new THREE.ConeGeometry(0.1, 0.3, 8);
    const arrowMaterial = new THREE.MeshLambertMaterial({
      color: direction === 'left' ? 0xFF4444 : 0x44FF44,
      emissive: direction === 'left' ? 0x220000 : 0x002200
    });
    
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    arrow.position.set(
      direction === 'left' ? -0.8 : 0.8,
      this.config.size.height / 2 + 0.2,
      0
    );
    arrow.rotation.z = direction === 'left' ? Math.PI / 2 : -Math.PI / 2;
    arrow.name = `DirectionIndicator${direction}`;
    
    this.group.add(arrow);
    
    // Auto-remove after 2 seconds
    setTimeout(() => {
      this.group.remove(arrow);
      arrow.geometry.dispose();
      (arrow.material as THREE.Material).dispose();
    }, 2000);
  }
}

/**
 * Default trolley configuration
 */
export const DEFAULT_TROLLEY_CONFIG: TrolleyConfig = {
  size: {
    width: 1.4,        // Slightly bigger width
    height: 1.0,       // Slightly bigger height
    length: 2.4        // Slightly bigger length
  },
  colors: {
    body: 0xFF6B35,    // Bright orange
    roof: 0x2E86AB,    // Blue
  wheels: 0x000000,  // Black wheels per requirement
    windows: 0x87CEEB, // Sky blue
    chimney: 0x444444  // Dark gray for chimney
  },
  wheelSize: {
    width: 0.3,        // Blocky wheel width
    height: 0.25,      // Blocky wheel height
    depth: 0.2         // Blocky wheel depth
  },
  wheelCount: 4,       // 4 wheels total
  chimney: {
    width: 0.2,
    height: 0.4,
    depth: 0.2
  }
};

/**
 * Factory function to create a trolley with default configuration
 */
export function createTrolley(config?: Partial<TrolleyConfig>): Trolley {
  const finalConfig = { ...DEFAULT_TROLLEY_CONFIG, ...config };
  return new Trolley(finalConfig);
}
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
  };
  wheelRadius: number;
  wheelCount: number;
}

export class Trolley {
  private group: THREE.Group;
  private body!: THREE.Mesh;
  private roof!: THREE.Mesh;
  private wheels: THREE.Mesh[];
  private windows: THREE.Mesh[];
  private config: TrolleyConfig;
  
  // Animation properties
  private wheelRotation: number = 0;
  private isAnimating: boolean = true;
  
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
    this.createDetails();
    
    // Set up the group for proper positioning
    this.group.name = 'Trolley';
    
    // Position trolley slightly above ground
    this.group.position.y = this.config.wheelRadius;
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
   * Create trolley wheels
   */
  private createWheels(): void {
    const wheelGeometry = new THREE.CylinderGeometry(
      this.config.wheelRadius,
      this.config.wheelRadius,
      0.2,
      16
    );
    
    const wheelMaterial = new THREE.MeshLambertMaterial({
      color: this.config.colors.wheels
    });
    
    // Create wheels based on configuration
    const wheelPositions = this.calculateWheelPositions();
    
    for (let i = 0; i < wheelPositions.length; i++) {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.position.copy(wheelPositions[i]);
      wheel.rotation.z = Math.PI / 2; // Rotate to face forward
      wheel.castShadow = true;
      wheel.name = `TrolleyWheel${i}`;
      
      this.wheels.push(wheel);
      this.group.add(wheel);
    }
  }
  
  /**
   * Calculate wheel positions based on trolley size and wheel count
   */
  private calculateWheelPositions(): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    const wheelY = -this.config.size.height / 2;
    const wheelSpacing = this.config.size.length / (this.config.wheelCount - 1);
    const startZ = -this.config.size.length / 2 + wheelSpacing / 2;
    
    // Left side wheels
    for (let i = 0; i < this.config.wheelCount; i++) {
      positions.push(new THREE.Vector3(
        -this.config.size.width / 2 - 0.1,
        wheelY,
        startZ + i * wheelSpacing
      ));
    }
    
    // Right side wheels
    for (let i = 0; i < this.config.wheelCount; i++) {
      positions.push(new THREE.Vector3(
        this.config.size.width / 2 + 0.1,
        wheelY,
        startZ + i * wheelSpacing
      ));
    }
    
    return positions;
  }
  
  /**
   * Create trolley windows
   */
  private createWindows(): void {
    const windowGeometry = new THREE.PlaneGeometry(0.8, 0.6);
    const windowMaterial = new THREE.MeshLambertMaterial({
      color: this.config.colors.windows,
      transparent: true,
      opacity: 0.7
    });
    
    // Front window
    const frontWindow = new THREE.Mesh(windowGeometry, windowMaterial);
    frontWindow.position.set(0, 0.1, this.config.size.length / 2 + 0.01);
    frontWindow.name = 'FrontWindow';
    this.windows.push(frontWindow);
    this.group.add(frontWindow);
    
    // Back window
    const backWindow = new THREE.Mesh(windowGeometry, windowMaterial);
    backWindow.position.set(0, 0.1, -this.config.size.length / 2 - 0.01);
    backWindow.rotation.y = Math.PI;
    backWindow.name = 'BackWindow';
    this.windows.push(backWindow);
    this.group.add(backWindow);
    
    // Side windows
    const sideWindowGeometry = new THREE.PlaneGeometry(1.2, 0.6);
    
    // Left side window
    const leftWindow = new THREE.Mesh(sideWindowGeometry, windowMaterial);
    leftWindow.position.set(-this.config.size.width / 2 - 0.01, 0.1, 0);
    leftWindow.rotation.y = Math.PI / 2;
    leftWindow.name = 'LeftWindow';
    this.windows.push(leftWindow);
    this.group.add(leftWindow);
    
    // Right side window
    const rightWindow = new THREE.Mesh(sideWindowGeometry, windowMaterial);
    rightWindow.position.set(this.config.size.width / 2 + 0.01, 0.1, 0);
    rightWindow.rotation.y = -Math.PI / 2;
    rightWindow.name = 'RightWindow';
    this.windows.push(rightWindow);
    this.group.add(rightWindow);
  }
  
  /**
   * Create additional trolley details
   */
  private createDetails(): void {
    // Add a simple bell on top
    const bellGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const bellMaterial = new THREE.MeshLambertMaterial({
      color: 0xFFD700 // Gold color
    });
    
    const bell = new THREE.Mesh(bellGeometry, bellMaterial);
    bell.position.set(0, this.config.size.height / 2 + 0.3, this.config.size.length / 4);
    bell.castShadow = true;
    bell.name = 'TrolleyBell';
    
    this.group.add(bell);
    
    // Add front bumper
    const bumperGeometry = new THREE.BoxGeometry(
      this.config.size.width + 0.2,
      0.1,
      0.1
    );
    const bumperMaterial = new THREE.MeshLambertMaterial({
      color: 0x333333 // Dark gray
    });
    
    const bumper = new THREE.Mesh(bumperGeometry, bumperMaterial);
    bumper.position.set(0, -this.config.size.height / 2 + 0.1, this.config.size.length / 2 + 0.1);
    bumper.castShadow = true;
    bumper.name = 'TrolleyBumper';
    
    this.group.add(bumper);
  }
  
  /**
   * Update trolley animations
   */
  public update(deltaTime: number, speed: number): void {
    if (!this.isAnimating) return;
    
    // Animate wheel rotation based on speed
    const rotationSpeed = speed * 0.1; // Adjust rotation speed factor
    this.wheelRotation += rotationSpeed * deltaTime;
    
    // Apply rotation to all wheels
    this.wheels.forEach(wheel => {
      wheel.rotation.x = this.wheelRotation;
    });
    
    // Add subtle bobbing animation
    const bobbingAmplitude = 0.02;
    const bobbingFrequency = 5.0;
    const bobbing = Math.sin(Date.now() * 0.001 * bobbingFrequency) * bobbingAmplitude;
    this.group.position.y = this.config.wheelRadius + bobbing;
  }
  
  /**
   * Get the Three.js group containing the trolley model
   */
  public getGroup(): THREE.Group {
    return this.group;
  }
  
  /**
   * Set trolley position
   */
  public setPosition(position: THREE.Vector3): void {
    this.group.position.copy(position);
    this.group.position.y += this.config.wheelRadius; // Keep above ground
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
      if (child instanceof THREE.Mesh) {
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
    width: 1.2,
    height: 0.8,
    length: 2.0
  },
  colors: {
    body: 0xFF6B35,    // Bright orange
    roof: 0x2E86AB,    // Blue
    wheels: 0x333333,  // Dark gray
    windows: 0x87CEEB  // Sky blue
  },
  wheelRadius: 0.2,
  wheelCount: 3
};

/**
 * Factory function to create a trolley with default configuration
 */
export function createTrolley(config?: Partial<TrolleyConfig>): Trolley {
  const finalConfig = { ...DEFAULT_TROLLEY_CONFIG, ...config };
  return new Trolley(finalConfig);
}
/**
 * Obstacle class - Represents barriers (rocks and trolley barriers) on tracks
 * Implements requirements: 6.1, 6.2
 */

import * as THREE from 'three';

export type ObstacleType = 'rock' | 'trolley';

export interface ObstacleConfig {
  type: ObstacleType;
  size: {
    width: number;
    height: number;
    length: number;
  };
  colors: {
    primary: number;
    secondary?: number;
  };
  position: THREE.Vector3;
}

export class Obstacle {
  public readonly id: number;
  public readonly type: ObstacleType;
  public readonly position: THREE.Vector3;
  public readonly mesh: THREE.Mesh;
  public readonly boundingBox: THREE.Box3;
  
  private config: ObstacleConfig;
  private group: THREE.Group;
  private isDisposed: boolean = false;
  
  private static nextId: number = 0;

  constructor(config: ObstacleConfig) {
    this.id = Obstacle.nextId++;
    this.type = config.type;
    this.position = config.position.clone ? config.position.clone() : config.position; // Handle mocked objects
    this.config = config;
    this.boundingBox = new THREE.Box3();
    
    // Create group to hold all obstacle parts
    this.group = new THREE.Group();
    this.group.position.copy(this.position);
    
    // Create the main mesh based on obstacle type
    this.mesh = this.createObstacleMesh();
    this.group.add(this.mesh);
    
    // Add additional details based on type
    this.addObstacleDetails();
    
    // Calculate bounding box
    this.updateBoundingBox();
    
    // Set user data for identification
    this.group.userData = {
      type: 'obstacle',
      obstacleType: this.type,
      id: this.id
    };
  }

  /**
   * Create the main obstacle mesh based on type
   */
  private createObstacleMesh(): THREE.Mesh {
    let geometry: THREE.BufferGeometry;
    let material: THREE.Material;

    if (this.type === 'rock') {
      geometry = this.createRockGeometry();
      material = this.createRockMaterial();
    } else {
      geometry = this.createTrolleyBarrierGeometry();
      material = this.createTrolleyBarrierMaterial();
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = `Obstacle_${this.type}_${this.id}`;

    return mesh;
  }

  /**
   * Create rock geometry with irregular shape
   */
  private createRockGeometry(): THREE.BufferGeometry {
    // Create a basic sphere and then modify it for irregular rock shape
    const geometry = new THREE.SphereGeometry(
      Math.max(this.config.size.width, this.config.size.height) / 2,
      12,
      8
    );

    // Modify vertices to create irregular rock shape
    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      
      // Add random variation to create irregular shape
      const variation = 0.3;
      vertex.x += (Math.random() - 0.5) * variation;
      vertex.y += (Math.random() - 0.5) * variation;
      vertex.z += (Math.random() - 0.5) * variation;
      
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    geometry.computeVertexNormals();
    return geometry;
  }

  /**
   * Create rock material with stone-like appearance
   */
  private createRockMaterial(): THREE.Material {
    return new THREE.MeshLambertMaterial({
      color: this.config.colors.primary,
      flatShading: true, // For angular, cartoonish look
    });
  }

  /**
   * Create trolley barrier geometry
   */
  private createTrolleyBarrierGeometry(): THREE.BufferGeometry {
    return new THREE.BoxGeometry(
      this.config.size.width,
      this.config.size.height,
      this.config.size.length
    );
  }

  /**
   * Create trolley barrier material
   */
  private createTrolleyBarrierMaterial(): THREE.Material {
    return new THREE.MeshLambertMaterial({
      color: this.config.colors.primary,
    });
  }

  /**
   * Add additional details based on obstacle type
   */
  private addObstacleDetails(): void {
    if (this.type === 'trolley') {
      this.addTrolleyBarrierDetails();
    } else {
      this.addRockDetails();
    }
  }

  /**
   * Add details to trolley barrier (wheels, windows, etc.)
   * Enhanced version for barrier trolleys - no smoke, no flickering lights, great windows
   */
  private addTrolleyBarrierDetails(): void {
    // Add wheels to the trolley barrier
    const wheelGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 8);
    const wheelMaterial = new THREE.MeshLambertMaterial({
      color: 0x333333 // Dark gray
    });

    // Front wheels
    const frontLeftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    frontLeftWheel.position.set(-this.config.size.width / 2 - 0.1, -this.config.size.height / 2, this.config.size.length / 3);
    frontLeftWheel.rotation.z = Math.PI / 2;
    this.group.add(frontLeftWheel);

    const frontRightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    frontRightWheel.position.set(this.config.size.width / 2 + 0.1, -this.config.size.height / 2, this.config.size.length / 3);
    frontRightWheel.rotation.z = Math.PI / 2;
    this.group.add(frontRightWheel);

    // Back wheels
    const backLeftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    backLeftWheel.position.set(-this.config.size.width / 2 - 0.1, -this.config.size.height / 2, -this.config.size.length / 3);
    backLeftWheel.rotation.z = Math.PI / 2;
    this.group.add(backLeftWheel);

    const backRightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    backRightWheel.position.set(this.config.size.width / 2 + 0.1, -this.config.size.height / 2, -this.config.size.length / 3);
    backRightWheel.rotation.z = Math.PI / 2;
    this.group.add(backRightWheel);

    // Add great windows (clear, non-flickering)
    this.addTrolleyWindows();

    // Add chimney (no smoke for barrier trolleys)
    this.addTrolleyChimney();

    // Add steady headlight (no flickering for barrier trolleys)
    this.addTrolleyHeadlight();

    // Add warning stripes if secondary color is provided
    if (this.config.colors.secondary) {
      const stripeGeometry = new THREE.BoxGeometry(
        this.config.size.width + 0.02,
        0.05,
        this.config.size.length + 0.02
      );
      const stripeMaterial = new THREE.MeshLambertMaterial({
        color: this.config.colors.secondary
      });

      const stripe1 = new THREE.Mesh(stripeGeometry, stripeMaterial);
      stripe1.position.y = this.config.size.height / 4;
      this.group.add(stripe1);

      const stripe2 = new THREE.Mesh(stripeGeometry, stripeMaterial);
      stripe2.position.y = -this.config.size.height / 4;
      this.group.add(stripe2);
    }
  }

  /**
   * Add clear, great-looking windows to trolley barrier
   */
  private addTrolleyWindows(): void {
    const windowGeometry = new THREE.BoxGeometry(
      this.config.size.width * 0.8,
      this.config.size.height * 0.4,
      0.02
    );
    
    const windowMaterial = new THREE.MeshLambertMaterial({
      color: 0x87CEEB, // Sky blue - clear windows
      transparent: true,
      opacity: 0.8
    });

    // Front window
    const frontWindow = new THREE.Mesh(windowGeometry, windowMaterial);
    frontWindow.position.set(0, this.config.size.height * 0.1, this.config.size.length / 2 + 0.01);
    this.group.add(frontWindow);

    // Back window
    const backWindow = new THREE.Mesh(windowGeometry, windowMaterial);
    backWindow.position.set(0, this.config.size.height * 0.1, -this.config.size.length / 2 - 0.01);
    this.group.add(backWindow);

    // Side windows
    const sideWindowGeometry = new THREE.BoxGeometry(
      0.02,
      this.config.size.height * 0.3,
      this.config.size.length * 0.6
    );

    const leftWindow = new THREE.Mesh(sideWindowGeometry, windowMaterial);
    leftWindow.position.set(-this.config.size.width / 2 - 0.01, this.config.size.height * 0.1, 0);
    this.group.add(leftWindow);

    const rightWindow = new THREE.Mesh(sideWindowGeometry, windowMaterial);
    rightWindow.position.set(this.config.size.width / 2 + 0.01, this.config.size.height * 0.1, 0);
    this.group.add(rightWindow);
  }

  /**
   * Add chimney to trolley barrier (no smoke)
   */
  private addTrolleyChimney(): void {
    const chimneyGeometry = new THREE.CylinderGeometry(0.08, 0.1, 0.3, 8);
    const chimneyMaterial = new THREE.MeshLambertMaterial({
      color: 0x333333 // Dark gray
    });

    const chimney = new THREE.Mesh(chimneyGeometry, chimneyMaterial);
    chimney.position.set(0, this.config.size.height / 2 + 0.15, this.config.size.length * 0.2);
    this.group.add(chimney);
  }

  /**
   * Add steady headlight to trolley barrier (no flickering)
   */
  private addTrolleyHeadlight(): void {
    const lightGeometry = new THREE.SphereGeometry(0.06, 8, 6);
    const lightMaterial = new THREE.MeshLambertMaterial({
      color: 0xFFFFAA, // Steady warm white light
      emissive: 0x444422 // Slight glow
    });

    const headlight = new THREE.Mesh(lightGeometry, lightMaterial);
    headlight.position.set(0, this.config.size.height * 0.1, this.config.size.length / 2 + 0.05);
    this.group.add(headlight);
  }

  /**
   * Add details to rock (small debris, texture variation)
   */
  private addRockDetails(): void {
    // Add small debris around the rock
    const debrisCount = Math.floor(Math.random() * 3) + 2; // 2-4 debris pieces
    
    for (let i = 0; i < debrisCount; i++) {
      const debrisSize = Math.random() * 0.1 + 0.05; // 0.05 to 0.15
      const debrisGeometry = new THREE.SphereGeometry(debrisSize, 6, 4);
      const debrisMaterial = new THREE.MeshLambertMaterial({
        color: this.config.colors.primary,
        flatShading: true
      });

      const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);
      
      // Position debris randomly around the main rock
      const angle = (i / debrisCount) * Math.PI * 2;
      const distance = this.config.size.width / 2 + Math.random() * 0.3;
      debris.position.set(
        Math.cos(angle) * distance,
        -this.config.size.height / 2,
        Math.sin(angle) * distance
      );
      
      this.group.add(debris);
    }
  }

  /**
   * Update bounding box for collision detection
   */
  private updateBoundingBox(): void {
    this.boundingBox.setFromObject(this.group);
  }

  /**
   * Check collision with another object's bounding box
   */
  public checkCollision(otherBoundingBox: THREE.Box3): boolean {
    return this.boundingBox.intersectsBox(otherBoundingBox);
  }

  /**
   * Check collision with a point
   */
  public checkPointCollision(point: THREE.Vector3, tolerance: number = 0.1): boolean {
    const expandedBox = this.boundingBox.clone();
    expandedBox.expandByScalar(tolerance);
    return expandedBox.containsPoint(point);
  }

  /**
   * Get the Three.js group containing the obstacle
   */
  public getGroup(): THREE.Group {
    return this.group;
  }

  /**
   * Get obstacle center position
   */
  public getCenter(): THREE.Vector3 {
    return this.position.clone();
  }

  /**
   * Get obstacle size
   */
  public getSize(): { width: number; height: number; length: number } {
    return { ...this.config.size };
  }

  /**
   * Update obstacle position
   */
  public setPosition(newPosition: THREE.Vector3): void {
    this.position.copy(newPosition);
    this.group.position.copy(this.position);
    this.updateBoundingBox();
  }

  /**
   * Set obstacle visibility
   */
  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  /**
   * Clone this obstacle at a new position
   */
  public clone(newPosition: THREE.Vector3): Obstacle {
    const newConfig = {
      ...this.config,
      position: newPosition
    };
    return new Obstacle(newConfig);
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    if (this.isDisposed) return;

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

    // Remove from parent if it has one
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }

    this.isDisposed = true;
  }

  /**
   * Check if obstacle is disposed
   */
  public isObstacleDisposed(): boolean {
    return this.isDisposed;
  }
}

/**
 * Default obstacle configurations
 */
export const DEFAULT_OBSTACLE_CONFIGS = {
  rock: {
    size: {
      width: 1.0,
      height: 0.8,
      length: 1.0
    },
    colors: {
      primary: 0x8B7355 // Brown/tan rock color
    }
  },
  trolley: {
    size: {
      width: 1.2,
      height: 0.6,
      length: 1.8
    },
    colors: {
      primary: 0xFF4444, // Bright red for danger
      secondary: 0xFFFF00 // Yellow warning stripes
    }
  }
} as const;

/**
 * Factory function to create obstacles with random type selection
 * Requirement 6.2: Random obstacle type selection
 */
export function createRandomObstacle(position: THREE.Vector3): Obstacle {
  const obstacleTypes: ObstacleType[] = ['rock', 'trolley'];
  const randomType = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
  
  return createObstacle(randomType, position);
}

/**
 * Factory function to create specific obstacle type
 */
export function createObstacle(type: ObstacleType, position: THREE.Vector3, customConfig?: Partial<ObstacleConfig>): Obstacle {
  const baseConfig = DEFAULT_OBSTACLE_CONFIGS[type];
  
  const config: ObstacleConfig = {
    type,
    position: position.clone ? position.clone() : position, // Handle mocked objects
    size: { ...baseConfig.size },
    colors: { ...baseConfig.colors }
  };
  
  // Apply custom config if provided, but don't override position
  if (customConfig) {
    if (customConfig.size) {
      config.size = { ...config.size, ...customConfig.size };
    }
    if (customConfig.colors) {
      config.colors = { ...config.colors, ...customConfig.colors };
    }
  }
  
  return new Obstacle(config);
}
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
    
    // For trolley obstacles, calculate proper Y position like the player trolley
    if (this.type === 'trolley') {
      const adjustedPosition = this.calculateTrolleyPosition(this.position);
      this.group.position.copy(adjustedPosition);
    } else {
      this.group.position.copy(this.position);
    }

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
   * Calculate proper position for trolley obstacles to match player trolley positioning
   */
  private calculateTrolleyPosition(basePosition: THREE.Vector3): THREE.Vector3 {
    // Railway track constants (should match Trolley.ts and RailwayTrack.ts)
    const RAIL_TOP_HEIGHT = 0.25; // tieHeight (0.15) + railHeight/2 (0.1)
    const RAIL_HALF_HEIGHT = 0.1; // Half of rail height
    const HOVER_OFFSET = 0.05; // Same as player trolley
    
    // Trolley dimensions (from DEFAULT_OBSTACLE_CONFIGS.trolley)
    const bodyHalf = this.config.size.height / 2;
    const wheelHeight = 0.25; // Same as player trolley wheel height
    
    // Calculate Y position like player trolley
    const railsTop = RAIL_TOP_HEIGHT + RAIL_HALF_HEIGHT;
    const calculatedY = railsTop + HOVER_OFFSET + bodyHalf + wheelHeight;
    
    return new THREE.Vector3(basePosition.x, calculatedY, basePosition.z);
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
   * Create rock geometry with boulder-like irregular shape
   */
  private createRockGeometry(): THREE.BufferGeometry {
    // Create a more prominent, boulder-like base shape
    const baseRadius = Math.max(this.config.size.width, this.config.size.height) / 1.5; // Increased from 1.8
    const geometry = new THREE.SphereGeometry(baseRadius, 20, 16); // More segments for better shape

    // Modify vertices to create more dramatic boulder-like irregularities
    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);

      // Create more dramatic variations for boulder appearance
      const variation = 0.6; // Increased variation for more irregular shape
      const randomFactor = Math.random();

      // Add some vertices that stick out more (like boulder protrusions)
      if (randomFactor > 0.6) {
        vertex.multiplyScalar(1.3 + Math.random() * 0.4);
      }

      // Add general irregularity with more variation
      vertex.x += (Math.random() - 0.5) * variation;
      vertex.y += Math.abs((Math.random() - 0.5) * variation * 0.6); // Keep rocks taller, not shorter
      vertex.z += (Math.random() - 0.5) * variation;

      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    geometry.computeVertexNormals();
    return geometry;
  }

  /**
   * Create rock material with boulder-like stone appearance
   */
  private createRockMaterial(): THREE.Material {
    return new THREE.MeshLambertMaterial({
      color: this.config.colors.primary,
      flatShading: true, // For angular, boulder-like look
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
   * Add details to trolley barrier - matches current trolley model but without smoke/flickering
   * Uses blocky wheels like the main trolley, grey windows, no smoke, random light state
   */
  private addTrolleyBarrierDetails(): void {
    // Add blocky wheels matching the main trolley design
    const wheelGeometry = new THREE.BoxGeometry(0.3, 0.25, 0.2); // Same as main trolley
    const wheelMaterial = new THREE.MeshLambertMaterial({
      color: 0x000000 // Black wheels like main trolley
    });

  // Calculate wheel positions - place wheels fully under the body like player trolley
  const wheelY = -this.config.size.height / 2 - 0.25 / 2; // body bottom minus half wheel height
  const wheelOffsetZ = this.config.size.length * 0.35;
  const halfWidth = this.config.size.width / 2 - 0.3 / 2 + 0.001; // align wheels flush with body sides

    // Create 4 wheels positioned like main trolley
    const wheelPositions = [
      new THREE.Vector3(-halfWidth, wheelY, wheelOffsetZ),   // front left
      new THREE.Vector3(-halfWidth, wheelY, -wheelOffsetZ),  // back left
      new THREE.Vector3(halfWidth, wheelY, wheelOffsetZ),    // front right
      new THREE.Vector3(halfWidth, wheelY, -wheelOffsetZ)    // back right
    ];

    wheelPositions.forEach((pos, i) => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.position.copy(pos);
      wheel.castShadow = true;
      wheel.name = `BarrierWheel${i}`;
      this.group.add(wheel);
    });

    // Add roof like main trolley
    this.addTrolleyRoof();

    // Add grey windows (no reflections for barriers)
    this.addTrolleyWindows();

    // Add chimney (no smoke for barrier trolleys)
    this.addTrolleyChimney();

    // Add random light state (on or off, no flickering)
    this.addTrolleyLight();
  }

  /**
   * Add roof to trolley barrier (matches main trolley)
   */
  private addTrolleyRoof(): void {
    const roofGeometry = new THREE.BoxGeometry(
      this.config.size.width + 0.1,
      0.2,
      this.config.size.length + 0.1
    );

    const roofMaterial = new THREE.MeshLambertMaterial({
      color: 0x2E86AB // Blue roof like main trolley
    });

    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = this.config.size.height / 2 + 0.1;
    roof.castShadow = true;
    roof.name = 'BarrierRoof';

    this.group.add(roof);
  }

  /**
   * Add grey windows to trolley barrier (matches main trolley style but grey)
   */
  private addTrolleyWindows(): void {
    // Grey windows for barrier trolleys
    const windowMaterial = new THREE.MeshLambertMaterial({
      color: 0x808080, // Grey windows
      transparent: true,
      opacity: 0.7
    });

    // Front windshield
    const frontWindowGeometry = new THREE.PlaneGeometry(0.9, 0.7);
    const frontWindow = new THREE.Mesh(frontWindowGeometry, windowMaterial);
    frontWindow.position.set(0, 0.15, this.config.size.length / 2 + 0.01);
    frontWindow.name = 'BarrierFrontWindow';
    this.group.add(frontWindow);

    // Back window
    const backWindow = new THREE.Mesh(frontWindowGeometry, windowMaterial);
    backWindow.position.set(0, 0.15, -this.config.size.length / 2 - 0.01);
    backWindow.rotation.y = Math.PI;
    backWindow.name = 'BarrierBackWindow';
    this.group.add(backWindow);

    // Side windows (multiple smaller windows for more detail)
    const sideWindowGeometry = new THREE.PlaneGeometry(0.6, 0.5);

    // Left side windows
    const leftWindow1 = new THREE.Mesh(sideWindowGeometry, windowMaterial);
    leftWindow1.position.set(-this.config.size.width / 2 - 0.01, 0.15, 0.4);
    leftWindow1.rotation.y = Math.PI / 2;
    leftWindow1.name = 'BarrierLeftWindow1';
    this.group.add(leftWindow1);

    const leftWindow2 = new THREE.Mesh(sideWindowGeometry, windowMaterial);
    leftWindow2.position.set(-this.config.size.width / 2 - 0.01, 0.15, -0.4);
    leftWindow2.rotation.y = Math.PI / 2;
    leftWindow2.name = 'BarrierLeftWindow2';
    this.group.add(leftWindow2);

    // Right side windows
    const rightWindow1 = new THREE.Mesh(sideWindowGeometry, windowMaterial);
    rightWindow1.position.set(this.config.size.width / 2 + 0.01, 0.15, 0.4);
    rightWindow1.rotation.y = -Math.PI / 2;
    rightWindow1.name = 'BarrierRightWindow1';
    this.group.add(rightWindow1);

    const rightWindow2 = new THREE.Mesh(sideWindowGeometry, windowMaterial);
    rightWindow2.position.set(this.config.size.width / 2 + 0.01, 0.15, -0.4);
    rightWindow2.rotation.y = -Math.PI / 2;
    rightWindow2.name = 'BarrierRightWindow2';
    this.group.add(rightWindow2);
  }

  /**
   * Add chimney to trolley barrier (blocky design, no smoke)
   */
  private addTrolleyChimney(): void {
    const chimneyGeometry = new THREE.BoxGeometry(0.2, 0.4, 0.2); // Blocky like main trolley
    const chimneyMaterial = new THREE.MeshLambertMaterial({
      color: 0x444444 // Dark gray like main trolley
    });

    const chimney = new THREE.Mesh(chimneyGeometry, chimneyMaterial);
    chimney.position.set(
      0,
      this.config.size.height / 2 + 0.2 + 0.1, // height/2 + chimney height/2 + roof offset
      this.config.size.length / 3
    );
    chimney.castShadow = true;
    chimney.name = 'BarrierChimney';
    this.group.add(chimney);
  }

  /**
   * Add decorative headlight to trolley barrier (no real light)
   *
   * Note: We intentionally do NOT add a real PointLight here to avoid
   * circular lighting artifacts on the ground under/around the trolley.
   */
  private addTrolleyLight(): void {
    const lightGeometry = new THREE.SphereGeometry(0.06, 12, 12);

    // Randomly decide if decorative headlight should appear "on"
    const isLightOn = Math.random() > 0.5;
    const lightMaterial = new THREE.MeshStandardMaterial({
      color: isLightOn ? 0xFFD966 : 0x333333,
      emissive: isLightOn ? 0xFFD966 : 0x000000,
      emissiveIntensity: isLightOn ? 0.7 : 0.0,
      metalness: 0.2,
      roughness: 0.3
    });

    const light = new THREE.Mesh(lightGeometry, lightMaterial);
    light.position.set(
      0,
      this.config.size.height / 2 + 0.24,
      -this.config.size.length / 4
    );
    light.name = 'BarrierLight';
    this.group.add(light);
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
    
    // For trolley obstacles, calculate proper Y position like the player trolley
    if (this.type === 'trolley') {
      const adjustedPosition = this.calculateTrolleyPosition(newPosition);
      this.group.position.copy(adjustedPosition);
    } else {
      this.group.position.copy(newPosition);
    }
    
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
      width: 1.8,  // Increased from 1.2 for better visibility
      height: 1.5, // Increased from 1.0 for better visibility
      length: 1.8  // Increased from 1.2 for better visibility
    },
    colors: {
      primary: 0x654321 // Changed to a more distinctive brown color
    }
  },
  trolley: {
    size: {
      width: 1.4,  // Match main trolley size
      height: 1.0, // Match main trolley size
      length: 2.4  // Match main trolley size
    },
    colors: {
      primary: 0xFF6B35 // Default orange, will be overridden by random colors
    }
  }
} as const;

/**
 * Trolley barrier color options (blue, green, yellow, orange)
 */
export const TROLLEY_BARRIER_COLORS = [
  0x2E86AB, // Blue
  0x32CD32, // Green  
  0xFFD700, // Yellow
  0xFF6B35  // Orange
] as const;

/**
 * Factory function to create obstacles with random type selection
 * Only creates rocks and trolley barriers (no buffers)
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

  // For trolley barriers, randomly select from available colors
  if (type === 'trolley') {
    const randomColor = TROLLEY_BARRIER_COLORS[Math.floor(Math.random() * TROLLEY_BARRIER_COLORS.length)];
    config.colors.primary = randomColor;
  }

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
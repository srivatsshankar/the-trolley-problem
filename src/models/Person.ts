/**
 * Person class - Represents people on tracks with blocky, cartoonish 3D character models
 * Implements requirements: 6.3, 6.4
 */

import * as THREE from 'three';

export interface PersonConfig {
  size: {
    width: number;
    height: number;
    depth: number;
  };
  colors: {
    skin: number;
    body: number;
  };
  position: THREE.Vector3;
  animationSpeed: number;
  hasHat: boolean;
  hatColor?: number;
}

export class Person {
  public readonly id: number;
  public readonly position: THREE.Vector3;
  public readonly boundingBox: THREE.Box3;
  public isHit: boolean = false;
  
  private config: PersonConfig;
  private group: THREE.Group;
  private body!: THREE.Mesh; // Initialized in createPersonModel
  private head!: THREE.Mesh; // Initialized in createPersonModel
  private hat?: THREE.Mesh; // Optional hat
  private isDisposed: boolean = false;
  
  // Animation properties
  private animationTime: number = 0;
  private isAnimating: boolean = true;
  private baseY: number;
  private bounceOffset: number = 0;
  
  // Spinning animation when hit
  private isSpinning: boolean = false;
  private spinVelocity: THREE.Vector3 = new THREE.Vector3();
  private spinAngularVelocity: THREE.Vector3 = new THREE.Vector3();
  
  private static nextId: number = 0;

  constructor(config: PersonConfig) {
    this.id = Person.nextId++;
    this.position = config.position.clone();
    this.config = config;
    this.boundingBox = new THREE.Box3();
    this.baseY = this.position.y;
    
    // Create group to hold all person parts
    this.group = new THREE.Group();
    this.group.position.copy(this.position);
    
    // Create the person model
    this.createPersonModel();
    
    // Calculate bounding box
    this.updateBoundingBox();
    
    // Set user data for identification
    this.group.userData = {
      type: 'person',
      id: this.id,
      isHit: false
    };
    
    // Add random animation offset for variety
    this.animationTime = Math.random() * Math.PI * 2;
  }

  /**
   * Create the complete 3D person model - blocky and cartoonish
   */
  private createPersonModel(): void {
    this.createBody();
    this.createHead();
    if (this.config.hasHat) {
      this.createHat();
    }
  }

  /**
   * Create the person's body as a single cube with random color
   */
  private createBody(): void {
    const bodyGeometry = new THREE.BoxGeometry(
      this.config.size.width,
      this.config.size.height * 0.6, // Body is 60% of total height
      this.config.size.depth
    );
    
    const bodyMaterial = new THREE.MeshLambertMaterial({
      color: this.config.colors.body
    });
    
    this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.body.position.y = this.config.size.height * 0.1; // Slightly above center
    this.body.castShadow = true;
    this.body.receiveShadow = true;
    this.body.name = `PersonBody_${this.id}`;
    
    this.group.add(this.body);
  }

  /**
   * Create the person's head as a cube with skin color
   */
  private createHead(): void {
    const headSize = this.config.size.width * 0.8;
    const headGeometry = new THREE.BoxGeometry(headSize, headSize, headSize);
    
    const headMaterial = new THREE.MeshLambertMaterial({
      color: this.config.colors.skin
    });
    
    this.head = new THREE.Mesh(headGeometry, headMaterial);
    this.head.position.y = this.config.size.height * 0.4 + headSize * 0.5;
    this.head.castShadow = true;
    this.head.name = `PersonHead_${this.id}`;
    
    this.group.add(this.head);
  }

  /**
   * Create a hat or cap for the person
   */
  private createHat(): void {
    if (!this.config.hasHat || !this.config.hatColor) return;
    
    const headSize = this.config.size.width * 0.8;
    const hatGeometry = new THREE.BoxGeometry(
      headSize * 1.1, 
      headSize * 0.3, 
      headSize * 1.1
    );
    
    const hatMaterial = new THREE.MeshLambertMaterial({
      color: this.config.hatColor
    });
    
    this.hat = new THREE.Mesh(hatGeometry, hatMaterial);
    this.hat.position.y = this.config.size.height * 0.4 + headSize * 0.8;
    this.hat.castShadow = true;
    this.hat.name = `PersonHat_${this.id}`;
    
    this.group.add(this.hat);
  }



  /**
   * Update person animations - bouncing up and down, spinning when hit
   */
  public update(deltaTime: number): void {
    this.animationTime += deltaTime * this.config.animationSpeed;
    
    if (this.isSpinning) {
      // Spinning animation when hit - person flies off screen
      this.group.position.add(this.spinVelocity.clone().multiplyScalar(deltaTime));
      this.group.rotation.x += this.spinAngularVelocity.x * deltaTime;
      this.group.rotation.y += this.spinAngularVelocity.y * deltaTime;
      this.group.rotation.z += this.spinAngularVelocity.z * deltaTime;
      
      // Apply gravity to velocity
      this.spinVelocity.y -= 9.8 * deltaTime;
      
      return;
    }
    
    if (!this.isAnimating || this.isHit) return;
    
    // Bouncing up and down animation
    const bounceAmplitude = 0.15;
    const bounceFrequency = 3.0;
    this.bounceOffset = Math.sin(this.animationTime * bounceFrequency) * bounceAmplitude;
    this.group.position.y = this.baseY + Math.abs(this.bounceOffset);
    
    // Slight rotation while bouncing for more character
    const rotationAmplitude = 0.1;
    const rotationFrequency = 2.5;
    const rotation = Math.sin(this.animationTime * rotationFrequency) * rotationAmplitude;
    this.group.rotation.z = rotation;
  }

  /**
   * Mark person as hit by trolley - start spinning off screen
   */
  public markAsHit(): void {
    if (this.isHit) return;
    
    this.isHit = true;
    this.isAnimating = false;
    this.isSpinning = true;
    
    // Update user data
    this.group.userData.isHit = true;
    
    // Set random spin velocity to fly off screen
    const direction = Math.random() > 0.5 ? 1 : -1; // Left or right
    this.spinVelocity.set(
      direction * (5 + Math.random() * 5), // Horizontal velocity (5-10 units/sec)
      3 + Math.random() * 3, // Upward velocity (3-6 units/sec)
      (Math.random() - 0.5) * 2 // Small forward/backward velocity
    );
    
    // Set random angular velocity for spinning
    this.spinAngularVelocity.set(
      (Math.random() - 0.5) * 10, // Random X rotation
      (Math.random() - 0.5) * 10, // Random Y rotation
      (Math.random() - 0.5) * 10  // Random Z rotation
    );
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
   * Get the Three.js group containing the person
   */
  public getGroup(): THREE.Group {
    return this.group;
  }

  /**
   * Get person center position
   */
  public getCenter(): THREE.Vector3 {
    return this.position.clone();
  }

  /**
   * Get person size
   */
  public getSize(): { width: number; height: number; depth: number } {
    return { ...this.config.size };
  }

  /**
   * Update person position
   */
  public setPosition(newPosition: THREE.Vector3): void {
    this.position.copy(newPosition);
    this.group.position.copy(this.position);
    this.baseY = this.position.y;
    this.updateBoundingBox();
  }

  /**
   * Set person visibility
   */
  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  /**
   * Check if person is visible
   */
  public isVisible(): boolean {
    return this.group.visible;
  }

  /**
   * Enable or disable animations
   */
  public setAnimating(animating: boolean): void {
    this.isAnimating = animating && !this.isHit;
  }

  /**
   * Clone this person at a new position with different appearance
   */
  public clone(newPosition: THREE.Vector3, appearanceVariation?: Partial<PersonConfig['colors']>): Person {
    const newConfig = {
      ...this.config,
      position: newPosition,
      colors: {
        ...this.config.colors,
        ...appearanceVariation
      }
    };
    return new Person(newConfig);
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
   * Check if person is disposed
   */
  public isPersonDisposed(): boolean {
    return this.isDisposed;
  }
}

/**
 * Default person configuration
 */
export const DEFAULT_PERSON_CONFIG: Omit<PersonConfig, 'position'> = {
  size: {
    width: 0.4,
    height: 1.6,
    depth: 0.3
  },
  colors: {
    skin: 0xFFDBB3,    // Light skin tone
    body: 0x4169E1     // Royal blue body
  },
  animationSpeed: 1.0,
  hasHat: false
};

/**
 * Color variations for visual variety
 */
export const PERSON_COLOR_VARIATIONS = {
  body: [
    0x4169E1, // Royal blue
    0xFF6347, // Tomato red
    0x32CD32, // Lime green
    0xFF69B4, // Hot pink
    0xFFD700, // Gold
    0x9370DB, // Medium purple
    0x20B2AA, // Light sea green
    0xFF4500, // Orange red
    0x8B4513, // Saddle brown
    0x00CED1, // Dark turquoise
    0xFF1493, // Deep pink
    0x7FFF00  // Chartreuse
  ],
  skin: [
    0xFFDBB3, // Light
    0xF4C2A1, // Medium light
    0xD2B48C, // Tan
    0xDEB887, // Burlywood
    0xCD853F, // Peru
    0xA0522D  // Sienna
  ],
  hat: [
    0xFF0000, // Red
    0x0000FF, // Blue
    0x00FF00, // Green
    0xFFFF00, // Yellow
    0xFF00FF, // Magenta
    0x00FFFF, // Cyan
    0x800080, // Purple
    0xFFA500, // Orange
    0x000000, // Black
    0x808080  // Gray
  ]
} as const;

/**
 * Factory function to create person with random appearance variation
 * Requirement 6.3: Add visual variety - blocky, cartoonish people with random colors and hats
 */
export function createPersonWithVariation(position: THREE.Vector3): Person {
  const bodyColors = PERSON_COLOR_VARIATIONS.body;
  const skinColors = PERSON_COLOR_VARIATIONS.skin;
  const hatColors = PERSON_COLOR_VARIATIONS.hat;
  
  // 30% chance of having a hat
  const hasHat = Math.random() < 0.3;
  
  const config: PersonConfig = {
    ...DEFAULT_PERSON_CONFIG,
    position,
    colors: {
      skin: skinColors[Math.floor(Math.random() * skinColors.length)],
      body: bodyColors[Math.floor(Math.random() * bodyColors.length)]
    },
    animationSpeed: 0.8 + Math.random() * 0.4, // Vary animation speed slightly
    hasHat,
    hatColor: hasHat ? hatColors[Math.floor(Math.random() * hatColors.length)] : undefined
  };
  
  return new Person(config);
}

/**
 * Factory function to create person with specific configuration
 */
export function createPerson(position: THREE.Vector3, customConfig?: Partial<PersonConfig>): Person {
  const config: PersonConfig = {
    ...DEFAULT_PERSON_CONFIG,
    position,
    ...customConfig
  };
  
  return new Person(config);
}
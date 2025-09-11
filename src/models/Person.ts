/**
 * Person class - Represents people on tracks with 3D character models
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
    clothing: number;
    hair: number;
    shoes: number;
  };
  position: THREE.Vector3;
  animationSpeed: number;
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
  private arms: THREE.Mesh[];
  private legs: THREE.Mesh[];
  private isDisposed: boolean = false;
  
  // Animation properties
  private animationTime: number = 0;
  private isAnimating: boolean = true;
  private baseY: number;
  
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
    
    // Initialize arrays
    this.arms = [];
    this.legs = [];
    
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
   * Create the complete 3D person model
   */
  private createPersonModel(): void {
    this.createBody();
    this.createHead();
    this.createArms();
    this.createLegs();
    this.addPersonDetails();
  }

  /**
   * Create the person's body (torso)
   */
  private createBody(): void {
    const bodyGeometry = new THREE.BoxGeometry(
      this.config.size.width,
      this.config.size.height * 0.6, // Body is 60% of total height
      this.config.size.depth
    );
    
    const bodyMaterial = new THREE.MeshLambertMaterial({
      color: this.config.colors.clothing
    });
    
    this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.body.position.y = this.config.size.height * 0.1; // Slightly above center
    this.body.castShadow = true;
    this.body.receiveShadow = true;
    this.body.name = `PersonBody_${this.id}`;
    
    this.group.add(this.body);
  }

  /**
   * Create the person's head
   */
  private createHead(): void {
    const headRadius = this.config.size.width * 0.4;
    const headGeometry = new THREE.SphereGeometry(headRadius, 12, 8);
    
    const headMaterial = new THREE.MeshLambertMaterial({
      color: this.config.colors.skin
    });
    
    this.head = new THREE.Mesh(headGeometry, headMaterial);
    this.head.position.y = this.config.size.height * 0.4 + headRadius;
    this.head.castShadow = true;
    this.head.name = `PersonHead_${this.id}`;
    
    this.group.add(this.head);
    
    // Add hair
    this.addHair(headRadius);
    
    // Add simple face features
    this.addFaceFeatures(headRadius);
  }

  /**
   * Add hair to the head
   */
  private addHair(headRadius: number): void {
    const hairGeometry = new THREE.SphereGeometry(headRadius * 1.1, 12, 6);
    const hairMaterial = new THREE.MeshLambertMaterial({
      color: this.config.colors.hair
    });
    
    const hair = new THREE.Mesh(hairGeometry, hairMaterial);
    hair.position.copy(this.head.position);
    hair.position.y += headRadius * 0.2;
    hair.scale.y = 0.6; // Flatten the hair
    hair.name = `PersonHair_${this.id}`;
    
    this.group.add(hair);
  }

  /**
   * Add simple face features (eyes, nose)
   */
  private addFaceFeatures(headRadius: number): void {
    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.03, 6, 4);
    const eyeMaterial = new THREE.MeshLambertMaterial({
      color: 0x000000 // Black eyes
    });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.copy(this.head.position);
    leftEye.position.x -= headRadius * 0.3;
    leftEye.position.y += headRadius * 0.2;
    leftEye.position.z += headRadius * 0.8;
    this.group.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.copy(this.head.position);
    rightEye.position.x += headRadius * 0.3;
    rightEye.position.y += headRadius * 0.2;
    rightEye.position.z += headRadius * 0.8;
    this.group.add(rightEye);
    
    // Nose
    const noseGeometry = new THREE.SphereGeometry(0.02, 6, 4);
    const noseMaterial = new THREE.MeshLambertMaterial({
      color: this.config.colors.skin
    });
    
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    nose.position.copy(this.head.position);
    nose.position.z += headRadius * 0.9;
    this.group.add(nose);
  }

  /**
   * Create the person's arms
   */
  private createArms(): void {
    const armGeometry = new THREE.CylinderGeometry(
      this.config.size.width * 0.08, // radius
      this.config.size.width * 0.08,
      this.config.size.height * 0.4, // length
      8
    );
    
    const armMaterial = new THREE.MeshLambertMaterial({
      color: this.config.colors.skin
    });
    
    // Left arm
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(
      -this.config.size.width * 0.6,
      this.config.size.height * 0.1,
      0
    );
    leftArm.castShadow = true;
    leftArm.name = `PersonLeftArm_${this.id}`;
    this.arms.push(leftArm);
    this.group.add(leftArm);
    
    // Right arm
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(
      this.config.size.width * 0.6,
      this.config.size.height * 0.1,
      0
    );
    rightArm.castShadow = true;
    rightArm.name = `PersonRightArm_${this.id}`;
    this.arms.push(rightArm);
    this.group.add(rightArm);
  }

  /**
   * Create the person's legs
   */
  private createLegs(): void {
    const legGeometry = new THREE.CylinderGeometry(
      this.config.size.width * 0.1, // radius
      this.config.size.width * 0.1,
      this.config.size.height * 0.4, // length
      8
    );
    
    const legMaterial = new THREE.MeshLambertMaterial({
      color: this.config.colors.clothing
    });
    
    // Left leg
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(
      -this.config.size.width * 0.2,
      -this.config.size.height * 0.2,
      0
    );
    leftLeg.castShadow = true;
    leftLeg.name = `PersonLeftLeg_${this.id}`;
    this.legs.push(leftLeg);
    this.group.add(leftLeg);
    
    // Right leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(
      this.config.size.width * 0.2,
      -this.config.size.height * 0.2,
      0
    );
    rightLeg.castShadow = true;
    rightLeg.name = `PersonRightLeg_${this.id}`;
    this.legs.push(rightLeg);
    this.group.add(rightLeg);
    
    // Add shoes
    this.addShoes();
  }

  /**
   * Add shoes to the legs
   */
  private addShoes(): void {
    const shoeGeometry = new THREE.BoxGeometry(
      this.config.size.width * 0.15,
      this.config.size.height * 0.05,
      this.config.size.depth * 0.8
    );
    
    const shoeMaterial = new THREE.MeshLambertMaterial({
      color: this.config.colors.shoes
    });
    
    // Left shoe
    const leftShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
    leftShoe.position.set(
      -this.config.size.width * 0.2,
      -this.config.size.height * 0.4,
      this.config.size.depth * 0.1
    );
    leftShoe.castShadow = true;
    this.group.add(leftShoe);
    
    // Right shoe
    const rightShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
    rightShoe.position.set(
      this.config.size.width * 0.2,
      -this.config.size.height * 0.4,
      this.config.size.depth * 0.1
    );
    rightShoe.castShadow = true;
    this.group.add(rightShoe);
  }

  /**
   * Add additional person details (buttons, pockets, etc.)
   */
  private addPersonDetails(): void {
    // Add simple buttons to clothing
    const buttonGeometry = new THREE.SphereGeometry(0.02, 6, 4);
    const buttonMaterial = new THREE.MeshLambertMaterial({
      color: 0x333333 // Dark buttons
    });
    
    for (let i = 0; i < 3; i++) {
      const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
      button.position.set(
        0,
        this.config.size.height * 0.2 - (i * 0.1),
        this.config.size.depth * 0.51
      );
      this.group.add(button);
    }
  }

  /**
   * Update person animations
   * Requirement 6.3: Add people animation and visual variety
   */
  public update(deltaTime: number): void {
    if (!this.isAnimating || this.isHit) return;
    
    this.animationTime += deltaTime * this.config.animationSpeed;
    
    // Subtle breathing animation
    const breathingAmplitude = 0.01;
    const breathingFrequency = 2.0;
    const breathing = Math.sin(this.animationTime * breathingFrequency) * breathingAmplitude;
    this.body.scale.y = 1 + breathing;
    
    // Gentle swaying animation
    const swayAmplitude = 0.05;
    const swayFrequency = 1.5;
    const sway = Math.sin(this.animationTime * swayFrequency) * swayAmplitude;
    this.group.rotation.z = sway;
    
    // Arm movement
    const armSwing = Math.sin(this.animationTime * 1.8) * 0.1;
    this.arms.forEach((arm, index) => {
      const direction = index === 0 ? 1 : -1; // Opposite arm movement
      arm.rotation.x = armSwing * direction;
    });
    
    // Head slight movement
    const headMovement = Math.sin(this.animationTime * 0.8) * 0.05;
    this.head.rotation.y = headMovement;
  }

  /**
   * Mark person as hit by trolley
   */
  public markAsHit(): void {
    if (this.isHit) return;
    
    this.isHit = true;
    this.isAnimating = false;
    
    // Update user data
    this.group.userData.isHit = true;
    
    // Visual feedback for being hit
    this.showHitEffect();
  }

  /**
   * Show visual effect when person is hit
   */
  private showHitEffect(): void {
    // Change color to indicate hit
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshLambertMaterial) {
        child.material.color.multiplyScalar(0.5); // Darken the colors
        child.material.emissive.setHex(0x440000); // Add red glow
      }
    });
    
    // Add falling animation
    const fallDuration = 1000; // 1 second
    const startRotation = this.group.rotation.z;
    const targetRotation = startRotation + (Math.random() > 0.5 ? 1 : -1) * Math.PI / 2;
    const startTime = Date.now();
    
    const animateFall = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / fallDuration, 1);
      
      // Ease out animation
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      this.group.rotation.z = startRotation + (targetRotation - startRotation) * easeProgress;
      this.group.position.y = this.baseY - (progress * 0.3); // Fall down slightly
      
      if (progress < 1) {
        requestAnimationFrame(animateFall);
      }
    };
    
    animateFall();
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

    // Clear arrays
    this.arms.length = 0;
    this.legs.length = 0;

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
    clothing: 0x4169E1, // Royal blue
    hair: 0x8B4513,    // Saddle brown
    shoes: 0x000000    // Black
  },
  animationSpeed: 1.0
};

/**
 * Color variations for visual variety
 */
export const PERSON_COLOR_VARIATIONS = {
  clothing: [
    0x4169E1, // Royal blue
    0xFF6347, // Tomato red
    0x32CD32, // Lime green
    0xFF69B4, // Hot pink
    0xFFD700, // Gold
    0x9370DB, // Medium purple
    0x20B2AA, // Light sea green
    0xFF4500  // Orange red
  ],
  hair: [
    0x8B4513, // Saddle brown
    0x000000, // Black
    0xFFD700, // Blonde
    0xA0522D, // Sienna
    0x696969, // Dim gray
    0xDC143C  // Crimson
  ],
  skin: [
    0xFFDBB3, // Light
    0xF4C2A1, // Medium light
    0xD2B48C, // Tan
    0xDEB887, // Burlywood
    0xCD853F, // Peru
    0xA0522D  // Sienna
  ]
} as const;

/**
 * Factory function to create person with random appearance variation
 * Requirement 6.3: Add visual variety
 */
export function createPersonWithVariation(position: THREE.Vector3): Person {
  const clothingColors = PERSON_COLOR_VARIATIONS.clothing;
  const hairColors = PERSON_COLOR_VARIATIONS.hair;
  const skinColors = PERSON_COLOR_VARIATIONS.skin;
  
  const config: PersonConfig = {
    ...DEFAULT_PERSON_CONFIG,
    position,
    colors: {
      skin: skinColors[Math.floor(Math.random() * skinColors.length)],
      clothing: clothingColors[Math.floor(Math.random() * clothingColors.length)],
      hair: hairColors[Math.floor(Math.random() * hairColors.length)],
      shoes: Math.random() > 0.5 ? 0x000000 : 0x8B4513 // Black or brown shoes
    },
    animationSpeed: 0.8 + Math.random() * 0.4 // Vary animation speed slightly
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
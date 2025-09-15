/**
 * CollisionDetection system - Handles collision detection between trolley and obstacles/people
 * Implements requirements: 8.4, 9.3, 8.2, 8.3, 9.1, 9.2
 */

import * as THREE from 'three';
import { Obstacle } from '../models/Obstacle';
import { Person } from '../models/Person';
import { Trolley } from '../models/Trolley';
import { CollisionEffects } from './CollisionEffects';

export interface CollisionResult {
  type: 'obstacle' | 'person';
  object: Obstacle | Person;
  position: THREE.Vector3;
  distance: number;
}

export interface CollisionConfig {
  trolleyBoundingBoxExpansion: number;
  enableVisualFeedback: boolean;
}

export class CollisionDetection {
  private config: CollisionConfig;
  private trolleyBoundingBox: THREE.Box3;
  private collisionHelper: THREE.Box3Helper | null = null;
  private collisionEffects: CollisionEffects | null = null;
  
  constructor(config?: Partial<CollisionConfig>) {
    this.config = {
      trolleyBoundingBoxExpansion: 0.1,
      enableVisualFeedback: false,
      ...config
    };
    
    this.trolleyBoundingBox = new THREE.Box3();
  }

  /**
   * Update trolley bounding box for collision detection
   * Requirement 8.4: Track whether trolley hit a barrier
   */
  public updateTrolleyBoundingBox(trolley: Trolley): void {
    this.trolleyBoundingBox.setFromObject(trolley.getGroup());
    
    // Expand bounding box slightly for more forgiving collision detection
    this.trolleyBoundingBox.expandByScalar(this.config.trolleyBoundingBoxExpansion);
  }

  /**
   * Check collision between trolley and obstacles
   * Requirement 8.4: Track whether trolley hit a barrier
   * Requirement 9.3: End game when hitting barrier
   */
  public checkObstacleCollisions(obstacles: Obstacle[]): CollisionResult[] {
    const collisions: CollisionResult[] = [];
    
    for (const obstacle of obstacles) {
      if (this.trolleyBoundingBox.intersectsBox(obstacle.boundingBox)) {
        // AABB intersection is sufficient to register a collision.
        // The previous center-distance gate caused false negatives for long objects.
        const trolleyCenter = new THREE.Vector3();
        this.trolleyBoundingBox.getCenter(trolleyCenter);
        const obstacleCenter = obstacle.getCenter();
        const distance = trolleyCenter.distanceTo(obstacleCenter);

        collisions.push({
          type: 'obstacle',
          object: obstacle,
          position: obstacleCenter.clone(),
          distance
        });
        
        // Show visual feedback if enabled
        if (this.config.enableVisualFeedback && this.collisionEffects) {
          this.collisionEffects.showObstacleCollisionEffect(obstacleCenter);
        }
      }
    }
    
    return collisions;
  }

  /**
   * Check collision between trolley and people
   * Requirement 8.2: Track total people hit
   * Requirement 8.3: Track total people avoided
   * Requirement 9.1: Add people not hit, subtract people hit
   * Requirement 9.2: Calculate score based on collision results
   */
  public checkPeopleCollisions(people: Person[]): CollisionResult[] {
    const collisions: CollisionResult[] = [];
    
    for (const person of people) {
      if (person.isHit) continue; // Skip already hit people
      
      if (this.trolleyBoundingBox.intersectsBox(person.boundingBox)) {
        // AABB intersection is sufficient: count as a hit
        const trolleyCenter = new THREE.Vector3();
        this.trolleyBoundingBox.getCenter(trolleyCenter);
        const personCenter = person.getCenter();
        const distance = trolleyCenter.distanceTo(personCenter);

        // Mark person as hit
        person.markAsHit();
        
        collisions.push({
          type: 'person',
          object: person,
          position: personCenter.clone(),
          distance
        });
        
        // Show visual feedback if enabled
        if (this.config.enableVisualFeedback && this.collisionEffects) {
          this.collisionEffects.showPersonCollisionEffect(personCenter);
        }
      }
    }
    
    return collisions;
  }

  // Distance-based gating removed: AABB intersections are sufficient for gameplay.

  /**
   * Set collision effects system for visual feedback
   */
  public setCollisionEffects(collisionEffects: CollisionEffects): void {
    this.collisionEffects = collisionEffects;
  }

  /**
   * Check if trolley is within collision range of any objects
   */
  public isNearCollision(obstacles: Obstacle[], people: Person[], warningDistance: number = 2.0): boolean {
    const trolleyCenter = new THREE.Vector3();
    this.trolleyBoundingBox.getCenter(trolleyCenter);
    
    // Check obstacles
    for (const obstacle of obstacles) {
      const distance = trolleyCenter.distanceTo(obstacle.getCenter());
      if (distance <= warningDistance) {
        return true;
      }
    }
    
    // Check people
    for (const person of people) {
      if (person.isHit) continue;
      const distance = trolleyCenter.distanceTo(person.getCenter());
      if (distance <= warningDistance) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get trolley bounding box for debugging
   */
  public getTrolleyBoundingBox(): THREE.Box3 {
    return this.trolleyBoundingBox.clone();
  }

  /**
   * Enable/disable visual collision feedback
   */
  public setVisualFeedback(enabled: boolean): void {
    this.config.enableVisualFeedback = enabled;
  }

  /**
   * Update collision configuration
   */
  public updateConfig(newConfig: Partial<CollisionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Create visual helper for debugging collision bounds
   */
  public createCollisionHelper(scene: THREE.Scene): THREE.Box3Helper {
    if (this.collisionHelper) {
      scene.remove(this.collisionHelper);
      this.collisionHelper.dispose();
    }
    
    this.collisionHelper = new THREE.Box3Helper(this.trolleyBoundingBox, 0x00FF00);
    scene.add(this.collisionHelper);
    return this.collisionHelper;
  }

  /**
   * Update collision helper visualization
   */
  public updateCollisionHelper(): void {
    if (this.collisionHelper) {
      this.collisionHelper.box.copy(this.trolleyBoundingBox);
    }
  }

  /**
   * Remove collision helper from scene
   */
  public removeCollisionHelper(scene: THREE.Scene): void {
    if (this.collisionHelper) {
      scene.remove(this.collisionHelper);
      this.collisionHelper.dispose();
      this.collisionHelper = null;
    }
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    if (this.collisionHelper) {
      this.collisionHelper.dispose();
      this.collisionHelper = null;
    }
    this.collisionEffects = null;
  }
}

/**
 * Default collision detection configuration
 */
export const DEFAULT_COLLISION_CONFIG: CollisionConfig = {
  trolleyBoundingBoxExpansion: 0.1,
  enableVisualFeedback: false
};

/**
 * Factory function to create collision detection system
 */
export function createCollisionDetection(config?: Partial<CollisionConfig>): CollisionDetection {
  return new CollisionDetection(config);
}
/**
 * CollisionManager - Orchestrates collision detection, visual effects, and game state updates
 * Implements requirements: 8.2, 8.3, 8.4, 9.1, 9.2, 9.3
 */

// THREE import removed as it's unused
import { CollisionDetection, CollisionResult } from './CollisionDetection';
import { CollisionEffects } from './CollisionEffects';
import { TrolleyController } from './TrolleyController';
import { TrolleyCrashSystem } from './TrolleyCrashSystem';
import { GameState } from '../models/GameState';
import { Obstacle } from '../models/Obstacle';
import { Person } from '../models/Person';

export interface CollisionManagerConfig {
  enableVisualEffects: boolean;
  enableAudio: boolean;
  warningDistance: number;
}

export interface SegmentCollisionData {
  totalPeople: number;
  peopleHit: number;
  peopleAvoided: number;
  obstaclesHit: number;
  gameEnded: boolean;
}

export class CollisionManager {
  private collisionDetection: CollisionDetection;
  private collisionEffects: CollisionEffects | null = null;
  private crashSystem: TrolleyCrashSystem | null = null;
  private config: CollisionManagerConfig;
  private onCrashComplete?: () => void;
  
  // Track collisions per segment
  private currentSegmentCollisions: SegmentCollisionData;
  private segmentPeopleTracking: Set<number> = new Set(); // Track people IDs in current segment

  constructor(
    collisionDetection: CollisionDetection,
    config?: Partial<CollisionManagerConfig>
  ) {
    this.collisionDetection = collisionDetection;
    this.config = {
      enableVisualEffects: true,
      enableAudio: false,
      warningDistance: 2.0,
      ...config
    };

    this.currentSegmentCollisions = this.createEmptySegmentData();
  }

  /**
   * Set collision effects system for visual feedback
   */
  public setCollisionEffects(collisionEffects: CollisionEffects): void {
    this.collisionEffects = collisionEffects;
    this.collisionDetection.setCollisionEffects(collisionEffects);
    this.collisionDetection.setVisualFeedback(this.config.enableVisualEffects);
  }

  /**
   * Set crash system for trolley crash animations
   */
  public setCrashSystem(crashSystem: TrolleyCrashSystem): void {
    this.crashSystem = crashSystem;
  }

  /**
   * Set callback to be invoked when crash animation completes
   */
  public setCrashCompleteHandler(handler: () => void): void {
    this.onCrashComplete = handler;
  }

  /**
   * Process collisions for current frame
   * Requirement 8.2, 8.3, 8.4: Track people hit/avoided and barrier hits
   * Requirement 9.1, 9.2, 9.3: Update score and end game appropriately
   */
  public processCollisions(
    trolleyController: TrolleyController,
    obstacles: Obstacle[],
    people: Person[],
    gameState: GameState
  ): CollisionResult[] {
    // Get collision results from trolley controller
    const collisions = trolleyController.checkCollisions(obstacles, people);
    
    if (collisions.length === 0) {
      return collisions;
    }

    // If an obstacle was hit, immediately stop the trolley movement
    if (collisions.some(c => c.type === 'obstacle')) {
      trolleyController.setSpeed(0);
    }

    // Process each collision
    for (const collision of collisions) {
      this.processIndividualCollision(collision);
    }

    // Update game state with collision results
    gameState.processCollisionResults(collisions);

    return collisions;
  }

  /**
   * Process an individual collision
   */
  private processIndividualCollision(collision: CollisionResult): void {
    if (collision.type === 'obstacle') {
      this.handleObstacleCollision(collision);
    } else if (collision.type === 'person') {
      this.handlePersonCollision(collision);
    }
  }

  /**
   * Handle obstacle collision
   * Requirement 8.4: Track whether trolley hit a barrier
   * Requirement 9.3: End game when hitting barrier
   */
  private handleObstacleCollision(collision: CollisionResult): void {
    this.currentSegmentCollisions.obstaclesHit++;
    this.currentSegmentCollisions.gameEnded = true;

    // Start crash animation if crash system is available
    if (this.crashSystem) {
      this.crashSystem.startCrashAnimation(this.onCrashComplete);
    }

    // Show visual effect if enabled
    if (this.config.enableVisualEffects && this.collisionEffects) {
      this.collisionEffects.showObstacleCollisionEffect(collision.position);
    }

    console.log('Obstacle collision detected - Starting crash animation!');
  }

  /**
   * Handle person collision
   * Requirement 8.2: Track total people hit
   */
  private handlePersonCollision(collision: CollisionResult): void {
    const person = collision.object as Person;
    
    // Only count if not already hit in this segment
    if (!this.segmentPeopleTracking.has(person.id)) {
      this.currentSegmentCollisions.peopleHit++;
      this.segmentPeopleTracking.add(person.id);

      // Show visual effect if enabled
      if (this.config.enableVisualEffects && this.collisionEffects) {
        this.collisionEffects.showPersonCollisionEffect(collision.position);
      }

      console.log(`Person collision detected - Total hit in segment: ${this.currentSegmentCollisions.peopleHit}`);
    }
  }

  /**
   * Initialize tracking for a new segment
   * Requirement 8.3: Track total people avoided
   */
  public startNewSegment(people: Person[]): void {
    // Process previous segment if it had data
    if (this.currentSegmentCollisions.totalPeople > 0) {
      this.finalizeCurrentSegment();
    }

    // Reset for new segment
    this.currentSegmentCollisions = this.createEmptySegmentData();
    this.segmentPeopleTracking.clear();
    
    // Count total people in this segment
    this.currentSegmentCollisions.totalPeople = people.length;
    
    console.log(`Started new segment with ${people.length} people`);
  }

  /**
   * Finalize current segment and calculate avoided people
   * Requirement 8.3: Track total people avoided
   * Requirement 9.1: Add people not hit to score
   */
  public finalizeCurrentSegment(): SegmentCollisionData {
    this.currentSegmentCollisions.peopleAvoided = 
      this.currentSegmentCollisions.totalPeople - this.currentSegmentCollisions.peopleHit;

    console.log(`Segment completed - People hit: ${this.currentSegmentCollisions.peopleHit}, avoided: ${this.currentSegmentCollisions.peopleAvoided}`);
    
    return { ...this.currentSegmentCollisions };
  }

  /**
   * Process segment completion and update game state
   */
  public completeSegment(gameState: GameState): SegmentCollisionData {
    const segmentData = this.finalizeCurrentSegment();
    
    // Update game state with segment results
    gameState.processSegmentCompletion(
      segmentData.totalPeople,
      segmentData.peopleHit
    );

    return segmentData;
  }

  /**
   * Check for near collisions and show warnings
   */
  public checkNearCollisions(
    trolleyController: TrolleyController,
    obstacles: Obstacle[],
    people: Person[]
  ): boolean {
    const isNear = trolleyController.isNearCollision(
      obstacles,
      people,
      this.config.warningDistance
    );

    if (isNear && this.config.enableVisualEffects && this.collisionEffects) {
      // Show warning effect at trolley position
      const trolleyPosition = trolleyController.position;
      this.collisionEffects.showWarningEffect(trolleyPosition);
    }

    return isNear;
  }

  /**
   * Get current segment collision data
   */
  public getCurrentSegmentData(): SegmentCollisionData {
    return { ...this.currentSegmentCollisions };
  }

  /**
   * Create empty segment data structure
   */
  private createEmptySegmentData(): SegmentCollisionData {
    return {
      totalPeople: 0,
      peopleHit: 0,
      peopleAvoided: 0,
      obstaclesHit: 0,
      gameEnded: false
    };
  }

  /**
   * Update collision manager configuration
   */
  public updateConfig(newConfig: Partial<CollisionManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update collision detection visual feedback
    this.collisionDetection.setVisualFeedback(this.config.enableVisualEffects);
  }

  /**
   * Enable or disable visual effects
   */
  public setVisualEffects(enabled: boolean): void {
    this.config.enableVisualEffects = enabled;
    this.collisionDetection.setVisualFeedback(enabled);
  }

  /**
   * Update collision effects (should be called in game loop)
   */
  public update(deltaTime: number): void {
    if (this.collisionEffects) {
      this.collisionEffects.update(deltaTime);
    }
    
    if (this.crashSystem) {
      this.crashSystem.update(deltaTime);
    }
  }

  /**
   * Reset collision manager state
   */
  public reset(): void {
    this.currentSegmentCollisions = this.createEmptySegmentData();
    this.segmentPeopleTracking.clear();
    
    if (this.collisionEffects) {
      this.collisionEffects.clearAllEffects();
    }
    
    if (this.crashSystem) {
      this.crashSystem.reset();
    }
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this.collisionDetection.dispose();
    
    if (this.collisionEffects) {
      this.collisionEffects.dispose();
    }
    
    if (this.crashSystem) {
      this.crashSystem.dispose();
    }
    
    this.segmentPeopleTracking.clear();
  }

  /**
   * Check if crash animation is currently playing
   */
  public isCrashAnimationPlaying(): boolean {
    return this.crashSystem ? this.crashSystem.isCrashAnimationPlaying() : false;
  }
}

/**
 * Default collision manager configuration
 */
export const DEFAULT_COLLISION_MANAGER_CONFIG: CollisionManagerConfig = {
  enableVisualEffects: true,
  enableAudio: false,
  warningDistance: 2.0
};

/**
 * Factory function to create collision manager
 */
export function createCollisionManager(
  collisionDetection: CollisionDetection,
  config?: Partial<CollisionManagerConfig>
): CollisionManager {
  return new CollisionManager(collisionDetection, config);
}
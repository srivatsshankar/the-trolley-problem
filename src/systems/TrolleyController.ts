/**
 * TrolleyController - Manages trolley movement, track switching, and speed progression
 * Implements requirements: 7.1, 7.2, 5.5, 5.3
 */

import * as THREE from 'three';
import { GameConfig } from '../models/GameConfig';
import { Trolley, createTrolley } from '../models/Trolley';
import { CollisionDetection, CollisionResult, createCollisionDetection } from './CollisionDetection';
import { Obstacle } from '../models/Obstacle';
import { Person } from '../models/Person';

export interface TrolleyState {
  position: THREE.Vector3;
  currentTrack: number;
  targetTrack: number;
  speed: number;
  isTransitioning: boolean;
  transitionProgress: number;
}

export class TrolleyController {
  private _position: THREE.Vector3;
  private _currentTrack: number;
  private _targetTrack: number;
  private _speed: number;
  private _baseSpeed: number;
  private _isTransitioning: boolean;
  private _transitionProgress: number;
  private _transitionDuration: number;
  private _segmentsPassed: number;
  private _lastSpeedSegmentIndex: number;
  
  private config: GameConfig;
  private mesh?: THREE.Object3D;
  private trolley?: Trolley;
  private collisionDetection: CollisionDetection;
  
  // Track positions (X coordinates for 5 tracks)
  private trackPositions: number[];
  
  constructor(config: GameConfig) {
    this.config = config;
    this._baseSpeed = config.trolley.baseSpeed;
    this._speed = this._baseSpeed;
  this._currentTrack = 1; // Start on track 1 (center track)
    this._targetTrack = 1;
  // Start ON the track near the beginning (tracks start at z=0)
  this._position = new THREE.Vector3(0, 0, 2);
    this._isTransitioning = false;
    this._transitionProgress = 0;
    this._transitionDuration = 1.0; // 1 second for track transitions
    this._segmentsPassed = 0;
  // Initialize last segment index for speed progression
  this._lastSpeedSegmentIndex = Math.floor(this._position.z / this.config.tracks.segmentLength);
    
    // Initialize collision detection system
    this.collisionDetection = createCollisionDetection({
      trolleyBoundingBoxExpansion: 0.1,
      collisionTolerance: 0.05,
      enableVisualFeedback: false
    });
    
    // Calculate track positions for 5 tracks
    // Tracks are evenly spaced with track width from config
    this.trackPositions = this.calculateTrackPositions();
    
    // Set initial position to center track
    this._position.x = this.trackPositions[this._currentTrack - 1];
  }
  
  /**
   * Calculate X positions for all 5 tracks
   */
  private calculateTrackPositions(): number[] {
    const trackWidth = this.config.tracks.width;
    const trackCount = this.config.tracks.count;
    const totalWidth = (trackCount - 1) * trackWidth;
    const startX = -totalWidth / 2;
    
    const positions: number[] = [];
    for (let i = 0; i < trackCount; i++) {
      positions.push(startX + i * trackWidth);
    }
    
    return positions;
  }
  
  /**
   * Update trolley position and handle movement logic
   * Requirement 7.2: Continuous forward movement along tracks
   */
  public update(deltaTime: number): void {
    // Update forward movement (Z-axis movement)
    this._position.z += this._speed * deltaTime;
    
    // Handle track switching animation
    if (this._isTransitioning) {
      this.updateTrackTransition(deltaTime);
    }
    
    // Update mesh position if available
    if (this.mesh) {
      this.mesh.position.copy(this._position);
    }
    
    // Update trolley 3D model animations
    if (this.trolley) {
      this.trolley.update(deltaTime, this._speed);
      this.trolley.setPosition(this._position);
      
      // Update collision detection bounding box
      this.collisionDetection.updateTrolleyBoundingBox(this.trolley);
    }

    // Auto-increase speed when crossing segment boundaries
    this.updateSpeedProgression();
  }

  /**
   * Detect segment boundary crossing and increase speed accordingly
   */
  private updateSpeedProgression(): void {
    const segLen = this.config.tracks.segmentLength;
    if (segLen <= 0) return;

    const currentSegmentIndex = Math.floor(this._position.z / segLen);
    if (currentSegmentIndex > this._lastSpeedSegmentIndex) {
      // For each newly entered segment (skip negatives), apply speed increase
      for (let i = this._lastSpeedSegmentIndex + 1; i <= currentSegmentIndex; i++) {
        if (i >= 0) {
          this.increaseSpeed();
        }
      }
      this._lastSpeedSegmentIndex = currentSegmentIndex;
    }
  }
  
  /**
   * Handle smooth track switching with curved path animations
   * Requirement 5.5: Smooth track switching
   * Requirement 5.3: Curved path animations
   */
  private updateTrackTransition(deltaTime: number): void {
    this._transitionProgress += deltaTime / this._transitionDuration;
    
    if (this._transitionProgress >= 1.0) {
      // Transition complete
      this._transitionProgress = 1.0;
      this._isTransitioning = false;
      this._currentTrack = this._targetTrack;
    }
    
    // Calculate smooth curved interpolation between tracks
    const startX = this.trackPositions[this._currentTrack - 1];
    const endX = this.trackPositions[this._targetTrack - 1];
    
    // Use smooth step function for curved animation
    const t = this.smoothStep(this._transitionProgress);
    this._position.x = THREE.MathUtils.lerp(startX, endX, t);
  }
  
  /**
   * Smooth step function for curved animations
   */
  private smoothStep(t: number): number {
    // Smooth step function: 3t² - 2t³
    return t * t * (3 - 2 * t);
  }
  
  /**
   * Switch to a specific track
   * Requirement 5.5: Smooth track switching
   */
  public switchToTrack(trackNumber: number): void {
    if (trackNumber < 1 || trackNumber > this.config.tracks.count) {
      console.warn(`Invalid track number: ${trackNumber}. Must be between 1 and ${this.config.tracks.count}`);
      return;
    }
    
    if (trackNumber === this._currentTrack && !this._isTransitioning) {
      return; // Already on target track
    }
    
    // Show direction indicator on trolley
    if (this.trolley) {
      const direction = trackNumber > this._currentTrack ? 'right' : 'left';
      this.trolley.showDirectionIndicator(direction);
    }
    
    this._targetTrack = trackNumber;
    this._isTransitioning = true;
    this._transitionProgress = 0;
    
    console.log(`Switching from track ${this._currentTrack} to track ${trackNumber}`);
  }
  
  /**
  * Increase speed by configured percentage per segment
  * Requirement 7.1: Speed increase per segment (configurable %)
   */
  public increaseSpeed(): void {
    this._segmentsPassed++;
   const rawMultiplier = Math.pow(1 + this.config.trolley.speedIncrease, this._segmentsPassed);
   const clampedMultiplier = Math.min(this.config.trolley.maxSpeedMultiplier, rawMultiplier);
   this._speed = this._baseSpeed * clampedMultiplier;
    
   console.log(`Speed increased to ${this._speed.toFixed(2)} (${(this._speed/this._baseSpeed).toFixed(2)}x base) after ${this._segmentsPassed} segments`);
  }
  
  /**
   * Check for collisions with obstacles and people
   * Returns array of collision results
   * Requirement 8.4: Track whether trolley hit a barrier
   * Requirement 8.2, 8.3: Track people hit and avoided
   */
  public checkCollisions(obstacles: Obstacle[] = [], people: Person[] = []): CollisionResult[] {
    if (!this.trolley) {
      return [];
    }
    
    const collisions: CollisionResult[] = [];
    
    // Check obstacle collisions (barriers that end the game)
    const obstacleCollisions = this.collisionDetection.checkObstacleCollisions(obstacles);
    collisions.push(...obstacleCollisions);
    
    // Check people collisions (affects score)
    const peopleCollisions = this.collisionDetection.checkPeopleCollisions(people);
    collisions.push(...peopleCollisions);
    
    return collisions;
  }

  /**
   * Check if trolley is near any collision objects (for warnings)
   */
  public isNearCollision(obstacles: Obstacle[] = [], people: Person[] = [], warningDistance: number = 2.0): boolean {
    if (!this.trolley) {
      return false;
    }
    
    return this.collisionDetection.isNearCollision(obstacles, people, warningDistance);
  }

  /**
   * Get collision detection system for external use
   */
  public getCollisionDetection(): CollisionDetection {
    return this.collisionDetection;
  }
  
  /**
   * Set the 3D mesh for the trolley
   */
  public setMesh(mesh: THREE.Object3D): void {
    this.mesh = mesh;
    this.mesh.position.copy(this._position);
  }
  
  /**
   * Create and set the 3D trolley model
   */
  public createTrolley(): Trolley {
    this.trolley = createTrolley();
    this.trolley.setPosition(this._position);
    return this.trolley;
  }
  
  /**
   * Get the trolley 3D model
   */
  public getTrolley(): Trolley | undefined {
    return this.trolley;
  }
  
  /**
   * Get the trolley's Three.js group for adding to scene
   */
  public getTrolleyGroup(): THREE.Group | undefined {
    return this.trolley?.getGroup();
  }
  
  /**
   * Get current trolley state
   */
  public getState(): TrolleyState {
    return {
      position: this._position.clone(),
      currentTrack: this._currentTrack,
      targetTrack: this._targetTrack,
      speed: this._speed,
      isTransitioning: this._isTransitioning,
      transitionProgress: this._transitionProgress
    };
  }
  
  /**
   * Reset trolley to initial state
   */
  public reset(): void {
  this._position.set(0, 0, 2); // Start on the first track segment near z=0
    this._currentTrack = 1;
    this._targetTrack = 1;
    this._speed = this._baseSpeed;
    this._isTransitioning = false;
    this._transitionProgress = 0;
    this._segmentsPassed = 0;
  this._lastSpeedSegmentIndex = Math.floor(this._position.z / this.config.tracks.segmentLength);
    
  // Set X position to current track
    this._position.x = this.trackPositions[this._currentTrack - 1];
    
    if (this.mesh) {
      this.mesh.position.copy(this._position);
    }
    
    if (this.trolley) {
      this.trolley.setPosition(this._position);
      this.trolley.showDirectionIndicator('none');
    }
  }
  
  /**
   * Get current position
   */
  public get position(): THREE.Vector3 {
    return this._position.clone();
  }
  
  /**
   * Get current track number
   */
  public get currentTrack(): number {
    return this._currentTrack;
  }
  
  /**
   * Get target track number
   */
  public get targetTrack(): number {
    return this._targetTrack;
  }
  
  /**
   * Get current speed
   */
  public get speed(): number {
    return this._speed;
  }
  
  /**
   * Get base speed
   */
  public get baseSpeed(): number {
    return this._baseSpeed;
  }
  
  /**
   * Get number of segments passed
   */
  public get segmentsPassed(): number {
    return this._segmentsPassed;
  }
  
  /**
   * Check if trolley is currently transitioning between tracks
   */
  public get isTransitioning(): boolean {
    return this._isTransitioning;
  }
  
  /**
   * Get transition progress (0-1)
   */
  public get transitionProgress(): number {
    return this._transitionProgress;
  }
  
  /**
   * Get the X position for a specific track number
   */
  public getTrackPosition(trackNumber: number): number {
    if (trackNumber < 1 || trackNumber > this.trackPositions.length) {
      throw new Error(`Invalid track number: ${trackNumber}`);
    }
    return this.trackPositions[trackNumber - 1];
  }
  
  /**
   * Get all track positions
   */
  public getTrackPositions(): number[] {
    return [...this.trackPositions];
  }
  
  /**
   * Force set position (for testing or special cases)
   */
  public setPosition(position: THREE.Vector3): void {
    this._position.copy(position);
    if (this.mesh) {
      this.mesh.position.copy(this._position);
    }
    if (this.trolley) {
      this.trolley.setPosition(this._position);
    }
  // Recompute last segment index so speed progression remains correct
  this._lastSpeedSegmentIndex = Math.floor(this._position.z / this.config.tracks.segmentLength);
  }
  
  /**
   * Force set speed (for testing or special cases)
   */
  public setSpeed(speed: number): void {
    this._speed = Math.max(0, speed);
  }
  
  /**
   * Get current speed multiplier relative to base speed
   */
  public getSpeedMultiplier(): number {
    return this._speed / this._baseSpeed;
  }
  
  /**
   * Check if trolley has reached high-speed threshold
   */
  public isHighSpeed(): boolean {
    return this.getSpeedMultiplier() >= this.config.difficulty.barrierIncreaseThreshold;
  }
  
  /**
   * Dispose of all resources
   */
  public dispose(): void {
    if (this.trolley) {
      this.trolley.dispose();
      this.trolley = undefined;
    }
    this.collisionDetection.dispose();
    this.mesh = undefined;
  }
}
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
import { CurvedRailwayTrack } from '../models/CurvedRailwayTrack';

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
  private transitionCurve?: THREE.Curve<THREE.Vector3>;
  private transitionStartZ: number = 0;
  private transitionEndZ: number = 0;
  private _segmentsPassed: number;
  private _lastSpeedSegmentIndex: number;
  private _sectionsPassed: number;
  private _lastSpeedSectionIndex: number;
  private _rockingBoostEnabled: boolean = false;
  
  private config: GameConfig;
  private mesh?: THREE.Object3D;
  private trolley?: Trolley;
  private collisionDetection: CollisionDetection;
  
  // Optional callbacks for visual connectors during transitions
  private onTransitionStartCb?: (curve: THREE.Curve<THREE.Vector3>) => void;
  private onTransitionEndCb?: () => void;
  
  // Track positions (X coordinates for 5 tracks)
  private trackPositions: number[];
  
  constructor(config: GameConfig) {
    this.config = config;
    this._baseSpeed = config.trolley.baseSpeed;
    this._speed = this._baseSpeed;
  this._currentTrack = 3; // Start on track 3 (center track, matches single track)
    this._targetTrack = 3;
  // Start ON the track near the beginning (tracks start at z=0)
  this._position = new THREE.Vector3(0, 0, 2);
    this._isTransitioning = false;
    this._transitionProgress = 0;
    this._transitionDuration = 1.0; // 1 second for track transitions
    this._segmentsPassed = 0;
  // Initialize last segment index for speed progression
  this._lastSpeedSegmentIndex = Math.floor(this._position.z / this.config.tracks.segmentLength);
    this._sectionsPassed = 0;
    // Initialize last section index for speed progression (sections are 2.5x segment length)
    const sectionLength = this.config.tracks.segmentLength * 2.5;
    this._lastSpeedSectionIndex = Math.floor(this._position.z / sectionLength);
    
    // Initialize collision detection system
    this.collisionDetection = createCollisionDetection({
      trolleyBoundingBoxExpansion: 0.1,
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
   * Must match TrackGenerator spacing: trackWidth * 2.0
   */
  private calculateTrackPositions(): number[] {
    const trackSpacing = this.config.tracks.width * 2.0; // Match TrackGenerator spacing
    const trackCount = this.config.tracks.count;
    const totalWidth = (trackCount - 1) * trackSpacing;
    const startX = -totalWidth / 2;
    
    const positions: number[] = [];
    for (let i = 0; i < trackCount; i++) {
      positions.push(startX + i * trackSpacing);
    }
    
    return positions;
  }
  
  /**
   * Update trolley position and handle movement logic
   * Requirement 7.2: Continuous forward movement along tracks
   */
  public update(deltaTime: number): void {
    // Update forward movement (Z-axis movement)
    // We always advance Z linearly by speed; during transitions, X follows a curve
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

    // Auto-increase speed when crossing section boundaries
    this.updateSpeedProgression();
  }

  /**
   * Detect section boundary crossing and increase speed accordingly
   * Sections are 2.5x segment length, speed increases 5% per section
   */
  private updateSpeedProgression(): void {
    const segLen = this.config.tracks.segmentLength;
    if (segLen <= 0) return;

    // Update segment tracking (for compatibility)
    const currentSegmentIndex = Math.floor(this._position.z / segLen);
    if (currentSegmentIndex > this._lastSpeedSegmentIndex) {
      this._lastSpeedSegmentIndex = currentSegmentIndex;
    }

    // Update section tracking and speed progression
    const sectionLength = segLen * 2.5;
    const currentSectionIndex = Math.floor(this._position.z / sectionLength);
    if (currentSectionIndex > this._lastSpeedSectionIndex) {
      // For each newly entered section (skip negatives), apply speed increase
      for (let i = this._lastSpeedSectionIndex + 1; i <= currentSectionIndex; i++) {
        if (i >= 0) {
          this.increaseSectionSpeed();
        }
      }
      this._lastSpeedSectionIndex = currentSectionIndex;
    }
  }
  
  /**
   * Handle smooth track switching with curved path animations
   * Requirement 5.5: Smooth track switching
   * Requirement 5.3: Curved path animations
   */
  private updateTrackTransition(deltaTime: number): void {
    // If we have a curve, drive X (and optional Y) from the curve based on Z progress
    if (this.transitionCurve) {
      const denom = Math.max(1e-6, this.transitionEndZ - this.transitionStartZ);
      const linearT = Math.max(0, Math.min(1, (this._position.z - this.transitionStartZ) / denom));
      // Keep external progress for potential UI/debug
      this._transitionProgress = linearT;
      const t = this.smoothStep(linearT);
      const p = this.transitionCurve.getPoint(t);
      this._position.x = p.x;
      // Keep trolley on ground with very slight lift for visual separation
      this._position.y = 0; // flat, simple

      if (linearT >= 1) {
        // Transition complete
        this._isTransitioning = false;
        this._currentTrack = this._targetTrack;
        this.transitionCurve = undefined;
        this.onTransitionEndCb?.();
      }
      return;
    }

    // Fallback to simple lateral lerp if no curve present
    this._transitionProgress += deltaTime / this._transitionDuration;
    const startX = this.trackPositions[this._currentTrack - 1];
    const endX = this.trackPositions[this._targetTrack - 1];
    const t = this.smoothStep(this._transitionProgress);
    this._position.x = THREE.MathUtils.lerp(startX, endX, t);
    if (this._transitionProgress >= 1.0) {
      this._transitionProgress = 1.0;
      this._isTransitioning = false;
      this._currentTrack = this._targetTrack;
      this.onTransitionEndCb?.();
    }
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

    // Prepare a smooth curved path between current and target tracks using improved curve generation
    try {
      const startX = this.trackPositions[this._currentTrack - 1];
      const endX = this.trackPositions[trackNumber - 1];
      const startZ = this._position.z;
      // Use fixed curve length regardless of speed to prevent long curves at high speeds
      const fixedCurveLength = this._baseSpeed * this._transitionDuration; // Always use base speed for curve length
      const endZ = startZ + fixedCurveLength;
      this.transitionStartZ = startZ;
      this.transitionEndZ = endZ;
      
      // Use CurvedRailwayTrack helper for smooth S-curve transition
      this.transitionCurve = CurvedRailwayTrack.createTrackTransition(
        startX,
        endX,
        startZ,
        endZ,
        0.05 // Slight elevation for smooth transition
      );
      
      console.log(`[TrolleyController] Created actual transition curve: Track ${this._currentTrack}->${trackNumber}, X=${startX.toFixed(1)}->${endX.toFixed(1)}, Z=${startZ.toFixed(1)}->${endZ.toFixed(1)} (fixed curve length=${fixedCurveLength.toFixed(1)}, current speed=${this._speed.toFixed(1)}, duration=${this._transitionDuration})`);
      
      // Notify listeners to render a temporary connector
      this.onTransitionStartCb?.(this.transitionCurve);
    } catch (e) {
      console.warn('Failed to create transition curve, falling back to linear lerp', e);
      this.transitionCurve = undefined;
    }
    
    console.log(`Switching from track ${this._currentTrack} to track ${trackNumber}`);
  }
  
  /**
   * Increase speed by 25% per section (updated requirement)
   * Trolley gets 25% faster after every section, capped at 7x base speed
   */
  public increaseSectionSpeed(): void {
    this._sectionsPassed++;
    // 25% increase per section: 1.25^sections, capped at 7x base speed
    const rawMultiplier = Math.pow(1.25, this._sectionsPassed);
    const clampedMultiplier = Math.min(this.config.trolley.maxSpeedMultiplier, rawMultiplier);
    this._speed = this._baseSpeed * clampedMultiplier;
    
    // Enable slight rocking boost starting at the 3rd section (since sections are longer)
    if (!this._rockingBoostEnabled && this._sectionsPassed >= 3) {
      this._rockingBoostEnabled = true;
      if (this.trolley && typeof this.trolley.setRockingBoost === 'function') {
        this.trolley.setRockingBoost(true);
      }
    }
    
    console.log(`Speed increased to ${this._speed.toFixed(2)} (${(this._speed/this._baseSpeed).toFixed(2)}x base) after ${this._sectionsPassed} sections`);
  }

  /**
  * Increase speed by configured percentage per segment (legacy method for compatibility)
  * Requirement 7.1: Speed increase per segment (configurable %)
   */
  public increaseSpeed(): void {
    this._segmentsPassed++;
   const rawMultiplier = Math.pow(1 + this.config.trolley.speedIncrease, this._segmentsPassed);
   const clampedMultiplier = Math.min(this.config.trolley.maxSpeedMultiplier, rawMultiplier);
   this._speed = this._baseSpeed * clampedMultiplier;
   // Enable slight rocking boost starting at the 5th segment
   if (!this._rockingBoostEnabled && this._segmentsPassed >= 5) {
     this._rockingBoostEnabled = true;
     if (this.trolley && typeof this.trolley.setRockingBoost === 'function') {
       this.trolley.setRockingBoost(true);
     }
   }
    
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
    // Apply any milestone-based visual states (e.g., rocking boost)
    if (typeof this.trolley.setRockingBoost === 'function') {
      this.trolley.setRockingBoost(this._rockingBoostEnabled);
    }
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
    this._currentTrack = 3; // Start on track 3 (center track, matches single track)
    this._targetTrack = 3;
    this._speed = this._baseSpeed;
    this._isTransitioning = false;
    this._transitionProgress = 0;
    this._segmentsPassed = 0;
  this._lastSpeedSegmentIndex = Math.floor(this._position.z / this.config.tracks.segmentLength);
    this._sectionsPassed = 0;
    const sectionLength = this.config.tracks.segmentLength * 2.5;
    this._lastSpeedSectionIndex = Math.floor(this._position.z / sectionLength);
    this._rockingBoostEnabled = false;
    
  // Set X position to current track
    this._position.x = this.trackPositions[this._currentTrack - 1];
    
    if (this.mesh) {
      this.mesh.position.copy(this._position);
    }
    
    if (this.trolley) {
      this.trolley.setPosition(this._position);
      if (typeof this.trolley.setRockingBoost === 'function') {
        this.trolley.setRockingBoost(false);
      }
      if (typeof this.trolley.showDirectionIndicator === 'function') {
        this.trolley.showDirectionIndicator('none');
      }
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
   * Get number of sections passed
   */
  public get sectionsPassed(): number {
    return this._sectionsPassed;
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
  // Recompute last segment and section indices so speed progression remains correct
  this._lastSpeedSegmentIndex = Math.floor(this._position.z / this.config.tracks.segmentLength);
    const sectionLength = this.config.tracks.segmentLength * 2.5;
    this._lastSpeedSectionIndex = Math.floor(this._position.z / sectionLength);
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

  /**
   * Register optional callbacks for transition visuals
   */
  public setTransitionCallbacks(callbacks: {
    onStart?: (curve: THREE.Curve<THREE.Vector3>) => void;
    onEnd?: () => void;
  }): void {
    this.onTransitionStartCb = callbacks.onStart;
    this.onTransitionEndCb = callbacks.onEnd;
  }
}
/**
 * GameState class manages the core game state including score, statistics, and game progression
 * Implements requirements 8.1-8.5 and 9.1-9.2
 */
export class GameState {
  private _score: number = 0;
  private _peopleHit: number = 0;
  private _peopleAvoided: number = 0;
  private _currentSegment: number = 0;
  private _currentTrackPosition: number = 3; // Start on track 3 (center track)
  private _isGameOver: boolean = false;
  private _isPaused: boolean = false;
  private _hitBarrier: boolean = false;

  constructor() {
    this.reset();
  }

  // Getters for state access
  get score(): number {
    return this._score;
  }

  get peopleHit(): number {
    return this._peopleHit;
  }

  get peopleAvoided(): number {
    return this._peopleAvoided;
  }

  get currentSegment(): number {
    return this._currentSegment;
  }

  get currentTrackPosition(): number {
    return this._currentTrackPosition;
  }

  get isGameOver(): boolean {
    return this._isGameOver;
  }

  get isPaused(): boolean {
    return this._isPaused;
  }

  get hitBarrier(): boolean {
    return this._hitBarrier;
  }

  /**
   * Updates the score based on people hit and avoided in the current segment
   * Requirement 9.1: Add people not hit, subtract people hit
   * Requirement 9.2: Calculate score based on segment results
   */
  updateScore(peopleHitInSegment: number, peopleAvoidedInSegment: number): void {
    this._peopleHit += peopleHitInSegment;
    this._peopleAvoided += peopleAvoidedInSegment;
    
    // Score calculation: add avoided, subtract hit
    this._score += peopleAvoidedInSegment - peopleHitInSegment;
  }

  /**
   * Process collision results and update game state accordingly
   * Requirement 8.2: Track total people hit
   * Requirement 8.3: Track total people avoided
   * Requirement 8.4: Track whether trolley hit a barrier
   * Requirement 9.3: End game when hitting barrier
   */
  processCollisionResults(collisionResults: Array<{type: 'obstacle' | 'person', object: any}>): void {
    let peopleHitThisFrame = 0;
    let hitBarrier = false;

    for (const collision of collisionResults) {
      if (collision.type === 'obstacle') {
        hitBarrier = true;
      } else if (collision.type === 'person') {
        peopleHitThisFrame++;
      }
    }

    // Update people hit count
    if (peopleHitThisFrame > 0) {
      this._peopleHit += peopleHitThisFrame;
      // Subtract from score for people hit
      this._score -= peopleHitThisFrame;
    }

    // End game if barrier was hit
    if (hitBarrier) {
      this.endGame(true);
    }
  }

  /**
   * Process segment completion and calculate avoided people
   * Requirement 8.3: Track total people avoided
   * Requirement 9.1: Add people not hit to score
   */
  processSegmentCompletion(totalPeopleInSegment: number, peopleHitInSegment: number): void {
    const peopleAvoidedInSegment = totalPeopleInSegment - peopleHitInSegment;
    
    this._peopleAvoided += peopleAvoidedInSegment;
    // Add to score for people avoided
    this._score += peopleAvoidedInSegment;
    
    this.incrementSegment();
  }

  /**
   * Increments the current segment counter
   * Requirement 8.1: Track current segment
   */
  incrementSegment(): void {
    this._currentSegment++;
  }

  /**
   * Updates the current track position
   * Requirement 8.5: Track current track position
   */
  setCurrentTrackPosition(trackNumber: number): void {
    if (trackNumber >= 1 && trackNumber <= 5) {
      this._currentTrackPosition = trackNumber;
    }
  }

  /**
   * Ends the game, typically when hitting a barrier
   * Requirement 8.4: Track whether trolley hit a barrier
   * Requirement 9.3: End game when hitting barrier
   */
  endGame(hitBarrier: boolean = false): void {
    this._isGameOver = true;
    this._hitBarrier = hitBarrier;
  }

  /**
   * Pauses or resumes the game
   * Requirement 11.2: Pause functionality
   */
  setPaused(paused: boolean): void {
    this._isPaused = paused;
  }

  /**
   * Pauses the game
   */
  pause(): void {
    this._isPaused = true;
  }

  /**
   * Resumes the game
   */
  resume(): void {
    this._isPaused = false;
  }

  /**
   * Gets the current segment (alias for currentSegment getter)
   */
  getCurrentSegment(): number {
    return this._currentSegment;
  }

  /**
   * Gets the current score
   */
  getScore(): number {
    return this._score;
  }

  /**
   * Resets the game state to initial values
   */
  reset(): void {
    this._score = 0;
    this._peopleHit = 0;
    this._peopleAvoided = 0;
    this._currentSegment = 0;
    this._currentTrackPosition = 3;
    this._isGameOver = false;
    this._isPaused = false;
    this._hitBarrier = false;
  }

  /**
   * Serializes the game state for persistence
   */
  serialize(): string {
    return JSON.stringify({
      score: this._score,
      peopleHit: this._peopleHit,
      peopleAvoided: this._peopleAvoided,
      currentSegment: this._currentSegment,
      currentTrackPosition: this._currentTrackPosition,
      isGameOver: this._isGameOver,
      isPaused: this._isPaused,
      hitBarrier: this._hitBarrier
    });
  }

  /**
   * Deserializes and loads game state from persistence
   */
  deserialize(serializedState: string): void {
    try {
      const state = JSON.parse(serializedState);
      this._score = state.score || 0;
      this._peopleHit = state.peopleHit || 0;
      this._peopleAvoided = state.peopleAvoided || 0;
      this._currentSegment = state.currentSegment || 0;
      this._currentTrackPosition = state.currentTrackPosition || 3;
      this._isGameOver = state.isGameOver || false;
      this._isPaused = state.isPaused || false;
      this._hitBarrier = state.hitBarrier || false;
    } catch (error) {
      console.error('Failed to deserialize game state:', error);
      this.reset();
    }
  }

  /**
   * Gets a summary of the current game statistics
   */
  getGameSummary(): {
    score: number;
    peopleHit: number;
    peopleAvoided: number;
    segmentsCompleted: number;
    finalTrack: number;
  } {
    return {
      score: this._score,
      peopleHit: this._peopleHit,
      peopleAvoided: this._peopleAvoided,
      segmentsCompleted: this._currentSegment,
      finalTrack: this._currentTrackPosition
    };
  }
}
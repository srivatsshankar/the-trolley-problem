/**
 * GameConfig interface and implementation for managing game configuration
 * Implements requirements 7.1, 7.4, and 6.5
 */

export interface GameConfig {
  tracks: {
    count: number;
    width: number;
    segmentLength: number;
  };
  trolley: {
    baseSpeed: number;
    speedIncrease: number; // Percentage increase per segment (Requirement 7.1)
    maxSpeedMultiplier: number; // When difficulty increases (Requirement 7.4)
  };
  difficulty: {
    minPeoplePerTrack: number;
    maxPeoplePerTrack: number;
    guaranteedSinglePersonTrack: boolean;
    barrierIncreaseThreshold: number; // Speed multiplier threshold (Requirement 6.5)
    highSpeedMinBarriers: number;
    highSpeedMaxBarriers: number;
  };
  rendering: {
    viewDistance: number;
    maxVisibleSegments: number;
    /** Minimum number of sections that should be visible on screen at all times */
    minSectionsInView: number;
    /** Number of sections to preload content ahead of the player */
    previewSectionsAhead: number;
    /** Camera frustum size for orthographic camera */
    cameraFrustumSize: number;
  };
  scoring: {
    pointsPerPersonAvoided: number;
    pointsPerPersonHit: number; // Negative value
  };
  effects: {
    bounceOnBarrierHit: {
      enabled: boolean;
      force: number; // Bounce back force multiplier
      duration: number; // Duration of bounce effect in milliseconds
    };
    crashEffects: {
      fireIntensity: number; // Fire particle intensity multiplier
      fireParticleCount: number; // Number of fire particles
      fireSize: number; // Size multiplier for fire particles
    };
  };
}

/**
 * Default game configuration
 */
export const DEFAULT_CONFIG: GameConfig = {
  tracks: {
    count: 5,
    width: 2.0,
    segmentLength: 25.0 // Increased by 2.5x for smoother gameplay
  },
  trolley: {
    baseSpeed: 7.0,
  speedIncrease: 0.0103, // 1.03% increase per segment (Requirement 7.1)
    maxSpeedMultiplier: 7.0 // 7x base speed threshold (Requirement 7.4)
  },
  difficulty: {
    minPeoplePerTrack: 1,
    maxPeoplePerTrack: 5,
    guaranteedSinglePersonTrack: true,
    barrierIncreaseThreshold: 7.0, // 7x base speed (Requirement 6.5)
    highSpeedMinBarriers: 2,
    highSpeedMaxBarriers: 4
  },
  rendering: {
    viewDistance: 250.0, // Increased but more reasonable for performance
    maxVisibleSegments: 12, // Increased but balanced
    /** Minimum number of sections that should be visible on screen at all times */
    minSectionsInView: 3.5, // Good visibility without being excessive
    /** Number of sections to preload content ahead of the player */
    previewSectionsAhead: 2.5, // Adequate preloading
    /** Camera frustum size for orthographic camera */
    cameraFrustumSize: 60 // Balanced size for good visibility without menu issues
  },
  scoring: {
    pointsPerPersonAvoided: 1,
    pointsPerPersonHit: -1
  },
  effects: {
    bounceOnBarrierHit: {
      enabled: true,
      force: 0.3, // Gentle bounce back force
      duration: 200 // 200ms bounce duration
    },
    crashEffects: {
      fireIntensity: 2.0, // 2x intensity for more dramatic fire
      fireParticleCount: 150, // More particles for intense fire
      fireSize: 1.5 // 1.5x larger fire particles
    }
  }
};

/**
 * GameConfigManager handles configuration loading, validation, and dynamic adjustments
 */
export class GameConfigManager {
  private config: GameConfig;

  constructor(initialConfig?: Partial<GameConfig>) {
    this.config = this.mergeConfig(DEFAULT_CONFIG, initialConfig || {});
    this.validateConfig();
  }

  /**
   * Gets the current configuration
   */
  getConfig(): GameConfig {
    // Deep copy to prevent external modification
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Updates configuration with new values
   */
  updateConfig(updates: Partial<GameConfig>): void {
    this.config = this.mergeConfig(this.config, updates);
    this.validateConfig();
  }

  /**
   * Calculates current trolley speed based on segment number
   * Requirement 7.1: 3% speed increase per segment
   */
  calculateTrolleySpeed(segmentNumber: number): number {
    const speedMultiplier = Math.pow(1 + this.config.trolley.speedIncrease, segmentNumber);
    return this.config.trolley.baseSpeed * speedMultiplier;
  }

  /**
   * Determines if high-speed difficulty should be active
   * Requirement 7.4: Difficulty increases at 5x base speed
   */
  isHighSpeedMode(segmentNumber: number): boolean {
    const currentSpeed = this.calculateTrolleySpeed(segmentNumber);
    const threshold = this.config.trolley.baseSpeed * this.config.difficulty.barrierIncreaseThreshold;
    return currentSpeed >= threshold;
  }

  /**
   * Gets the number of barriers for the current segment
   * Requirement 6.5: 2-4 barriers at high speed, 1 barrier normally
   */
  getBarrierCount(segmentNumber: number): number {
    if (this.isHighSpeedMode(segmentNumber)) {
      const min = this.config.difficulty.highSpeedMinBarriers;
      const max = this.config.difficulty.highSpeedMaxBarriers;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    return 1; // Normal mode: 1 barrier per segment
  }

  /**
   * Gets people distribution configuration for a segment
   */
  getPeopleDistribution(): {
    minPeoplePerTrack: number;
    maxPeoplePerTrack: number;
    guaranteedSinglePersonTrack: boolean;
  } {
    return {
      minPeoplePerTrack: this.config.difficulty.minPeoplePerTrack,
      maxPeoplePerTrack: this.config.difficulty.maxPeoplePerTrack,
      guaranteedSinglePersonTrack: this.config.difficulty.guaranteedSinglePersonTrack
    };
  }

  /**
   * Adjusts difficulty settings dynamically
   */
  adjustDifficulty(adjustments: {
    speedIncrease?: number;
    barrierThreshold?: number;
    maxPeoplePerTrack?: number;
  }): void {
    if (adjustments.speedIncrease !== undefined) {
      this.config.trolley.speedIncrease = Math.max(0, Math.min(1, adjustments.speedIncrease));
    }
    
    if (adjustments.barrierThreshold !== undefined) {
      this.config.difficulty.barrierIncreaseThreshold = Math.max(1.01, adjustments.barrierThreshold);
    }
    
    if (adjustments.maxPeoplePerTrack !== undefined) {
      this.config.difficulty.maxPeoplePerTrack = Math.max(1, adjustments.maxPeoplePerTrack);
    }
    
    this.validateConfig();
  }

  /**
   * Loads configuration from JSON string
   */
  loadFromJSON(configJSON: string): void {
    try {
      const loadedConfig = JSON.parse(configJSON);
      this.updateConfig(loadedConfig);
    } catch (error) {
      console.error('Failed to load configuration from JSON:', error);
      throw new Error('Invalid configuration JSON');
    }
  }

  /**
   * Exports current configuration as JSON string
   */
  exportToJSON(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Resets configuration to default values
   */
  resetToDefault(): void {
    this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }

  /**
   * Validates the current configuration
   */
  private validateConfig(): void {
    const errors: string[] = [];

    // Validate tracks
    if (this.config.tracks.count < 1) {
      errors.push('Track count must be at least 1');
    }
    if (this.config.tracks.width <= 0) {
      errors.push('Track width must be positive');
    }
    if (this.config.tracks.segmentLength <= 0) {
      errors.push('Segment length must be positive');
    }

    // Validate trolley
    if (this.config.trolley.baseSpeed <= 0) {
      errors.push('Base speed must be positive');
    }
    if (this.config.trolley.speedIncrease < 0 || this.config.trolley.speedIncrease > 1) {
      errors.push('Speed increase must be between 0 and 1');
    }
    if (this.config.trolley.maxSpeedMultiplier <= 1) {
      errors.push('Max speed multiplier must be greater than 1');
    }

    // Validate difficulty
    if (this.config.difficulty.minPeoplePerTrack < 0) {
      errors.push('Minimum people per track cannot be negative');
    }
    if (this.config.difficulty.maxPeoplePerTrack < this.config.difficulty.minPeoplePerTrack) {
      errors.push('Maximum people per track must be >= minimum people per track');
    }
    if (this.config.difficulty.barrierIncreaseThreshold <= 1) {
      errors.push('Barrier increase threshold must be greater than 1');
    }
    if (this.config.difficulty.highSpeedMinBarriers < 1) {
      errors.push('High speed minimum barriers must be at least 1');
    }
    if (this.config.difficulty.highSpeedMaxBarriers < this.config.difficulty.highSpeedMinBarriers) {
      errors.push('High speed maximum barriers must be >= minimum barriers');
    }

    // Validate rendering
    if (this.config.rendering.viewDistance <= 0) {
      errors.push('View distance must be positive');
    }
    if (this.config.rendering.maxVisibleSegments < 1) {
      errors.push('Max visible segments must be at least 1');
    }

    // Validate effects
    if (this.config.effects.bounceOnBarrierHit.force < 0) {
      errors.push('Bounce force cannot be negative');
    }
    if (this.config.effects.bounceOnBarrierHit.duration < 0) {
      errors.push('Bounce duration cannot be negative');
    }
    if (this.config.effects.crashEffects.fireIntensity <= 0) {
      errors.push('Fire intensity must be positive');
    }
    if (this.config.effects.crashEffects.fireParticleCount < 0) {
      errors.push('Fire particle count cannot be negative');
    }
    if (this.config.effects.crashEffects.fireSize <= 0) {
      errors.push('Fire size must be positive');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Deep merges two configuration objects
   */
  private mergeConfig(base: GameConfig, updates: Partial<GameConfig>): GameConfig {
    const result = JSON.parse(JSON.stringify(base));

    if (updates.tracks) {
      result.tracks = { ...base.tracks, ...updates.tracks };
    }
    if (updates.trolley) {
      result.trolley = { ...base.trolley, ...updates.trolley };
    }
    if (updates.difficulty) {
      result.difficulty = { ...base.difficulty, ...updates.difficulty };
    }
    if (updates.rendering) {
      result.rendering = { ...base.rendering, ...updates.rendering };
    }
    if (updates.scoring) {
      result.scoring = { ...base.scoring, ...updates.scoring };
    }
    if (updates.effects) {
      result.effects = {
        bounceOnBarrierHit: { ...base.effects.bounceOnBarrierHit, ...updates.effects.bounceOnBarrierHit },
        crashEffects: { ...base.effects.crashEffects, ...updates.effects.crashEffects }
      };
    }

    return result;
  }
}
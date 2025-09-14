/**
 * GameController - Main game controller that integrates all systems
 * Implements complete game flow from menu through gameplay
 * Requirements: All requirements - complete system integration
 */

import * as THREE from 'three';
import { GameEngine } from './engine/GameEngine';
import { SceneManager, DEFAULT_SCENE_CONFIG } from './engine/SceneManager';
import { GameState } from './models/GameState';
import { GameConfig, DEFAULT_CONFIG } from './models/GameConfig';
import { TrackGenerator } from './systems/TrackGenerator';
import { CameraController } from './systems/CameraController';
import { TrolleyController } from './systems/TrolleyController';
import { GroundSystem } from './systems/GroundSystem';
import { createTrackStopper } from './models/TrackStopper';

export enum GamePhase {
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAME_OVER = 'game_over'
}

export interface GameControllerConfig {
  canvas: HTMLCanvasElement;
  gameConfig?: Partial<GameConfig>;
}

export class GameController {
  // Core systems
  private gameEngine: GameEngine;
  private sceneManager: SceneManager;
  private trackGenerator: TrackGenerator;
  private cameraController: CameraController;
  private trolleyController: TrolleyController;
  private gameConfig: GameConfig;
  private groundSystem: GroundSystem | null = null;

  // Game state
  private gameState: GameState;
  private currentPhase: GamePhase = GamePhase.MENU;
  private isInitialized: boolean = false;

  // Performance tracking
  private lastFrameTime: number = 0;
  private frameCount: number = 0;

  constructor(config: GameControllerConfig) {
    // Merge provided config with defaults
    this.gameConfig = {
      ...DEFAULT_CONFIG,
      ...config.gameConfig
    };

    // Initialize core systems
    this.gameEngine = new GameEngine({
      targetFPS: 60,
      enableLogging: true,
      canvas: config.canvas
    });

    this.sceneManager = new SceneManager({
      ...DEFAULT_SCENE_CONFIG,
      canvas: config.canvas
    });

    // Initialize track generator (will be set up after scene is ready)
    this.trackGenerator = new TrackGenerator(
      this.sceneManager.getScene(),
      this.gameConfig
    );

    // Initialize trolley controller
    this.trolleyController = new TrolleyController(this.gameConfig);

    // Initialize camera controller (will be set up after scene is ready)
    this.cameraController = new CameraController(
      this.sceneManager.getCamera(),
      {
        followDistance: 15,  // Match original Z offset
        followHeight: 15,    // Match original Y offset
        followOffset: 15,    // Match original X offset
        smoothness: 0.05,    // Smoother following
        lookAtTarget: false, // Don't change rotation for isometric view
        minFollowDistance: 0.5
      }
    );

    // Initialize game state
    this.gameState = new GameState();

    this.log('GameController created');
  }

  /**
   * Initialize all game systems
   */
  public async initialize(): Promise<void> {
    try {
      this.log('Initializing game systems...');

      // Initialize core systems
      this.gameEngine.initialize();
      this.sceneManager.initialize();

      // Create basic game objects
      this.createBasicScene();

      // Set up game loop callbacks
      this.setupGameLoop();

      this.isInitialized = true;
      this.log('Game initialization complete');

    } catch (error) {
      console.error('Game initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create basic scene objects for testing
   */
  private createBasicScene(): void {
    const scene = this.sceneManager.getScene();
  // Create tiling ground system instead of a single large plane
  this.groundSystem = new GroundSystem(scene, { tileSize: 200, gridHalfExtent: 1, color: 0x90EE90 });
  this.groundSystem.initialize(new THREE.Vector3(0, 0, 0));

    // Initialize track generator with proper single-to-multiple track system
    this.trackGenerator.initialize();

  // Create track stopper after the start so it sits just ahead of the trolley
  const trackStopper = createTrackStopper(new THREE.Vector3(0, 0.1, -2));
    scene.add(trackStopper.getGroup());

    // Create and position trolley using the proper controller
    this.trolleyController.createTrolley();
    const trolleyGroup = this.trolleyController.getTrolleyGroup();
    if (trolleyGroup) {
      scene.add(trolleyGroup);
      // Enable real-time window reflections (trial with default resolution)
      const trolley = this.trolleyController.getTrolley();
      if (trolley) {
        trolley.enableWindowReflections(this.sceneManager.getScene(), this.sceneManager.getRenderer());
      }
    }

  // Ensure trolley starts ON the track (centered x=0) just after the stopper
  this.trolleyController.setPosition(new THREE.Vector3(0, 0, 2));

    // Don't set camera target immediately - wait for gameplay to start

    this.log('Basic scene created with ground, proper track system, track stopper, and trolley');
  }



  /**
   * Set up main game loop
   */
  private setupGameLoop(): void {
    this.gameEngine.registerUpdateCallback((deltaTime: number) => {
      this.update(deltaTime);
    });

    this.gameEngine.registerRenderCallback(() => {
      this.render();
    });
  }

  /**
   * Main update loop
   */
  private update(deltaTime: number): void {
    if (!this.isInitialized) return;

    // Update performance tracking
    this.updatePerformanceTracking(deltaTime);

    // Update trolley movement
    if (this.currentPhase === GamePhase.PLAYING) {
      this.trolleyController.update(deltaTime);

      const trolleyPosition = this.trolleyController.position;

      // Update track generation based on trolley position
      this.trackGenerator.updateGeneration(trolleyPosition);
      this.trackGenerator.update(deltaTime);

  // No forced reset: tracks are generated endlessly; camera continues following
    }

    // Update camera to follow trolley
    this.cameraController.update(deltaTime);

    // Keep ground under the trolley (or camera if missing)
    if (this.groundSystem) {
      const target = this.trolleyController ? this.trolleyController.position : this.sceneManager.getCamera().position;
      this.groundSystem.update(target);
    }

    // Log status periodically
    if (this.frameCount % 60 === 0) {
      const trolleyZ = this.trolleyController.position.z.toFixed(1);
      const isFollowing = this.cameraController.isFollowing() ? 'Yes' : 'No';
      this.log(`Game running - Phase: ${this.currentPhase}, Trolley Z: ${trolleyZ}, Camera Following: ${isFollowing}`);
    }
  }

  /**
   * Update performance tracking
   */
  private updatePerformanceTracking(deltaTime: number): void {
    this.frameCount++;
    this.lastFrameTime = deltaTime;

    // Log performance every 5 seconds
    if (this.frameCount % 300 === 0) {
      const fps = 1 / deltaTime;
      this.log(`Performance: ${fps.toFixed(1)} FPS, Frame time: ${(deltaTime * 1000).toFixed(2)}ms`);
    }
  }

  /**
   * Render the game
   */
  private render(): void {
    if (!this.isInitialized) return;

    this.sceneManager.render();
  }

  /**
   * Start the game
   */
  public start(): void {
    if (!this.isInitialized) {
      throw new Error('Game must be initialized before starting');
    }

    this.gameEngine.start();
    this.log('Game started');
  }

  /**
   * Start gameplay from menu
   */
  public startGame(): void {
    this.log('Starting gameplay...');
    this.currentPhase = GamePhase.PLAYING;
    
    // Enable camera following immediately since trolley is positioned and ready
    const trolleyGroup = this.trolleyController.getTrolleyGroup();
    if (trolleyGroup) {
      this.cameraController.setTarget(trolleyGroup);
      this.log('Camera following enabled - game started');
    }
    
    this.log('Gameplay started');
  }

  /**
   * Pause the game
   */
  public pauseGame(): void {
    if (this.currentPhase === GamePhase.PLAYING) {
      this.currentPhase = GamePhase.PAUSED;
      this.gameEngine.pause();
      this.log('Game paused');
    }
  }

  /**
   * Resume the game
   */
  public resumeGame(): void {
    if (this.currentPhase === GamePhase.PAUSED) {
      this.currentPhase = GamePhase.PLAYING;
      this.gameEngine.resume();
      this.log('Game resumed');
    }
  }

  /**
   * Get current game phase
   */
  public getCurrentPhase(): GamePhase {
    return this.currentPhase;
  }

  /**
   * Get game state
   */
  public getGameState(): GameState {
    return this.gameState;
  }

  /**
   * Get performance stats
   */
  public getPerformanceStats(): {
    fps: number;
    frameTime: number;
    frameCount: number;
  } {
    return {
      fps: 1 / this.lastFrameTime,
      frameTime: this.lastFrameTime * 1000,
      frameCount: this.frameCount
    };
  }

  /**
   * Check if game is initialized
   */
  public isGameInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get camera controller for external access
   */
  public getCameraController(): CameraController {
    return this.cameraController;
  }

  /**
   * Get trolley controller for external access
   */
  public getTrolleyController(): TrolleyController {
    return this.trolleyController;
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this.log('Disposing GameController...');

    // Stop game engine
    this.gameEngine.destroy();

    // Clear camera target
    if (this.cameraController) {
      this.cameraController.clearTarget();
    }

    // Dispose trolley controller
    if (this.trolleyController) this.trolleyController.dispose();

    // Dispose track generator
    if (this.trackGenerator) this.trackGenerator.dispose();

  // Dispose ground system
  if (this.groundSystem) this.groundSystem.dispose();

  // Dispose scene manager
    if (this.sceneManager) this.sceneManager.dispose();

    this.isInitialized = false;
    this.log('GameController disposed');
  }

  /**
   * Logging utility
   */
  private log(message: string): void {
    console.log(`[GameController] ${message}`);
  }
}
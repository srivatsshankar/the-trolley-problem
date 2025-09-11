/**
 * GameController - Main game controller that integrates all systems
 * Implements complete game flow from menu through gameplay
 * Requirements: All requirements - complete system integration
 */

import * as THREE from 'three';
import { GameEngine } from './engine/GameEngine';
import { SceneManager, DEFAULT_SCENE_CONFIG } from './engine/SceneManager';
import { GameState } from './models/GameState';
import { GameConfig } from './models/GameConfig';

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
  // gameConfig removed as it's unused

  // Game state
  private gameState: GameState;
  private currentPhase: GamePhase = GamePhase.MENU;
  private isInitialized: boolean = false;

  // Performance tracking
  private lastFrameTime: number = 0;
  private frameCount: number = 0;

  // Simple game objects for testing
  private trolley?: THREE.Mesh;
  private tracks: THREE.Mesh[] = [];
  private trolleySpeed: number = 2;

  constructor(config: GameControllerConfig) {
    // gameConfig assignment removed as it's unused

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

    // Create ground
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Create tracks
    const trackMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    for (let i = 0; i < 5; i++) {
      const trackGeometry = new THREE.BoxGeometry(1.5, 0.1, 20);
      const track = new THREE.Mesh(trackGeometry, trackMaterial);
      track.position.set((i - 2) * 2, 0.05, 0);
      track.castShadow = true;
      scene.add(track);
      this.tracks.push(track);
    }

    // Create trolley
    const trolleyGeometry = new THREE.BoxGeometry(1, 0.5, 2);
    const trolleyMaterial = new THREE.MeshLambertMaterial({ color: 0xFF6B6B });
    this.trolley = new THREE.Mesh(trolleyGeometry, trolleyMaterial);
    this.trolley.position.set(0, 0.5, -5);
    this.trolley.castShadow = true;
    scene.add(this.trolley);

    this.log('Basic scene created with ground, tracks, and trolley');
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
    if (this.trolley && this.currentPhase === GamePhase.PLAYING) {
      this.trolley.position.z += this.trolleySpeed * deltaTime;

      // Reset trolley position when it goes too far
      if (this.trolley.position.z > 15) {
        this.trolley.position.z = -15;
      }
    }

    // Log status periodically
    if (this.frameCount % 60 === 0) {
      const trolleyZ = this.trolley ? this.trolley.position.z.toFixed(1) : 'N/A';
      this.log(`Game running - Phase: ${this.currentPhase}, Trolley Z: ${trolleyZ}`);
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
   * Dispose of all resources
   */
  public dispose(): void {
    this.log('Disposing GameController...');

    // Stop game engine
    this.gameEngine.destroy();

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
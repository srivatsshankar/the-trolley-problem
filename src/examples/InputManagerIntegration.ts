/**
 * Example integration of InputManager with the main game
 * This shows how to integrate the track selection system with the existing game engine
 */

import { GameEngine, GameEngineConfig } from '../engine/GameEngine';
import { SceneManager, DEFAULT_SCENE_CONFIG } from '../engine/SceneManager';
import { InputManager } from '../systems/InputManager';
import { TrolleyController } from '../systems/TrolleyController';
import { TrackGenerator } from '../systems/TrackGenerator';
import { DEFAULT_CONFIG } from '../models/GameConfig';
// THREE import removed as it's unused

export class GameWithInputSystem {
  private gameEngine: GameEngine;
  private sceneManager: SceneManager;
  private inputManager: InputManager;
  private trolleyController: TrolleyController;
  private trackGenerator: TrackGenerator;
  
  constructor(canvas: HTMLCanvasElement) {
    // Initialize game engine
    const engineConfig: GameEngineConfig = {
      targetFPS: 60,
      enableLogging: true,
      canvas: canvas
    };
    this.gameEngine = new GameEngine(engineConfig);
    
    // Initialize scene manager
    const sceneConfig = {
      ...DEFAULT_SCENE_CONFIG,
      canvas: canvas
    };
    this.sceneManager = new SceneManager(sceneConfig);
    
    // Initialize game systems
    this.trolleyController = new TrolleyController(DEFAULT_CONFIG);
    this.trackGenerator = new TrackGenerator(this.sceneManager.getScene(), DEFAULT_CONFIG);
    
    // Initialize input manager with track selection
    this.inputManager = new InputManager(
      this.sceneManager.getScene(),
      this.trolleyController,
      this.trackGenerator,
      DEFAULT_CONFIG
    );
  }
  
  /**
   * Initialize all systems
   */
  public async initialize(): Promise<void> {
    // Initialize core systems
    this.gameEngine.initialize();
    this.sceneManager.initialize();
    
    // Initialize track generator
    this.trackGenerator.initialize();
    
    // Create trolley 3D model
    this.trolleyController.createTrolley();
    const trolleyGroup = this.trolleyController.getTrolleyGroup();
    if (trolleyGroup) {
      this.sceneManager.addToScene(trolleyGroup);
    }
    
    // Mount input system UI
    this.inputManager.mount();
    
    // Register update and render callbacks
    this.gameEngine.registerUpdateCallback((deltaTime: number) => {
      this.update(deltaTime);
    });
    
    this.gameEngine.registerRenderCallback(() => {
      this.sceneManager.render();
    });
    
    console.log('Game with input system initialized successfully');
  }
  
  /**
   * Update all systems
   */
  private update(deltaTime: number): void {
    // Update trolley controller
    this.trolleyController.update(deltaTime);
    
    // Update input manager (handles track selection queuing and processing)
    this.inputManager.update(deltaTime);
    
    // Update track generation based on trolley position
    this.trackGenerator.updateGeneration(this.trolleyController.position);
    
    // Example: Log current state every 2 seconds
    if (Math.floor(Date.now() / 2000) !== Math.floor((Date.now() - deltaTime * 1000) / 2000)) {
      this.logGameState();
    }
  }
  
  /**
   * Log current game state for debugging
   */
  private logGameState(): void {
    const trolleyState = this.trolleyController.getState();
    const selectedTrack = this.inputManager.getSelectedTrack();
    const queue = this.inputManager.getSelectionQueue();
    
    console.log('Game State:', {
      trolleyPosition: {
        x: trolleyState.position.x.toFixed(2),
        z: trolleyState.position.z.toFixed(2)
      },
      currentTrack: trolleyState.currentTrack,
      targetTrack: trolleyState.targetTrack,
      selectedTrack: selectedTrack,
      queuedSelections: queue.length,
      speed: trolleyState.speed.toFixed(2),
      isTransitioning: trolleyState.isTransitioning
    });
  }
  
  /**
   * Start the game
   */
  public start(): void {
    this.gameEngine.start();
    console.log('Game started with input system');
  }
  
  /**
   * Pause the game
   */
  public pause(): void {
    this.gameEngine.pause();
    this.inputManager.setEnabled(false);
    console.log('Game paused');
  }
  
  /**
   * Resume the game
   */
  public resume(): void {
    this.gameEngine.resume();
    this.inputManager.setEnabled(true);
    console.log('Game resumed');
  }
  
  /**
   * Reset the game to initial state
   */
  public reset(): void {
    this.trolleyController.reset();
    this.inputManager.reset();
    console.log('Game reset');
  }
  
  /**
   * Clean up all resources
   */
  public dispose(): void {
    this.inputManager.dispose();
    this.trolleyController.dispose();
    this.sceneManager.dispose();
    this.gameEngine.destroy();
    console.log('Game disposed');
  }
  
  /**
   * Get input manager for external access
   */
  public getInputManager(): InputManager {
    return this.inputManager;
  }
  
  /**
   * Get trolley controller for external access
   */
  public getTrolleyController(): TrolleyController {
    return this.trolleyController;
  }
}

/**
 * Example usage function
 */
export function createGameWithInputSystem(canvasId: string = 'gameCanvas'): GameWithInputSystem {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) {
    throw new Error(`Canvas element with id '${canvasId}' not found`);
  }
  
  const game = new GameWithInputSystem(canvas);
  
  // Set up keyboard shortcuts for testing
  document.addEventListener('keydown', (event) => {
    const inputManager = game.getInputManager();
    
    switch (event.key) {
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
        const trackNumber = parseInt(event.key);
        inputManager.selectTrack(trackNumber);
        console.log(`Keyboard shortcut: Selected track ${trackNumber}`);
        break;
      case 'p':
      case 'P':
        // Toggle pause
        if (game.getInputManager().getSelectedTrack()) {
          game.pause();
        } else {
          game.resume();
        }
        break;
      case 'r':
      case 'R':
        game.reset();
        break;
    }
  });
  
  return game;
}

/**
 * Example initialization
 */
export async function initializeGameExample(): Promise<GameWithInputSystem> {
  try {
    const game = createGameWithInputSystem();
    await game.initialize();
    game.start();
    
    console.log('Game example initialized successfully!');
    console.log('Controls:');
    console.log('- Click track buttons at bottom of screen to select tracks');
    console.log('- Use keyboard keys 1-5 to select tracks');
    console.log('- Press P to pause/resume');
    console.log('- Press R to reset');
    
    return game;
  } catch (error) {
    console.error('Failed to initialize game example:', error);
    throw error;
  }
}
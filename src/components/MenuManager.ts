/**
 * MenuManager - Manages all menu states and transitions
 */

import { MainMenu } from './MainMenu';
import { OptionsMenu } from './OptionsMenu';
import { InstructionsMenu } from './InstructionsMenu';
import { Menu3D } from './Menu3D';
import { GameOverMenu } from './GameOverMenu';
import { GameOver3D } from './GameOver3D';
import * as THREE from 'three';

export enum MenuState {
  MAIN = 'main',
  OPTIONS = 'options',
  INSTRUCTIONS = 'instructions',
  HIDDEN = 'hidden'
}

export class MenuManager {
  private mainMenu: MainMenu;
  private optionsMenu: OptionsMenu;
  private instructionsMenu: InstructionsMenu;
  private menu3D?: Menu3D;
  private gameOver3D?: GameOver3D;
  private gameOverMenu: GameOverMenu;
  private currentState: MenuState = MenuState.MAIN;
  private onStartGame?: () => void;
  private onRestartGame?: () => void;
  private onReturnToMenu?: () => void;
  private use3DMenu: boolean = false;

  constructor() {
    this.mainMenu = new MainMenu();
    this.optionsMenu = new OptionsMenu();
    this.instructionsMenu = new InstructionsMenu();
    this.gameOverMenu = new GameOverMenu();
    
    this.setupMenuCallbacks();
  }

  /**
   * Set Three.js context to enable 3D menu
   */
  public setThreeJSContext(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer): void {
    this.menu3D = new Menu3D({ scene, camera, renderer });
    this.gameOver3D = new GameOver3D({ scene, camera, renderer });
    this.use3DMenu = true;
    this.setup3DMenuCallbacks();
    console.log('MenuManager: 3D menu context set');
  }

  /**
   * Set up callbacks between menus
   */
  private setupMenuCallbacks(): void {
    // Main menu callbacks
    this.mainMenu.onStartGameCallback(() => {
      this.hideAllMenus();
      this.onStartGame?.();
    });

    this.mainMenu.onOptionsCallback(() => {
      this.showOptions();
    });

    this.mainMenu.onInstructionsCallback(() => {
      this.showInstructions();
    });

    // Options menu callback
    this.optionsMenu.onBackCallback(() => {
      this.showMainMenu();
    });

    // Instructions menu callback
    this.instructionsMenu.onBackCallback(() => {
      this.showMainMenu();
    });

    // Game Over menu callbacks
    this.gameOverMenu.onRestartCallback(() => {
      this.hideAllMenus();
      this.onRestartGame?.();
    });
    this.gameOverMenu.onMainMenuCallback(() => {
      this.hideAllMenus();
      this.onReturnToMenu?.();
    });
  }

  /**
   * Set up callbacks for 3D menu
   */
  private setup3DMenuCallbacks(): void {
    if (!this.menu3D) return;

    this.menu3D.onStartGameCallback(() => {
      console.log('MenuManager: 3D menu start game callback');
      this.hideAllMenus();
      this.onStartGame?.();
    });

    this.menu3D.onOptionsCallback(() => {
      console.log('MenuManager: 3D menu options callback');
      this.showOptions();
    });

    this.menu3D.onInstructionsCallback(() => {
      console.log('MenuManager: 3D menu instructions callback');
      this.showInstructions();
    });
  }

  /**
   * Show the main menu
   */
  public showMainMenu(): void {
    console.log('MenuManager: showMainMenu() called');
    this.hideOtherMenus();
    // Always hide any Game Over overlays when showing main menu
    if (this.gameOver3D) this.gameOver3D.hide();
    this.gameOverMenu.hide();
    
    if (this.use3DMenu && this.menu3D) {
      this.menu3D.show();
      console.log('MenuManager: 3D main menu shown');
    } else {
      this.mainMenu.show();
      console.log('MenuManager: HTML main menu shown');
    }
    
    this.currentState = MenuState.MAIN;
  }

  /**
   * Show the options menu
   */
  public showOptions(): void {
    console.log('MenuManager: showOptions() called');
    this.hideOtherMenus();
    if (this.gameOver3D) this.gameOver3D.hide();
    this.gameOverMenu.hide();
    this.optionsMenu.show();
    this.currentState = MenuState.OPTIONS;
  }

  /**
   * Show the instructions menu
   */
  public showInstructions(): void {
    console.log('MenuManager: showInstructions() called');
    this.hideOtherMenus();
    if (this.gameOver3D) this.gameOver3D.hide();
    this.gameOverMenu.hide();
    this.instructionsMenu.show();
    this.currentState = MenuState.INSTRUCTIONS;
  }

  /**
   * Hide all menus
   */
  public hideAllMenus(): void {
    console.log('MenuManager: hideAllMenus() called');
    this.mainMenu.hide();
    this.optionsMenu.hide();
    this.instructionsMenu.hide();
    
    if (this.menu3D) {
      this.menu3D.hide();
    }
    if (this.gameOver3D) this.gameOver3D.hide();
    this.gameOverMenu.hide();
    
    this.currentState = MenuState.HIDDEN;
  }

  /**
   * Hide other menus (not the one being shown)
   */
  private hideOtherMenus(): void {
    // Only hide menus that are not the target menu
    // This prevents the race condition with hide/show
    this.optionsMenu.hide();
    this.instructionsMenu.hide();
    
    // For 3D menu, we only hide HTML menus since 3D menu replaces main menu
    if (this.use3DMenu) {
      this.mainMenu.hide();
    }
    // Also ensure game over overlays are not visible
    if (this.gameOver3D) this.gameOver3D.hide();
    this.gameOverMenu.hide();
  }

  /**
   * Get current menu state
   */
  public getCurrentState(): MenuState {
    return this.currentState;
  }

  /**
   * Check if any menu is currently visible
   */
  public isMenuVisible(): boolean {
    return this.currentState !== MenuState.HIDDEN;
  }

  /**
   * Set callback for when game should start
   */
  public onStartGameCallback(callback: () => void): void {
    this.onStartGame = callback;
  }

  /**
   * Set callback for restart game (from Game Over)
   */
  public onRestartGameCallback(callback: () => void): void {
    this.onRestartGame = callback;
  }

  /**
   * Set callback for returning to main menu (from Game Over)
   */
  public onReturnToMenuCallback(callback: () => void): void {
    this.onReturnToMenu = callback;
  }

  /**
   * Initialize and show the main menu
   */
  public initialize(): void {
    console.log('MenuManager: initialize() called');
    
    if (this.use3DMenu && this.menu3D) {
      this.menu3D.show();
      console.log('MenuManager: 3D menu initialized and shown');
    } else {
      this.mainMenu.show();
      console.log('MenuManager: HTML menu initialized and shown');
    }
    
    this.currentState = MenuState.MAIN;
    console.log('MenuManager: initialization complete');
  }

  /**
   * Dispose of all menus
   */
  public dispose(): void {
    this.mainMenu.dispose();
    this.optionsMenu.dispose();
    this.instructionsMenu.dispose();
    
    if (this.menu3D) {
      this.menu3D.dispose();
    }
    if (this.gameOver3D) this.gameOver3D.dispose();
    this.gameOverMenu.dispose();
  }

  /**
   * Show a Game Over overlay styled like the main menu
   */
  public showGameOver(stats: { score: number; peopleHit: number; peopleAvoided: number; }): void {
    // Hide only the regular menus, not Game Over overlays
    this.mainMenu.hide();
    this.optionsMenu.hide();
    this.instructionsMenu.hide();
    if (this.menu3D) {
      this.menu3D.hide();
    }
    
    if (this.use3DMenu && this.gameOver3D) {
      this.gameOver3D.setStats(stats);
      this.gameOver3D.onRideAgainCallback(() => this.onRestartGame?.());
      this.gameOver3D.onMainMenuCallback(() => this.onReturnToMenu?.());
      this.gameOver3D.show();
    } else {
      this.gameOverMenu.setStats(stats);
      this.gameOverMenu.show();
    }
    this.currentState = MenuState.MAIN; // reused menu-visible state
  }
}
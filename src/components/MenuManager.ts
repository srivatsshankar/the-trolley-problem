/**
 * MenuManager - Manages all menu states and transitions
 */

import { MainMenu } from './MainMenu';
import { OptionsMenu } from './OptionsMenu';
import { InstructionsMenu } from './InstructionsMenu';

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
  private currentState: MenuState = MenuState.MAIN;
  private onStartGame?: () => void;

  constructor() {
    this.mainMenu = new MainMenu();
    this.optionsMenu = new OptionsMenu();
    this.instructionsMenu = new InstructionsMenu();
    
    this.setupMenuCallbacks();
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
  }

  /**
   * Show the main menu
   */
  public showMainMenu(): void {
    console.log('MenuManager: showMainMenu() called');
    this.hideOtherMenus();
    this.mainMenu.show();
    this.currentState = MenuState.MAIN;
    console.log('MenuManager: Main menu should now be visible');
  }

  /**
   * Show the options menu
   */
  public showOptions(): void {
    console.log('MenuManager: showOptions() called');
    this.hideOtherMenus();
    this.optionsMenu.show();
    this.currentState = MenuState.OPTIONS;
  }

  /**
   * Show the instructions menu
   */
  public showInstructions(): void {
    console.log('MenuManager: showInstructions() called');
    this.hideOtherMenus();
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
   * Initialize and show the main menu
   */
  public initialize(): void {
    console.log('MenuManager: initialize() called');
    // Don't call showMainMenu() which would hide the main menu first
    // Just show it directly
    this.mainMenu.show();
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
  }
}
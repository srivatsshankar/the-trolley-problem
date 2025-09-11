/**
 * MainMenu - Main menu component for the Trolley Problem game
 * Provides Start Ride, Options, and Instructions menu options
 */

export interface MenuOption {
  id: string;
  label: string;
  action: () => void;
}

export class MainMenu {
  private container: HTMLElement;
  private isVisible: boolean = false;
  private onStartGame?: () => void;
  private onShowOptions?: () => void;
  private onShowInstructions?: () => void;
  private hideTimeout?: number;

  constructor() {
    this.container = this.createMenuContainer();
    this.setupEventListeners();
  }

  /**
   * Create the main menu HTML structure
   */
  private createMenuContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'main-menu';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      font-family: 'Arial', sans-serif;
      color: white;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.5s ease-in-out;
    `;

    // Game title
    const title = document.createElement('h1');
    title.textContent = 'The Trolley Problem';
    title.style.cssText = `
      font-size: 3.5rem;
      margin-bottom: 2rem;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      text-align: center;
    `;

    // Subtitle
    const subtitle = document.createElement('p');
    subtitle.textContent = 'A Moral Dilemma Game';
    subtitle.style.cssText = `
      font-size: 1.2rem;
      margin-bottom: 3rem;
      opacity: 0.8;
      text-align: center;
    `;

    // Menu buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 1rem;
      align-items: center;
    `;

    // Create menu buttons
    const startButton = this.createMenuButton('start-ride', 'Start Ride', () => {
      console.log('MainMenu: Start Ride button clicked');
      this.onStartGame?.();
    });

    const optionsButton = this.createMenuButton('options', 'Options', () => {
      console.log('MainMenu: Options button clicked');
      this.onShowOptions?.();
    });

    const instructionsButton = this.createMenuButton('instructions', 'Instructions', () => {
      console.log('MainMenu: Instructions button clicked');
      this.onShowInstructions?.();
    });

    // Assemble the menu
    buttonsContainer.appendChild(startButton);
    buttonsContainer.appendChild(optionsButton);
    buttonsContainer.appendChild(instructionsButton);

    container.appendChild(title);
    container.appendChild(subtitle);
    container.appendChild(buttonsContainer);

    return container;
  }

  /**
   * Create a styled menu button
   */
  private createMenuButton(id: string, text: string, onClick: () => void): HTMLElement {
    const button = document.createElement('button');
    button.id = id;
    button.textContent = text;
    button.style.cssText = `
      background: rgba(255, 255, 255, 0.1);
      border: 2px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 1rem 2rem;
      font-size: 1.1rem;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);
      min-width: 200px;
      text-align: center;
    `;

    // Hover effects
    button.addEventListener('mouseenter', () => {
      button.style.background = 'rgba(255, 255, 255, 0.2)';
      button.style.borderColor = 'rgba(255, 255, 255, 0.6)';
      button.style.transform = 'translateY(-2px)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = 'rgba(255, 255, 255, 0.1)';
      button.style.borderColor = 'rgba(255, 255, 255, 0.3)';
      button.style.transform = 'translateY(0)';
    });

    button.addEventListener('click', onClick);

    return button;
  }

  /**
   * Set up keyboard event listeners
   */
  private setupEventListeners(): void {
    // Temporarily disabled keyboard shortcuts to debug menu disappearing issue
    /*
    document.addEventListener('keydown', (event) => {
      if (!this.isVisible) return;

      console.log('MainMenu: Key pressed:', event.key);

      switch (event.key) {
        case 'Enter':
        case ' ':
          console.log('MainMenu: Enter/Space pressed, starting game');
          this.onStartGame?.();
          break;
        case 'Escape':
          // Could be used to exit or go back
          console.log('MainMenu: Escape pressed');
          break;
      }
    });
    */
  }

  /**
   * Show the main menu
   */
  public show(): void {
    console.log('MainMenu: show() called');
    
    // Clear any pending hide timeout
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = undefined;
      console.log('MainMenu: cleared pending hide timeout');
    }
    
    if (!this.container.parentElement) {
      document.body.appendChild(this.container);
      console.log('MainMenu: container added to body');
    }
    
    // Set visible immediately to prevent race conditions
    this.isVisible = true;
    
    // Trigger fade in
    setTimeout(() => {
      if (this.isVisible) { // Only set opacity if still supposed to be visible
        this.container.style.opacity = '1';
        console.log('MainMenu: opacity set to 1');
      }
    }, 50);
    
    console.log('MainMenu: isVisible set to true');
  }

  /**
   * Hide the main menu
   */
  public hide(): void {
    console.log('MainMenu: hide() called');
    this.isVisible = false;
    this.container.style.opacity = '0';
    
    // Clear any existing timeout
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
    
    this.hideTimeout = window.setTimeout(() => {
      if (!this.isVisible && this.container.parentElement) {
        this.container.parentElement.removeChild(this.container);
        console.log('MainMenu: container removed from body');
      }
      this.hideTimeout = undefined;
    }, 500);
    
    console.log('MainMenu: isVisible set to false');
  }

  /**
   * Set callback for start game action
   */
  public onStartGameCallback(callback: () => void): void {
    this.onStartGame = callback;
  }

  /**
   * Set callback for options action
   */
  public onOptionsCallback(callback: () => void): void {
    this.onShowOptions = callback;
  }

  /**
   * Set callback for instructions action
   */
  public onInstructionsCallback(callback: () => void): void {
    this.onShowInstructions = callback;
  }

  /**
   * Check if menu is currently visible
   */
  public isMenuVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Dispose of the menu and clean up
   */
  public dispose(): void {
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
    this.isVisible = false;
  }
}
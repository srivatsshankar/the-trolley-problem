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
    // Ensure shared 3D button styles are present before building DOM
    this.ensure3DButtonStyles();
    this.container = this.createMenuContainer();
    this.setupEventListeners();
  }

  /**
   * Inject a single <style> tag with 3D button classes (thickness + edge visibility)
   * so we can use pseudo-elements for extrusion which inline styles can't provide.
   */
  private ensure3DButtonStyles(): void {
    if (document.getElementById('menu-3d-styles')) return;
    const style = document.createElement('style');
    style.id = 'menu-3d-styles';
    style.textContent = `
      .menu-button-3d {
        /* Base 3D setup */
        transform-style: preserve-3d;
      }
      /* Gentle vertical bobbing wrapper */
      @keyframes menuButtonBob {
        0%, 10% { transform: translateY(0); }
        50% { transform: translateY(var(--bob-distance, 12px)); }
        90%, 100% { transform: translateY(0); }
      }
      .menu-button-bob {
        --bob-distance: 12px; /* Adjust amplitude here */
        animation: menuButtonBob 4.4s cubic-bezier(.42,.0,.58,1) infinite;
        will-change: transform;
        display: inline-block;
        perspective: 1400px; /* retain depth context */
        transform: translateZ(0); /* promote layer */
      }
      /* Pause animation while interacting */
      .menu-button-bob:hover, .menu-button-bob:focus-within { animation-play-state: paused; }
      /* Respect reduced motion */
      @media (prefers-reduced-motion: reduce) { .menu-button-bob { animation: none; } }
      /* Simulated thickness (the back face) */
      .menu-button-3d::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: linear-gradient(165deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 70%);
        transform: translateZ(-14px); /* Thickness depth */
        box-shadow: 0 0 0 1px rgba(255,255,255,0.07), inset 0 6px 10px rgba(0,0,0,0.55);
        pointer-events: none;
      }
      /* Subtle edge highlight / face sheen */
      .menu-button-3d::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: linear-gradient(to bottom, rgba(255,255,255,0.35), rgba(255,255,255,0));
        mix-blend-mode: overlay;
        pointer-events: none;
        transform: translateZ(2px);
        opacity: 0.7;
      }
      /* Optional: focus ring with depth */
      .menu-button-3d:focus-visible {
        outline: none;
        box-shadow: 0 0 0 3px rgba(255,255,255,0.55), 0 0 0 6px rgba(64,64,64,0.55);
      }
      
      /* Responsive Design for Mobile and Tablets */
      @media (max-width: 768px) {
        .menu-button-bob {
          --bob-distance: 8px; /* Reduce animation amplitude for mobile */
        }
      }
      
      @media (max-width: 480px) {
        .menu-button-bob {
          --bob-distance: 6px; /* Further reduce for small phones */
        }
      }
    `;
    document.head.appendChild(style);
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
      perspective: 1200px;
      padding: 20px;
      box-sizing: border-box;
    `;

    // Game title - responsive sizing
    const title = document.createElement('h1');
    title.textContent = 'The Trolley Problem';
    title.style.cssText = `
      font-size: clamp(2.4rem, 9vw, 4rem);
      margin-bottom: clamp(1.2rem, 5vw, 2.4rem);
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      text-align: center;
      line-height: 1.2;
      padding: 0 20px;
    `;

    // Subtitle - responsive sizing
    const subtitle = document.createElement('p');
        subtitle.textContent = 'A Moral Dilemma Game';
        subtitle.style.cssText = `
          font-size: clamp(1.1rem, 3.8vw, 1.4rem);
          margin-bottom: clamp(4.6rem, 12vw, 7.2rem); /* increased space between subtitle and buttons */
      opacity: 0.8;
      text-align: center;
      padding: 0 20px;
    `;

    // Menu buttons container - responsive layout
    const buttonsContainer = document.createElement('div');
        buttonsContainer.style.cssText = `
          display: flex;
          flex-direction: column;
          gap: clamp(3rem, 9vw, 4.6rem); /* noticeably increased gap between buttons */
      align-items: center;
      width: 100%;
      max-width: 520px;
      padding: 0 16px; /* slightly more breathing room on very small screens */
      box-sizing: border-box;
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
    // Wrapper to isolate bobbing animation from button's complex 3D transform
    const wrapper = document.createElement('div');
    wrapper.className = 'menu-button-bob';
    // Stagger animation start slightly for subtle desynchronization
    wrapper.style.animationDelay = (Math.random() * 2).toFixed(2) + 's';

    const button = document.createElement('button');
    button.id = id;
    button.textContent = text;
    button.style.cssText = `
      background: linear-gradient(160deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 60%, rgba(255,255,255,0.02) 100%);
      border: 2px solid rgba(255, 255, 255, 0.35);
      color: #fff;
      padding: clamp(1.2rem, 5vw, 1.8rem) clamp(2.2rem, 8vw, 3.2rem);
      font-size: clamp(1.3rem, 4.5vw, 1.9rem);
      border-radius: clamp(12px, 2.6vw, 18px);
      cursor: pointer;
      transition: transform 0.34s cubic-bezier(.22,1.15,.62,1), box-shadow 0.34s ease, background 0.34s ease, filter 0.34s ease, border-color 0.34s ease;
      backdrop-filter: blur(14px) brightness(1.05);
      min-width: clamp(280px, 85vw, 420px);
  width: 100%;
      max-width: 520px;
      text-align: center;
      position: relative;
      transform-style: preserve-3d;
      will-change: transform, box-shadow;
      transform: rotateX(6deg) rotateY(-4deg) translateZ(clamp(28px, 5vw, 52px)) translateY(clamp(-10px, -3vw, -18px)) scale(1.06);
      box-shadow: 0 8px 14px -2px rgba(0,0,0,0.42), 0 18px 28px -8px rgba(0,0,0,0.5), 0 36px 54px -14px rgba(0,0,0,0.55), inset 0 3px 5px rgba(255,255,255,0.2), inset 0 -5px 10px rgba(0,0,0,0.4);
      letter-spacing: 0.5px;
      backdrop-filter: blur(14px) saturate(130%) brightness(1.05);
    `;
    button.classList.add('menu-button-3d');

    // Add a subtle sheen pseudo-element
    const sheen = document.createElement('span');
    sheen.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      border-radius: inherit;
      background: radial-gradient(circle at 30% 20%, rgba(255,255,255,0.35), rgba(255,255,255,0) 60%);
      mix-blend-mode: screen;
      opacity: 0.9;
      transition: opacity 0.4s ease;
    `;
    button.appendChild(sheen);

    // Hover effects - responsive transforms
    button.addEventListener('mouseenter', () => {
      button.style.background = 'linear-gradient(155deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.12) 55%, rgba(255,255,255,0.05) 100%)';
      button.style.borderColor = 'rgba(255, 255, 255, 0.75)';
      button.style.transform = `rotateX(6deg) rotateY(-4deg) translateZ(${window.innerWidth < 768 ? '36px' : '56px'}) translateY(${window.innerWidth < 768 ? '-10px' : '-18px'}) scale(1.08)`;
      button.style.boxShadow = '0 14px 20px -6px rgba(0,0,0,0.5), 0 30px 50px -10px rgba(0,0,0,0.6), 0 60px 96px -18px rgba(0,0,0,0.65), inset 0 4px 8px rgba(255,255,255,0.25), inset 0 -6px 14px rgba(0,0,0,0.48)';
      sheen.style.opacity = '1';
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = 'linear-gradient(160deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 60%, rgba(255,255,255,0.02) 100%)';
      button.style.borderColor = 'rgba(255, 255, 255, 0.35)';
      button.style.transform = `rotateX(10deg) rotateY(-8deg) translateZ(${window.innerWidth < 768 ? '24px' : '34px'}) translateY(${window.innerWidth < 768 ? '-6px' : '-8px'}) scale(1)`;
      button.style.boxShadow = '0 8px 14px -2px rgba(0,0,0,0.42), 0 18px 28px -8px rgba(0,0,0,0.5), 0 36px 54px -14px rgba(0,0,0,0.55), inset 0 3px 5px rgba(255,255,255,0.2), inset 0 -5px 10px rgba(0,0,0,0.4)';
      sheen.style.opacity = '0.9';
    });

    // On very small screens, let buttons fill width for maximum size
    if (window.innerWidth <= 420) {
      button.style.maxWidth = '100%';
    }

    button.addEventListener('click', onClick);
    wrapper.appendChild(button);
    return wrapper;
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
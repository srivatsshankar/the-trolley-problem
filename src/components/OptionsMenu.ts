/**
 * OptionsMenu - Options/settings menu for the game
 */

export class OptionsMenu {
  private container: HTMLElement;
  private isVisible: boolean = false;
  private onBack?: () => void;

  constructor() {
    this.container = this.createOptionsContainer();
  }

  private createOptionsContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'options-menu';
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

    // Title
    const title = document.createElement('h2');
    title.textContent = 'Options';
    title.style.cssText = `
      font-size: 2.5rem;
      margin-bottom: 2rem;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    `;

    // Options container
    const optionsContainer = document.createElement('div');
    optionsContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 2rem;
      min-width: 300px;
    `;

    // Sound option
    const soundOption = this.createOption('Sound Effects', true);
    const musicOption = this.createOption('Background Music', true);
    const difficultyOption = this.createSelectOption('Difficulty', ['Easy', 'Normal', 'Hard'], 'Normal');

    optionsContainer.appendChild(soundOption);
    optionsContainer.appendChild(musicOption);
    optionsContainer.appendChild(difficultyOption);

    // Back button
    const backButton = this.createButton('Back to Menu', () => {
      this.onBack?.();
    });

    container.appendChild(title);
    container.appendChild(optionsContainer);
    container.appendChild(backButton);

    return container;
  }

  private createOption(label: string, defaultValue: boolean): HTMLElement {
    const optionDiv = document.createElement('div');
    optionDiv.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    `;

    const labelSpan = document.createElement('span');
    labelSpan.textContent = label;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = defaultValue;
    checkbox.style.cssText = `
      transform: scale(1.2);
      cursor: pointer;
    `;

    optionDiv.appendChild(labelSpan);
    optionDiv.appendChild(checkbox);

    return optionDiv;
  }

  private createSelectOption(label: string, options: string[], defaultValue: string): HTMLElement {
    const optionDiv = document.createElement('div');
    optionDiv.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    `;

    const labelSpan = document.createElement('span');
    labelSpan.textContent = label;

    const select = document.createElement('select');
    select.style.cssText = `
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 4px;
      padding: 0.25rem;
      cursor: pointer;
    `;

    options.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option;
      optionElement.textContent = option;
      optionElement.selected = option === defaultValue;
      optionElement.style.color = 'black';
      select.appendChild(optionElement);
    });

    optionDiv.appendChild(labelSpan);
    optionDiv.appendChild(select);

    return optionDiv;
  }

  private createButton(text: string, onClick: () => void): HTMLElement {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.cssText = `
      background: linear-gradient(160deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 60%, rgba(255,255,255,0.02) 100%);
      border: 2px solid rgba(255, 255, 255, 0.35);
      color: #fff;
      padding: 1rem 2.2rem;
      font-size: 1.12rem;
      border-radius: 14px;
      cursor: pointer;
      transition: transform 0.28s cubic-bezier(.22,1.15,.62,1), box-shadow 0.28s ease, background 0.28s ease, filter 0.28s ease, border-color 0.28s ease;
      backdrop-filter: blur(14px) brightness(1.05);
      position: relative;
      transform-style: preserve-3d;
      will-change: transform, box-shadow;
      transform: translateZ(16px) translateY(-6px);
      box-shadow:
        0 4px 6px -2px rgba(0,0,0,0.35),
        0 10px 18px -4px rgba(0,0,0,0.45),
        0 24px 38px -10px rgba(0,0,0,0.5),
        inset 0 2px 4px rgba(255,255,255,0.2),
        inset 0 -3px 6px rgba(0,0,0,0.35);
    `;

    const sheen = document.createElement('span');
    sheen.style.cssText = `
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none;
      border-radius: inherit;
      background: radial-gradient(circle at 30% 20%, rgba(255,255,255,0.35), rgba(255,255,255,0) 60%);
      mix-blend-mode: screen;
      opacity: 0.9;
      transition: opacity 0.4s ease;
    `;
    button.appendChild(sheen);

    button.addEventListener('mouseenter', () => {
      button.style.background = 'linear-gradient(155deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.12) 55%, rgba(255,255,255,0.05) 100%)';
      button.style.borderColor = 'rgba(255, 255, 255, 0.75)';
      button.style.transform = 'translateZ(30px) translateY(-12px) scale(1.03)';
      button.style.boxShadow = '0 10px 12px -4px rgba(0,0,0,0.45), 0 20px 34px -6px rgba(0,0,0,0.55), 0 42px 68px -14px rgba(0,0,0,0.6), inset 0 3px 6px rgba(255,255,255,0.25), inset 0 -4px 10px rgba(0,0,0,0.45)';
      sheen.style.opacity = '1';
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = 'linear-gradient(160deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 60%, rgba(255,255,255,0.02) 100%)';
      button.style.borderColor = 'rgba(255, 255, 255, 0.35)';
      button.style.transform = 'translateZ(16px) translateY(-6px) scale(1)';
      button.style.boxShadow = '0 4px 6px -2px rgba(0,0,0,0.35), 0 10px 18px -4px rgba(0,0,0,0.45), 0 24px 38px -10px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.2), inset 0 -3px 6px rgba(0,0,0,0.35)';
      sheen.style.opacity = '0.9';
    });

    button.addEventListener('click', onClick);

    return button;
  }

  public show(): void {
    if (!this.container.parentElement) {
      document.body.appendChild(this.container);
    }
    
    setTimeout(() => {
      this.container.style.opacity = '1';
    }, 50);
    
    this.isVisible = true;
  }

  public isMenuVisible(): boolean {
    return this.isVisible;
  }

  public hide(): void {
    this.container.style.opacity = '0';
    
    setTimeout(() => {
      if (this.container.parentElement) {
        this.container.parentElement.removeChild(this.container);
      }
    }, 500);
    
    this.isVisible = false;
  }

  public onBackCallback(callback: () => void): void {
    this.onBack = callback;
  }

  public dispose(): void {
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
    this.isVisible = false;
  }
}
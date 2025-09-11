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
      background: rgba(255, 255, 255, 0.1);
      border: 2px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 1rem 2rem;
      font-size: 1.1rem;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);
    `;

    button.addEventListener('mouseenter', () => {
      button.style.background = 'rgba(255, 255, 255, 0.2)';
      button.style.borderColor = 'rgba(255, 255, 255, 0.6)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = 'rgba(255, 255, 255, 0.1)';
      button.style.borderColor = 'rgba(255, 255, 255, 0.3)';
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
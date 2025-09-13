/**
 * InstructionsMenu - Instructions/how to play menu for the game
 */

export class InstructionsMenu {
  private container: HTMLElement;
  private isVisible: boolean = false;
  private onBack?: () => void;

  constructor() {
    this.container = this.createInstructionsContainer();
  }

  private createInstructionsContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'instructions-menu';
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
      overflow-y: auto;
      padding: 2rem;
      box-sizing: border-box;
    `;

    // Title
    const title = document.createElement('h2');
    title.textContent = 'How to Play';
    title.style.cssText = `
      font-size: 2.5rem;
      margin-bottom: 2rem;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      text-align: center;
    `;

    // Instructions content
    const contentContainer = document.createElement('div');
    contentContainer.style.cssText = `
      max-width: 600px;
      background: rgba(255, 255, 255, 0.1);
      padding: 2rem;
      border-radius: 12px;
      backdrop-filter: blur(10px);
      margin-bottom: 2rem;
      line-height: 1.6;
    `;

    const instructions = [
      {
        title: 'The Trolley Problem',
        content: 'You are in control of a runaway trolley speeding down the tracks. Ahead, you see people on the tracks who will be harmed if you do nothing.'
      },
      {
        title: 'Your Choice',
        content: 'You can pull a lever to divert the trolley to a different track, but this track also has people on it. You must make a split-second moral decision.'
      },
      {
        title: 'Controls',
        content: 'Use your mouse to click the lever when you want to switch tracks. You have limited time to make your decision before the trolley reaches the people.'
      },
      {
        title: 'Moral Dilemma',
        content: 'There is no "right" answer. This game explores the philosophical question: Is it morally acceptable to actively cause harm to prevent greater harm?'
      }
    ];

    instructions.forEach(instruction => {
      const section = document.createElement('div');
      section.style.marginBottom = '1.5rem';

      const sectionTitle = document.createElement('h3');
      sectionTitle.textContent = instruction.title;
      sectionTitle.style.cssText = `
        font-size: 1.3rem;
        margin-bottom: 0.5rem;
        color: #FFD700;
      `;

      const sectionContent = document.createElement('p');
      sectionContent.textContent = instruction.content;
      sectionContent.style.cssText = `
        margin: 0;
        opacity: 0.9;
      `;

      section.appendChild(sectionTitle);
      section.appendChild(sectionContent);
      contentContainer.appendChild(section);
    });

    // Back button
    const backButton = this.createButton('Back to Menu', () => {
      this.onBack?.();
    });

    container.appendChild(title);
    container.appendChild(contentContainer);
    container.appendChild(backButton);

    return container;
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
      position: absolute; top:0; left:0; width:100%; height:100%;
      pointer-events:none; border-radius:inherit;
      background: radial-gradient(circle at 30% 20%, rgba(255,255,255,0.35), rgba(255,255,255,0) 60%);
      mix-blend-mode: screen; opacity:0.9; transition: opacity 0.4s ease;
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
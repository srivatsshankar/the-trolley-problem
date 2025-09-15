/**
 * GameOverMenu - An overlay menu shown when the game ends
 * Styled to match MainMenu with 3D buttons and a centered panel.
 */

export interface GameOverStats {
  score: number;
  peopleHit: number;
  peopleAvoided: number;
}

export class GameOverMenu {
  private container: HTMLElement;
  private isVisible = false;
  private onRestart?: () => void;
  private onMainMenu?: () => void;

  private scoreEl!: HTMLParagraphElement;
  private hitEl!: HTMLParagraphElement;
  private avoidedEl!: HTMLParagraphElement;
  private hideTimeout?: number;

  constructor() {
    this.ensure3DButtonStyles();
    this.container = this.createContainer();
  }

  private ensure3DButtonStyles(): void {
    if (document.getElementById('menu-3d-styles')) return;
    const style = document.createElement('style');
    style.id = 'menu-3d-styles';
    style.textContent = `
      .menu-button-3d { transform-style: preserve-3d; }
      @keyframes menuButtonBob { 0%,10%{transform:translateY(0);} 50%{transform:translateY(var(--bob-distance,12px));} 90%,100%{transform:translateY(0);} }
      .menu-button-bob { --bob-distance: 12px; animation: menuButtonBob 4.4s cubic-bezier(.42,.0,.58,1) infinite; will-change: transform; display:inline-block; perspective:1400px; transform: translateZ(0); }
      .menu-button-bob:hover, .menu-button-bob:focus-within { animation-play-state: paused; }
      @media (prefers-reduced-motion: reduce) { .menu-button-bob { animation: none; } }
      .menu-button-3d::before { content:''; position:absolute; inset:0; border-radius:inherit; background:linear-gradient(165deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 70%); transform: translateZ(-14px); box-shadow: 0 0 0 1px rgba(255,255,255,0.07), inset 0 6px 10px rgba(0,0,0,0.55); pointer-events:none; }
      .menu-button-3d::after { content:''; position:absolute; inset:0; border-radius:inherit; background: linear-gradient(to bottom, rgba(255,255,255,0.35), rgba(255,255,255,0)); mix-blend-mode: overlay; pointer-events:none; transform: translateZ(2px); opacity:0.7; }
      .menu-button-3d:focus-visible { outline:none; box-shadow: 0 0 0 3px rgba(255,255,255,0.55), 0 0 0 6px rgba(64,64,64,0.55); }
      @media (max-width:768px){ .menu-button-bob{ --bob-distance: 8px; } }
      @media (max-width:480px){ .menu-button-bob{ --bob-distance: 6px; } }
    `;
    document.head.appendChild(style);
  }

  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'game-over-menu';
    container.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh; height: 100dvh;
      display: flex; flex-direction: column; justify-content: center; align-items: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff; font-family: Arial, sans-serif; z-index: 1001; opacity: 0; transition: opacity .4s ease-in-out;
      padding: 20px; box-sizing: border-box;
    `;

    const title = document.createElement('h1');
    title.textContent = 'Game Over';
    title.style.cssText = `
      font-size: clamp(2.2rem, 8.5vw, 3.6rem);
      margin-bottom: clamp(0.8rem, 3vw, 1.2rem);
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      text-align: center;
    `;

    const subtitle = document.createElement('p');
    subtitle.textContent = 'Thank you for riding';
    subtitle.style.cssText = `
      font-size: clamp(1rem, 3.2vw, 1.2rem);
      opacity: .85; margin-bottom: clamp(2.2rem, 6vw, 3rem);
      display:inline-block; animation: menuButtonBob 4.4s cubic-bezier(.42,.0,.58,1) infinite;
    `;

    // Stats
    const stats = document.createElement('div');
    stats.style.cssText = `
      display:flex; flex-direction: column; gap: .4rem; align-items: center;
      margin-bottom: clamp(2.2rem, 6vw, 3rem);
    `;
    this.scoreEl = document.createElement('p');
    this.hitEl = document.createElement('p');
    this.avoidedEl = document.createElement('p');
    [this.scoreEl, this.hitEl, this.avoidedEl].forEach(p => {
      p.style.cssText = 'margin: 0; font-size: clamp(1.1rem, 3.4vw, 1.4rem);';
    });
    this.scoreEl.textContent = 'Final Score: 0';
    this.hitEl.textContent = 'People Hit: 0';
    this.avoidedEl.textContent = 'People Avoided: 0';
    this.hitEl.style.color = '#4A90E2';
    this.avoidedEl.style.color = '#E24A4A';
    stats.append(this.scoreEl, this.hitEl, this.avoidedEl);

    const buttons = document.createElement('div');
    buttons.style.cssText = `display:flex; flex-direction: column; gap: clamp(1rem, 3vw, 1.4rem); align-items:center; width:100%; max-width:520px;`;

  const restartBtn = this.createButton('Ride Again', () => this.onRestart?.());
    const menuBtn = this.createButton('Main Menu', () => this.onMainMenu?.());
    buttons.append(restartBtn, menuBtn);

    container.append(title, subtitle, stats, buttons);
    return container;
  }

  private createButton(text: string, onClick: () => void): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'menu-button-bob';
    wrapper.style.animationDelay = (Math.random() * 2).toFixed(2) + 's';

    const btn = document.createElement('button');
    btn.textContent = text;
    btn.classList.add('menu-button-3d');
    btn.style.cssText = `
      background: linear-gradient(160deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 60%, rgba(255,255,255,0.02) 100%);
      border: 2px solid rgba(255,255,255,0.35);
      color: #fff;
      padding: clamp(1.2rem, 5vw, 1.8rem) clamp(2.2rem, 8vw, 3.2rem);
      font-size: clamp(1.2rem, 4.2vw, 1.6rem);
      border-radius: clamp(12px, 2.6vw, 18px);
      cursor: pointer; min-width: clamp(260px, 82vw, 420px); width:100%; max-width:520px;
      position: relative; transform-style: preserve-3d; will-change: transform, box-shadow;
      transform: rotateX(6deg) rotateY(-4deg) translateZ(clamp(24px, 5vw, 48px)) translateY(clamp(-8px, -3vw, -16px)) scale(1.04);
      box-shadow: 0 8px 14px -2px rgba(0,0,0,0.42), 0 18px 28px -8px rgba(0,0,0,0.5), 0 36px 54px -14px rgba(0,0,0,0.55), inset 0 3px 5px rgba(255,255,255,0.2), inset 0 -5px 10px rgba(0,0,0,0.4);
    `;

    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'linear-gradient(155deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.12) 55%, rgba(255,255,255,0.05) 100%)';
      btn.style.borderColor = 'rgba(255,255,255,0.75)';
      btn.style.transform = `rotateX(6deg) rotateY(-4deg) translateZ(${window.innerWidth < 768 ? '34px' : '52px'}) translateY(${window.innerWidth < 768 ? '-10px' : '-18px'}) scale(1.07)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'linear-gradient(160deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 60%, rgba(255,255,255,0.02) 100%)';
      btn.style.borderColor = 'rgba(255,255,255,0.35)';
      btn.style.transform = `rotateX(6deg) rotateY(-4deg) translateZ(${window.innerWidth < 768 ? '24px' : '34px'}) translateY(${window.innerWidth < 768 ? '-6px' : '-8px'}) scale(1)`;
    });

    btn.addEventListener('click', onClick);
    wrapper.appendChild(btn);
    return wrapper;
  }

  public setStats(stats: GameOverStats): void {
    this.scoreEl.textContent = `Final Score: ${stats.score}`;
    this.hitEl.textContent = `People Hit: ${stats.peopleHit}`;
    this.avoidedEl.textContent = `People Avoided: ${stats.peopleAvoided}`;
  }

  public onRestartCallback(cb: () => void): void { this.onRestart = cb; }
  public onMainMenuCallback(cb: () => void): void { this.onMainMenu = cb; }

  public show(): void {
    if (!this.container.parentElement) document.body.appendChild(this.container);
    if (this.hideTimeout) { clearTimeout(this.hideTimeout); this.hideTimeout = undefined; }
    this.isVisible = true;
    requestAnimationFrame(() => { this.container.style.opacity = '1'; });
  }

  public hide(): void {
    this.isVisible = false;
    this.container.style.opacity = '0';
    if (this.hideTimeout) clearTimeout(this.hideTimeout);
    this.hideTimeout = window.setTimeout(() => {
      if (!this.isVisible && this.container.parentElement) {
        this.container.parentElement.removeChild(this.container);
      }
      this.hideTimeout = undefined;
    }, 400);
  }

  public dispose(): void {
    if (this.container.parentElement) this.container.parentElement.removeChild(this.container);
    this.isVisible = false;
  }
}

/**
 * ScoreDisplay - UI component for displaying the current score
 * Matches the styling of the main menu buttons with white text and black border
 */

export interface ScoreDisplayConfig {
    topMargin: number;
    leftMargin: number;
    fontSize: number;
    padding: number;
}

export class ScoreDisplay {
    private config: ScoreDisplayConfig;
    private container: HTMLElement;
    private scoreElement: HTMLElement;
    private currentScore: number = 0;
    private fontLoaded: boolean = false;
    private temporaryElements: HTMLElement[] = [];

    constructor(config: ScoreDisplayConfig) {
        this.config = config;

        // Initialize elements immediately with default styling
        this.container = this.createContainer();
        this.scoreElement = this.createScoreElement();
        this.container.appendChild(this.scoreElement);

        // Load font asynchronously and update styling when ready
        this.loadMinecraftFont().finally(() => {
            this.updateFontStyling();
        });

        console.log('[ScoreDisplay] Created with config:', config);
    }

    /**
     * Attempt to load the Minecraft font to match button styling
     */
    private async loadMinecraftFont(): Promise<void> {
        try {
            // Guard for test/jsdom environments
            const AnyWindow: any = window as any;
            if (typeof AnyWindow.FontFace !== 'function') {
                return;
            }
            const font = new AnyWindow.FontFace('Minecraft', 'url(./assets/fonts/Minecraft.ttf)');
            await font.load();
            (document as any).fonts.add(font);
            this.fontLoaded = true;
        } catch {
            // Non-fatal; fallback system font will be used
            this.fontLoaded = false;
        }
    }

    /**
     * Create the main container for the score display
     */
    private createContainer(): HTMLElement {
        const container = document.createElement('div');
        container.id = 'score-display';
        container.className = 'ui-element';

        // Position at top left of screen
        container.style.cssText = `
            position: absolute;
            top: ${this.config.topMargin}px;
            left: ${this.config.leftMargin}px;
            z-index: 200;
            pointer-events: none;
        `;

        return container;
    }

    /**
     * Create the score text element with button-matching styling
     */
    private createScoreElement(): HTMLElement {
        const scoreElement = document.createElement('div');
        scoreElement.id = 'score-text';
        scoreElement.textContent = 'Score: 0';

        // Style to match the main menu buttons - white text with black border/shadow
        this.applyScoreElementStyling(scoreElement);

        return scoreElement;
    }

    /**
     * Apply styling to the score element
     */
    private applyScoreElementStyling(element: HTMLElement): void {
        element.style.cssText = `
            color: #ffffff;
            font-size: ${this.config.fontSize}px;
            font-family: ${this.fontLoaded ? 'Minecraft, Arial, sans-serif' : 'Arial, sans-serif'};
            font-weight: 700;
            padding: ${this.config.padding}px;
            text-shadow: 
                -2px -2px 0 #000000,
                2px -2px 0 #000000,
                -2px 2px 0 #000000,
                2px 2px 0 #000000,
                0 0 4px rgba(0, 0, 0, 0.8);
            user-select: none;
            letter-spacing: 0.5px;
            background: transparent;
        `;
    }

    /**
     * Update font styling after font is loaded
     */
    private updateFontStyling(): void {
        if (this.scoreElement) {
            this.applyScoreElementStyling(this.scoreElement);
        }
    }

    /**
     * Update the displayed score
     */
    public updateScore(score: number): void {
        if (this.currentScore !== score) {
            this.currentScore = score;
            if (this.scoreElement) {
                this.scoreElement.textContent = `Score: ${score}`;
            }
        }
    }

    /**
     * Show section completion score changes - both hit and avoided simultaneously
     * Displays at bottom right of score box
     */
    public showSectionCompletion(peopleHit: number, peopleAvoided: number): void {
        if (peopleHit <= 0 && peopleAvoided <= 0) return;



        // Show people hit (blue, negative) if any
        if (peopleHit > 0) {
            const hitElement = document.createElement('div');
            hitElement.textContent = `-${peopleHit}`;
            hitElement.style.cssText = `
                position: absolute;
                top: ${this.config.fontSize + 10}px;
                right: 0;
                color: #4169E1;
                font-size: ${this.config.fontSize * 0.8}px;
                font-family: ${this.fontLoaded ? 'Minecraft, Arial, sans-serif' : 'Arial, sans-serif'};
                font-weight: 700;
                text-shadow: 
                    -1px -1px 0 #000000,
                    1px -1px 0 #000000,
                    -1px 1px 0 #000000,
                    1px 1px 0 #000000;
                user-select: none;
                pointer-events: none;
                animation: scoreChange 3s ease-out forwards;
            `;
            this.addTemporaryElement(hitElement);
        }

        // Show people avoided (red, positive) if any - positioned slightly to the left of hit
        if (peopleAvoided > 0) {
            const avoidedElement = document.createElement('div');
            avoidedElement.textContent = `+${peopleAvoided}`;
            avoidedElement.style.cssText = `
                position: absolute;
                top: ${this.config.fontSize + 10}px;
                right: ${peopleHit > 0 ? '40px' : '0'};
                color: #FF4444;
                font-size: ${this.config.fontSize * 0.8}px;
                font-family: ${this.fontLoaded ? 'Minecraft, Arial, sans-serif' : 'Arial, sans-serif'};
                font-weight: 700;
                text-shadow: 
                    -1px -1px 0 #000000,
                    1px -1px 0 #000000,
                    -1px 1px 0 #000000,
                    1px 1px 0 #000000;
                user-select: none;
                pointer-events: none;
                animation: scoreChange 3s ease-out forwards;
            `;
            this.addTemporaryElement(avoidedElement);
        }
    }

    /**
     * @deprecated Use showSectionCompletion instead
     */
    public showPeopleHit(_count: number): void {
        // Keep for backward compatibility but don't use
        console.warn('showPeopleHit is deprecated, use showSectionCompletion instead');
    }

    /**
     * @deprecated Use showSectionCompletion instead
     */
    public showPeopleAvoided(_count: number): void {
        // Keep for backward compatibility but don't use
        console.warn('showPeopleAvoided is deprecated, use showSectionCompletion instead');
    }

    /**
     * Add temporary element with animation and auto-cleanup
     */
    private addTemporaryElement(element: HTMLElement): void {
        // Add CSS animation if not already defined
        if (!document.getElementById('score-change-animation')) {
            const style = document.createElement('style');
            style.id = 'score-change-animation';
            style.textContent = `
                @keyframes scoreChange {
                    0% {
                        opacity: 1;
                        transform: translateY(0px);
                    }
                    50% {
                        opacity: 1;
                        transform: translateY(-10px);
                    }
                    100% {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                }
            `;
            document.head.appendChild(style);
        }

        this.container.appendChild(element);
        this.temporaryElements.push(element);

        // Remove element after animation completes
        setTimeout(() => {
            if (element.parentElement) {
                element.parentElement.removeChild(element);
            }
            const index = this.temporaryElements.indexOf(element);
            if (index > -1) {
                this.temporaryElements.splice(index, 1);
            }
        }, 3000); // Increased to 3 seconds to match animation
    }

    /**
     * Get the current displayed score
     */
    public getCurrentScore(): number {
        return this.currentScore;
    }

    /**
     * Add the score display to the DOM
     */
    public mount(parentElement?: HTMLElement): void {
        const parent = parentElement || document.getElementById('ui-overlay');
        if (!parent) {
            throw new Error('Cannot mount ScoreDisplay: parent element not found');
        }

        parent.appendChild(this.container);
        console.log('[ScoreDisplay] Mounted to DOM');
    }

    /**
     * Remove the score display from the DOM
     */
    public unmount(): void {
        if (this.container && this.container.parentElement) {
            this.container.parentElement.removeChild(this.container);
            console.log('[ScoreDisplay] Unmounted from DOM');
        }
    }

    /**
     * Show the score display
     */
    public show(): void {
        if (this.container) {
            this.container.style.display = 'block';
        }
    }

    /**
     * Hide the score display
     */
    public hide(): void {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    /**
     * Set the visibility of the score display
     */
    public setVisible(visible: boolean): void {
        if (visible) {
            this.show();
        } else {
            this.hide();
        }
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        // Clean up temporary elements
        this.temporaryElements.forEach(element => {
            if (element.parentElement) {
                element.parentElement.removeChild(element);
            }
        });
        this.temporaryElements = [];

        this.unmount();
        console.log('[ScoreDisplay] Disposed');
    }
}

/**
 * Default configuration for ScoreDisplay
 */
export const DEFAULT_SCORE_DISPLAY_CONFIG: ScoreDisplayConfig = {
    topMargin: 20,
    leftMargin: 20,
    fontSize: 24,
    padding: 12
};
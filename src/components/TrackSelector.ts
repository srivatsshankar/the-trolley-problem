/**
 * TrackSelector - UI component for track selection buttons
 * Implements requirements: 4.1, 4.2, 2.4
 */

export interface TrackSelectorConfig {
    trackCount: number;
    buttonWidth: number;
    buttonHeight: number;
    buttonSpacing: number;
    bottomMargin: number;
}

export interface TrackButton {
    element: HTMLButtonElement;
    trackNumber: number;
    isSelected: boolean;
}

export class TrackSelector {
    private config: TrackSelectorConfig;
    private container: HTMLElement;
    private buttons: TrackButton[] = [];
    private selectedTrack: number = 3; // Default to track 3 per gameplay
    private onTrackSelectedCallback?: (trackNumber: number) => void;
    private fontLoaded: boolean = false;
    
    constructor(config: TrackSelectorConfig) {
        this.config = config;
        this.container = this.createContainer();

        // Try to load Minecraft font; proceed regardless
        this.loadMinecraftFont().finally(() => {
            this.createButtons();
            this.setupEventHandlers();
        });
        
        console.log('[TrackSelector] Created with', config.trackCount, 'track buttons');
    }

    /**
     * Attempt to load the Minecraft font so numbers match main menu styling
     */
    private async loadMinecraftFont(): Promise<void> {
        try {
            // Guard for test/jsdom environments
            const AnyWindow: any = window as any;
            if (typeof AnyWindow.FontFace !== 'function') {
                return;
            }
            const font = new AnyWindow.FontFace('Minecraft', 'url(/src/assets/fonts/Minecraft.ttf)');
            await font.load();
            (document as any).fonts.add(font);
            this.fontLoaded = true;
        } catch {
            // Non-fatal; fallback system font will be used
            this.fontLoaded = false;
        }
    }
    
    /**
     * Create the main container for track selector buttons
     */
    private createContainer(): HTMLElement {
        const container = document.createElement('div');
        container.id = 'track-selector';
        container.className = 'ui-element';
        
        // Position at bottom of screen
        container.style.cssText = `
            position: absolute;
            bottom: ${this.config.bottomMargin}px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: ${this.config.buttonSpacing}px;
            z-index: 200;
        `;
        
        return container;
    }
    
    /**
     * Create 5 track selection buttons
     */
    private createButtons(): void {
        for (let i = 1; i <= this.config.trackCount; i++) {
            const button = this.createTrackButton(i);
            const trackButton: TrackButton = {
                element: button,
                trackNumber: i,
                isSelected: i === this.selectedTrack
            };
            
            this.buttons.push(trackButton);
            this.container.appendChild(button);
        }
        
        // Update visual state for initially selected button
        this.updateButtonVisuals();
    }
    
    /**
     * Create individual track button
     */
    private createTrackButton(trackNumber: number): HTMLButtonElement {
        const button = document.createElement('button');
        button.id = `track-button-${trackNumber}`;
        button.textContent = trackNumber.toString();
        button.setAttribute('data-track', trackNumber.toString());
        button.setAttribute('role', 'button');
        button.setAttribute('aria-pressed', (trackNumber === this.selectedTrack).toString());
        
        // Per-button color mapping to match requested palette
        const colorMap: Record<number, { start: string; end: string } > = {
            1: { start: '#e74c3c', end: '#c0392b' }, // red
            2: { start: '#3498db', end: '#2980b9' }, // blue
            3: { start: '#2ecc71', end: '#27ae60' }, // green
            4: { start: '#f1c40f', end: '#d4ac0d' }, // yellow
            5: { start: '#e67e22', end: '#d35400' }  // orange
        };
        const colors = colorMap[trackNumber] || colorMap[2];

        // Style to resemble main menu buttons (3D-ish, bold, Minecraft font)
        button.style.cssText = `
            width: ${this.config.buttonWidth}px;
            height: ${this.config.buttonHeight}px;
            border: 3px solid rgba(0,0,0,0.5);
            border-radius: 10px;
            background: linear-gradient(145deg, ${colors.start}, ${colors.end});
            color: #ffffff;
            font-size: 22px;
            font-family: ${this.fontLoaded ? 'Minecraft, Arial, sans-serif' : 'Arial, sans-serif'};
            font-weight: 700;
            cursor: pointer;
            transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease;
            transform: translateY(0);
            box-shadow: 0 6px 14px rgba(0, 0, 0, 0.35), inset 0 -4px 0 rgba(255, 255, 255, 0.15);
            user-select: none;
            outline: none;
            padding: 0;
        `;
        
        // Add hover effects (raise slightly when not selected)
        button.addEventListener('mouseenter', () => {
            if (!this.isButtonSelected(trackNumber)) {
                button.style.transform = 'translateY(-2px)';
                button.style.boxShadow = '0 10px 24px rgba(0, 0, 0, 0.45), inset 0 -4px 0 rgba(255,255,255,0.2)';
            }
        });

        button.addEventListener('mouseleave', () => {
            if (!this.isButtonSelected(trackNumber)) {
                button.style.transform = 'translateY(0)';
                button.style.boxShadow = '0 6px 14px rgba(0, 0, 0, 0.35), inset 0 -4px 0 rgba(255,255,255,0.15)';
            }
        });
        
        return button;
    }
    
    /**
     * Set up event handlers for button clicks
     */
    private setupEventHandlers(): void {
        this.buttons.forEach(trackButton => {
            trackButton.element.addEventListener('click', (event) => {
                event.preventDefault();
                this.selectTrack(trackButton.trackNumber);
            });

            // Touch support for mobile devices
            trackButton.element.addEventListener('touchstart', (event) => {
                // Prevent synthetic mouse events and default scrolling
                event.preventDefault();
                this.selectTrack(trackButton.trackNumber);
            }, { passive: false });
        });
    }
    
    /**
     * Select a track (one selected at a time)
     */
    public selectTrack(trackNumber: number): void {
        if (trackNumber < 1 || trackNumber > this.config.trackCount) {
            console.warn('[TrackSelector] Invalid track number:', trackNumber);
            return;
        }
        
        // Update selection state
        const previousTrack = this.selectedTrack;
        this.selectedTrack = trackNumber;
        
        // Update button states
        this.buttons.forEach(trackButton => {
            trackButton.isSelected = trackButton.trackNumber === trackNumber;
            trackButton.element.setAttribute('aria-pressed', trackButton.isSelected.toString());
        });
        
        // Update visual feedback
        this.updateButtonVisuals();
        
        // Trigger callback if registered
        if (this.onTrackSelectedCallback) {
            this.onTrackSelectedCallback(trackNumber);
        }
        
        console.log(`[TrackSelector] Track selected: ${previousTrack} -> ${trackNumber}`);
    }
    
    /**
     * Update visual feedback for selected buttons
     */
    private updateButtonVisuals(): void {
        this.buttons.forEach(trackButton => {
            const button = trackButton.element;
            
            if (trackButton.isSelected) {
                // Pressed look: slightly down, stronger inner shadow
                button.style.transform = 'translateY(2px)';
                button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.35), inset 0 4px 0 rgba(0,0,0,0.2)';
                button.style.filter = 'brightness(0.98)';
            } else {
                // Default raised look
                button.style.transform = 'translateY(0)';
                button.style.boxShadow = '0 6px 14px rgba(0, 0, 0, 0.35), inset 0 -4px 0 rgba(255,255,255,0.15)';
                button.style.filter = 'none';
            }
        });
    }
    
    /**
     * Check if a button is currently selected
     */
    private isButtonSelected(trackNumber: number): boolean {
        const trackButton = this.buttons.find(btn => btn.trackNumber === trackNumber);
        return trackButton ? trackButton.isSelected : false;
    }
    
    /**
     * Get currently selected track number
     */
    public getSelectedTrack(): number {
        return this.selectedTrack;
    }
    
    /**
     * Register callback for track selection events
     */
    public onTrackSelected(callback: (trackNumber: number) => void): void {
        this.onTrackSelectedCallback = callback;
    }
    
    /**
     * Add the track selector to the DOM
     */
    public mount(parentElement?: HTMLElement): void {
        const parent = parentElement || document.getElementById('ui-overlay');
        if (!parent) {
            throw new Error('Cannot mount TrackSelector: parent element not found');
        }
        
        parent.appendChild(this.container);
        console.log('[TrackSelector] Mounted to DOM');
    }
    
    /**
     * Remove the track selector from the DOM
     */
    public unmount(): void {
        if (this.container.parentElement) {
            this.container.parentElement.removeChild(this.container);
            console.log('[TrackSelector] Unmounted from DOM');
        }
    }
    
    /**
     * Enable or disable the track selector
     */
    public setEnabled(enabled: boolean): void {
        this.buttons.forEach(trackButton => {
            trackButton.element.disabled = !enabled;
            trackButton.element.style.opacity = enabled ? '1' : '0.5';
            trackButton.element.style.cursor = enabled ? 'pointer' : 'not-allowed';
        });
        
        console.log(`[TrackSelector] ${enabled ? 'Enabled' : 'Disabled'}`);
    }
    
    /**
     * Clean up resources and event listeners
     */
    public dispose(): void {
        // Remove event listeners
        this.buttons.forEach(trackButton => {
            trackButton.element.removeEventListener('click', () => {});
            trackButton.element.removeEventListener('mouseenter', () => {});
            trackButton.element.removeEventListener('mouseleave', () => {});
        });
        
        // Clear references
        this.buttons = [];
        this.onTrackSelectedCallback = undefined;
        
        // Remove from DOM if still mounted
        this.unmount();
        
        console.log('[TrackSelector] Disposed');
    }
}

/**
 * Default configuration for TrackSelector
 */
export const DEFAULT_TRACK_SELECTOR_CONFIG: TrackSelectorConfig = {
    trackCount: 5,
    buttonWidth: 60,
    buttonHeight: 60,
    buttonSpacing: 15,
    bottomMargin: 30
};
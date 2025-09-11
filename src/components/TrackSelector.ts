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
    private selectedTrack: number = 1; // Default to track 1
    private onTrackSelectedCallback?: (trackNumber: number) => void;
    
    constructor(config: TrackSelectorConfig) {
        this.config = config;
        this.container = this.createContainer();
        this.createButtons();
        this.setupEventHandlers();
        
        console.log('[TrackSelector] Created with', config.trackCount, 'track buttons');
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
        
        // Style the button with bright, vivid colors
        button.style.cssText = `
            width: ${this.config.buttonWidth}px;
            height: ${this.config.buttonHeight}px;
            border: 3px solid #2c3e50;
            border-radius: 8px;
            background: linear-gradient(145deg, #3498db, #2980b9);
            color: white;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            user-select: none;
            outline: none;
        `;
        
        // Add hover effects
        button.addEventListener('mouseenter', () => {
            if (!this.isButtonSelected(trackNumber)) {
                button.style.transform = 'translateY(-2px)';
                button.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.3)';
            }
        });
        
        button.addEventListener('mouseleave', () => {
            if (!this.isButtonSelected(trackNumber)) {
                button.style.transform = 'translateY(0)';
                button.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
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
                // Selected button style - bright orange/yellow
                button.style.background = 'linear-gradient(145deg, #f39c12, #e67e22)';
                button.style.borderColor = '#d35400';
                button.style.transform = 'translateY(-3px)';
                button.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.4)';
                button.style.color = 'white';
            } else {
                // Unselected button style - blue
                button.style.background = 'linear-gradient(145deg, #3498db, #2980b9)';
                button.style.borderColor = '#2c3e50';
                button.style.transform = 'translateY(0)';
                button.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
                button.style.color = 'white';
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
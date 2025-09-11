/**
 * MenuSystem Integration Example
 * Demonstrates how to integrate MenuSystem and UIManager with the game engine
 */

import { GameEngine, GameEngineConfig } from '../engine/GameEngine';
import { SceneManager, DEFAULT_SCENE_CONFIG } from '../engine/SceneManager';
import { MenuSystem, MenuType, MenuSystemConfig } from '../systems/MenuSystem';
import { UIManager, UIManagerConfig } from '../systems/UIManager';
import { GameState } from '../models/GameState';

export class MenuSystemIntegration {
    private gameEngine: GameEngine;
    private sceneManager: SceneManager;
    private menuSystem: MenuSystem;
    private uiManager: UIManager;
    private gameState: GameState;

    
    constructor(canvas: HTMLCanvasElement) {

        
        // Initialize game state
        this.gameState = new GameState();
        
        // Initialize game engine
        const engineConfig: GameEngineConfig = {
            targetFPS: 60,
            enableLogging: true,
            canvas: canvas
        };
        this.gameEngine = new GameEngine(engineConfig);
        
        // Initialize scene manager
        const sceneConfig = {
            ...DEFAULT_SCENE_CONFIG,
            canvas: canvas
        };
        this.sceneManager = new SceneManager(sceneConfig);
        
        // Initialize menu system
        const menuConfig: MenuSystemConfig = {
            sceneManager: this.sceneManager,
            onStartGame: () => this.handleStartGame(),
            onShowOptions: () => this.handleShowOptions(),
            onShowHowToPlay: () => this.handleShowHowToPlay(),
            onShowAbout: () => this.handleShowAbout()
        };
        this.menuSystem = new MenuSystem(menuConfig);
        
        // Initialize UI manager
        const uiConfig: UIManagerConfig = {
            sceneManager: this.sceneManager,
            gameState: this.gameState,
            onPauseGame: () => this.handlePauseGame(),
            onResumeGame: () => this.handleResumeGame(),
            onRestartGame: () => this.handleRestartGame(),
            onReturnToMenu: () => this.handleReturnToMenu()
        };
        this.uiManager = new UIManager(uiConfig);
        
        console.log('MenuSystemIntegration created');
    }
    
    /**
     * Initialize all systems
     */
    public async initialize(): Promise<void> {
        try {
            console.log('Initializing MenuSystemIntegration...');
            
            // Initialize core systems
            this.gameEngine.initialize();
            this.sceneManager.initialize();
            
            // Initialize menu and UI systems
            this.menuSystem.initialize();
            this.uiManager.initialize();
            
            // Register update and render callbacks
            this.gameEngine.registerUpdateCallback((deltaTime: number) => {
                this.update(deltaTime);
            });
            
            this.gameEngine.registerRenderCallback(() => {
                this.render();
            });
            
            // Start with main menu
            this.showMainMenu();
            
            console.log('MenuSystemIntegration initialized successfully');
            
        } catch (error) {
            console.error('MenuSystemIntegration initialization failed:', error);
            throw error;
        }
    }
    
    /**
     * Start the integration
     */
    public start(): void {
        this.gameEngine.start();
        console.log('MenuSystemIntegration started');
    }
    
    /**
     * Update all systems
     */
    private update(deltaTime: number): void {
        // Update menu system
        this.menuSystem.update(deltaTime);
        
        // Update UI manager
        this.uiManager.update(deltaTime);
        
        // Update game state if game is running
        if (this.menuSystem.getCurrentMenu() === MenuType.GAME_UI) {
            // Game logic would go here
            // For demo purposes, we'll simulate some game progression
            this.simulateGameProgression(deltaTime);
        }
    }
    
    /**
     * Render all systems
     */
    private render(): void {
        this.sceneManager.render();
    }
    
    /**
     * Show main menu
     */
    private showMainMenu(): void {
        this.uiManager.hideAllUI();
        this.menuSystem.showMainMenu();
        console.log('Main menu displayed');
    }
    
    /**
     * Handle start game action
     */
    private handleStartGame(): void {
        console.log('Starting game...');
        
        // Reset game state
        this.gameState.reset();
        
        // Show game UI
        this.uiManager.showGameUI();
        
        console.log('Game started');
    }
    
    /**
     * Handle show options action
     */
    private handleShowOptions(): void {
        console.log('Options menu requested');
        // In a real implementation, this would show an options menu
        alert('Options menu would be displayed here');
    }
    
    /**
     * Handle show how to play action
     */
    private handleShowHowToPlay(): void {
        console.log('How to play requested');
        // In a real implementation, this would show instructions
        alert('How to play instructions would be displayed here');
    }
    
    /**
     * Handle show about action
     */
    private handleShowAbout(): void {
        console.log('About screen requested');
        // In a real implementation, this would show about information
        alert('About information would be displayed here');
    }
    
    /**
     * Handle pause game action
     */
    private handlePauseGame(): void {
        console.log('Pausing game...');
        this.gameEngine.pause();
        this.gameState.pause();
        this.uiManager.showPauseUI();
    }
    
    /**
     * Handle resume game action
     */
    private handleResumeGame(): void {
        console.log('Resuming game...');
        this.gameEngine.resume();
        this.gameState.resume();
        this.uiManager.hidePauseUI();
    }
    
    /**
     * Handle restart game action
     */
    private handleRestartGame(): void {
        console.log('Restarting game...');
        this.gameState.reset();
        this.uiManager.hideAllUI();
        this.handleStartGame();
    }
    
    /**
     * Handle return to menu action
     */
    private handleReturnToMenu(): void {
        console.log('Returning to main menu...');
        this.gameEngine.resume(); // Make sure engine is running
        this.showMainMenu();
    }
    
    /**
     * Simulate game progression for demo purposes
     */
    private simulateGameProgression(deltaTime: number): void {
        // Simulate some game events every few seconds
        const now = performance.now();
        const interval = 3000; // 3 seconds
        
        if (Math.floor(now / interval) !== Math.floor((now - deltaTime * 1000) / interval)) {
            // Simulate hitting or avoiding people
            const hitPeople = Math.floor(Math.random() * 3);
            const avoidedPeople = Math.floor(Math.random() * 5) + 1;
            
            this.gameState.updateScore(hitPeople, avoidedPeople);
            this.gameState.incrementSegment();
            
            console.log(`Segment ${this.gameState.getCurrentSegment()}: Hit ${hitPeople}, Avoided ${avoidedPeople}, Score: ${this.gameState.getScore()}`);
            
            // Simulate game over after 10 segments
            if (this.gameState.getCurrentSegment() >= 10) {
                this.handleGameOver();
            }
        }
    }
    
    /**
     * Handle game over
     */
    private handleGameOver(): void {
        console.log('Game over!');
        this.gameState.endGame();
        this.uiManager.showGameOverScreen();
    }
    
    /**
     * Clean up resources
     */
    public dispose(): void {
        console.log('Disposing MenuSystemIntegration...');
        
        this.menuSystem.dispose();
        this.uiManager.dispose();
        this.sceneManager.dispose();
        this.gameEngine.destroy();
        
        console.log('MenuSystemIntegration disposed');
    }
}

/**
 * Example usage function
 */
export function createMenuSystemExample(canvasId: string): MenuSystemIntegration | null {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
        console.error(`Canvas element with id '${canvasId}' not found`);
        return null;
    }
    
    const integration = new MenuSystemIntegration(canvas);
    
    // Initialize and start
    integration.initialize().then(() => {
        integration.start();
        console.log('Menu system example started successfully');
    }).catch(error => {
        console.error('Failed to start menu system example:', error);
    });
    
    return integration;
}

// Export for use in HTML
(window as any).createMenuSystemExample = createMenuSystemExample;
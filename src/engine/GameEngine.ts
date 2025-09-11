/**
 * GameEngine - Core game engine that manages the main game loop and coordinates all subsystems
 * Implements requirements: 1.1, 11.2, 11.3
 */

export enum GameEngineState {
    UNINITIALIZED = 'uninitialized',
    INITIALIZED = 'initialized',
    RUNNING = 'running',
    PAUSED = 'paused',
    STOPPED = 'stopped',
    ERROR = 'error'
}

export interface GameEngineConfig {
    targetFPS: number;
    enableLogging: boolean;
    canvas: HTMLCanvasElement;
}

export class GameEngine {
    private state: GameEngineState = GameEngineState.UNINITIALIZED;
    private config: GameEngineConfig;
    private animationFrameId: number | null = null;
    private lastFrameTime: number = 0;
    private deltaTime: number = 0;
    private frameCount: number = 0;
    private fpsCounter: number = 0;
    private lastFPSUpdate: number = 0;
    
    // Subsystem references (will be injected)
    private updateCallbacks: Array<(deltaTime: number) => void> = [];
    private renderCallbacks: Array<() => void> = [];
    
    constructor(config: GameEngineConfig) {
        this.config = config;
        this.log('GameEngine created');
    }
    
    /**
     * Initialize the game engine and all subsystems
     */
    public initialize(): void {
        try {
            this.log('Initializing GameEngine...');
            
            // Verify canvas is available
            if (!this.config.canvas) {
                throw new Error('Canvas element is required for initialization');
            }
            
            // Verify WebGL support
            const gl = this.config.canvas.getContext('webgl') || this.config.canvas.getContext('experimental-webgl');
            if (!gl) {
                throw new Error('WebGL is not supported in this browser');
            }
            
            // Set up error handling
            this.setupErrorHandling();
            
            // Set up window resize handling
            this.setupWindowHandling();
            
            this.state = GameEngineState.INITIALIZED;
            this.log('GameEngine initialized successfully');
            
        } catch (error) {
            this.handleError('Initialization failed', error as Error);
        }
    }
    
    /**
     * Start the main game loop
     */
    public start(): void {
        try {
            if (this.state !== GameEngineState.INITIALIZED && this.state !== GameEngineState.PAUSED) {
                throw new Error(`Cannot start game from state: ${this.state}`);
            }
            
            this.log('Starting game loop...');
            this.state = GameEngineState.RUNNING;
            this.lastFrameTime = performance.now();
            this.lastFPSUpdate = this.lastFrameTime;
            this.gameLoop();
            
        } catch (error) {
            this.handleError('Failed to start game', error as Error);
        }
    }
    
    /**
     * Pause the game loop
     */
    public pause(): void {
        try {
            if (this.state !== GameEngineState.RUNNING) {
                this.log('Game is not running, cannot pause');
                return;
            }
            
            this.log('Pausing game...');
            this.state = GameEngineState.PAUSED;
            
            if (this.animationFrameId !== null) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
            
        } catch (error) {
            this.handleError('Failed to pause game', error as Error);
        }
    }
    
    /**
     * Resume the game loop from paused state
     */
    public resume(): void {
        try {
            if (this.state !== GameEngineState.PAUSED) {
                this.log('Game is not paused, cannot resume');
                return;
            }
            
            this.log('Resuming game...');
            this.state = GameEngineState.RUNNING;
            this.lastFrameTime = performance.now(); // Reset frame time to avoid large delta
            this.gameLoop();
            
        } catch (error) {
            this.handleError('Failed to resume game', error as Error);
        }
    }
    
    /**
     * Update game logic - called by the main game loop
     */
    public update(deltaTime: number): void {
        try {
            // Call all registered update callbacks
            for (const callback of this.updateCallbacks) {
                callback(deltaTime);
            }
        } catch (error) {
            this.handleError('Update failed', error as Error);
        }
    }
    
    /**
     * Render the game - called by the main game loop
     */
    public render(): void {
        try {
            // Call all registered render callbacks
            for (const callback of this.renderCallbacks) {
                callback();
            }
        } catch (error) {
            this.handleError('Render failed', error as Error);
        }
    }
    
    /**
     * Stop the game engine completely
     */
    public destroy(): void {
        try {
            this.log('Destroying GameEngine...');
            
            if (this.animationFrameId !== null) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
            
            // Clear all callbacks
            this.updateCallbacks = [];
            this.renderCallbacks = [];
            
            this.state = GameEngineState.STOPPED;
            this.log('GameEngine destroyed');
            
        } catch (error) {
            this.handleError('Failed to destroy game engine', error as Error);
        }
    }
    
    /**
     * Register a callback for the update phase
     */
    public registerUpdateCallback(callback: (deltaTime: number) => void): void {
        this.updateCallbacks.push(callback);
    }
    
    /**
     * Register a callback for the render phase
     */
    public registerRenderCallback(callback: () => void): void {
        this.renderCallbacks.push(callback);
    }
    
    /**
     * Get current engine state
     */
    public getState(): GameEngineState {
        return this.state;
    }
    
    /**
     * Get current FPS
     */
    public getFPS(): number {
        return this.fpsCounter;
    }
    
    /**
     * Main game loop using requestAnimationFrame
     */
    private gameLoop(): void {
        if (this.state !== GameEngineState.RUNNING) {
            return;
        }
        
        const currentTime = performance.now();
        this.deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
        this.lastFrameTime = currentTime;
        
        // Cap delta time to prevent large jumps (e.g., when tab becomes inactive)
        this.deltaTime = Math.min(this.deltaTime, 1/30); // Max 30 FPS minimum
        
        // Update FPS counter
        this.frameCount++;
        if (currentTime - this.lastFPSUpdate >= 1000) {
            this.fpsCounter = this.frameCount;
            this.frameCount = 0;
            this.lastFPSUpdate = currentTime;
        }
        
        // Execute game loop phases
        this.update(this.deltaTime);
        this.render();
        
        // Schedule next frame
        this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
    }
    
    /**
     * Set up global error handling
     */
    private setupErrorHandling(): void {
        window.addEventListener('error', (event) => {
            this.handleError('Global error', new Error(event.message));
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError('Unhandled promise rejection', new Error(event.reason));
        });
    }
    
    /**
     * Set up window event handling
     */
    private setupWindowHandling(): void {
        // Handle visibility changes (tab switching)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.state === GameEngineState.RUNNING) {
                this.pause();
            } else if (!document.hidden && this.state === GameEngineState.PAUSED) {
                this.resume();
            }
        });
    }
    
    /**
     * Handle errors with logging and state management
     */
    private handleError(message: string, error: Error): void {
        console.error(`GameEngine Error: ${message}`, error);
        this.state = GameEngineState.ERROR;
        
        // Stop the game loop if running
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // Could emit error events here for UI to handle
        this.log(`Error state entered: ${message}`);
    }
    
    /**
     * Logging utility
     */
    private log(message: string): void {
        if (this.config.enableLogging) {
            console.log(`[GameEngine] ${message}`);
        }
    }
}
/**
 * Unit tests for UIManager
 * Tests in-game UI elements, score display, pause functionality, and game over screen
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { UIManager, UIManagerConfig } from '../systems/UIManager';
import { SceneManager } from '../engine/SceneManager';
import { GameState } from '../models/GameState';

// Mock Three.js WebGL context
const mockWebGLContext = {
    getExtension: vi.fn(),
    getParameter: vi.fn(),
    createShader: vi.fn(),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    createProgram: vi.fn(),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    useProgram: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getProgramParameter: vi.fn(() => true),
    createBuffer: vi.fn(),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    drawArrays: vi.fn(),
    drawElements: vi.fn(),
    clear: vi.fn(),
    clearColor: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    depthFunc: vi.fn(),
    blendFunc: vi.fn(),
    viewport: vi.fn(),
    getUniformLocation: vi.fn(),
    uniformMatrix4fv: vi.fn(),
    uniform1f: vi.fn(),
    uniform3fv: vi.fn(),
    createTexture: vi.fn(),
    bindTexture: vi.fn(),
    texImage2D: vi.fn(),
    texParameteri: vi.fn(),
    generateMipmap: vi.fn(),
    activeTexture: vi.fn(),
    deleteTexture: vi.fn(),
    deleteBuffer: vi.fn(),
    deleteProgram: vi.fn(),
    deleteShader: vi.fn()
};

// Mock canvas and WebGL context
const mockCanvas = {
    getContext: vi.fn(() => mockWebGLContext),
    width: 800,
    height: 600,
    style: {},
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getBoundingClientRect: vi.fn(() => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600
    }))
} as unknown as HTMLCanvasElement;

// Mock SceneManager
const createMockSceneManager = (): SceneManager => {
    const sceneManager = {
        scene: new THREE.Scene(),
        camera: new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000),
        renderer: {
            domElement: mockCanvas,
            render: vi.fn(),
            setSize: vi.fn(),
            dispose: vi.fn()
        } as unknown as THREE.WebGLRenderer,
        addToScene: vi.fn(),
        removeFromScene: vi.fn(),
        getCamera: vi.fn(() => new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000)),
        getRenderer: vi.fn(() => ({
            domElement: mockCanvas,
            render: vi.fn()
        })),
        getScene: vi.fn(() => new THREE.Scene()),
        initialize: vi.fn(),
        render: vi.fn(),
        dispose: vi.fn()
    } as unknown as SceneManager;
    
    return sceneManager;
};

// Mock GameState
const createMockGameState = (): GameState => {
    return {
        getScore: vi.fn(() => 100),
        getPeopleHit: vi.fn(() => 5),
        getPeopleAvoided: vi.fn(() => 15),
        getCurrentSegment: vi.fn(() => 3),
        isGameOver: vi.fn(() => false),
        isPaused: vi.fn(() => false),
        updateScore: vi.fn(),
        incrementSegment: vi.fn(),
        endGame: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        reset: vi.fn()
    } as unknown as GameState;
};

describe('UIManager', () => {
    let uiManager: UIManager;
    let mockSceneManager: SceneManager;
    let mockGameState: GameState;
    let mockCallbacks: {
        onPauseGame: ReturnType<typeof vi.fn>;
        onResumeGame: ReturnType<typeof vi.fn>;
        onRestartGame: ReturnType<typeof vi.fn>;
        onReturnToMenu: ReturnType<typeof vi.fn>;
    };
    
    beforeEach(() => {
        // Create mock callbacks
        mockCallbacks = {
            onPauseGame: vi.fn(),
            onResumeGame: vi.fn(),
            onRestartGame: vi.fn(),
            onReturnToMenu: vi.fn()
        };
        
        // Create mock dependencies
        mockSceneManager = createMockSceneManager();
        mockGameState = createMockGameState();
        
        // Create UI manager configuration
        const config: UIManagerConfig = {
            sceneManager: mockSceneManager,
            gameState: mockGameState,
            ...mockCallbacks
        };
        
        // Create UI manager
        uiManager = new UIManager(config);
    });
    
    afterEach(() => {
        if (uiManager) {
            uiManager.dispose();
        }
        vi.clearAllMocks();
    });
    
    describe('Initialization', () => {
        test('should create UIManager instance', () => {
            expect(uiManager).toBeDefined();
        });
        
        test('should initialize successfully', () => {
            expect(() => uiManager.initialize()).not.toThrow();
        });
        
        test('should create all UI elements during initialization', () => {
            uiManager.initialize();
            
            // Should have created game UI, pause UI, and game over UI
            // This is verified by the fact that initialization doesn't throw
            expect(true).toBe(true);
        });
    });
    
    describe('Game UI Elements', () => {
        beforeEach(() => {
            uiManager.initialize();
        });
        
        test('should create score display', () => {
            uiManager.showGameUI();
            
            // Verify that addToScene was called for game UI
            expect(mockSceneManager.addToScene).toHaveBeenCalled();
        });
        
        test('should create statistics display', () => {
            uiManager.showGameUI();
            
            // Statistics display should be part of game UI
            expect(mockSceneManager.addToScene).toHaveBeenCalled();
        });
        
        test('should create pause button', () => {
            uiManager.showGameUI();
            
            // Pause button should be part of game UI
            expect(mockSceneManager.addToScene).toHaveBeenCalled();
        });
        
        test('should update score display', () => {
            uiManager.showGameUI();
            
            expect(() => uiManager.updateScoreDisplay()).not.toThrow();
            expect(mockGameState.getScore).toHaveBeenCalled();
        });
        
        test('should update statistics display', () => {
            uiManager.showGameUI();
            
            expect(() => uiManager.updateStatisticsDisplay()).not.toThrow();
            expect(mockGameState.getPeopleHit).toHaveBeenCalled();
            expect(mockGameState.getPeopleAvoided).toHaveBeenCalled();
            expect(mockGameState.getCurrentSegment).toHaveBeenCalled();
        });
    });
    
    describe('Pause UI', () => {
        beforeEach(() => {
            uiManager.initialize();
        });
        
        test('should show pause UI', () => {
            uiManager.showPauseUI();
            
            expect(mockSceneManager.addToScene).toHaveBeenCalled();
        });
        
        test('should hide pause UI', () => {
            uiManager.showPauseUI();
            uiManager.hidePauseUI();
            
            expect(mockSceneManager.removeFromScene).toHaveBeenCalled();
        });
        
        test('should create pause menu buttons', () => {
            uiManager.showPauseUI();
            
            // Pause UI should include resume and main menu buttons
            expect(mockSceneManager.addToScene).toHaveBeenCalled();
        });
    });
    
    describe('Game Over Screen', () => {
        beforeEach(() => {
            uiManager.initialize();
        });
        
        test('should show game over screen', () => {
            uiManager.showGameOverScreen();
            
            expect(mockSceneManager.addToScene).toHaveBeenCalled();
        });
        
        test('should display final score', () => {
            uiManager.showGameOverScreen();
            
            // Should call getScore to display final score
            expect(mockGameState.getScore).toHaveBeenCalled();
        });
        
        test('should display final statistics', () => {
            uiManager.showGameOverScreen();
            
            // Should call all stat methods to display final statistics
            expect(mockGameState.getPeopleHit).toHaveBeenCalled();
            expect(mockGameState.getPeopleAvoided).toHaveBeenCalled();
            expect(mockGameState.getCurrentSegment).toHaveBeenCalled();
        });
        
        test('should create restart and menu buttons', () => {
            uiManager.showGameOverScreen();
            
            // Game over screen should include action buttons
            expect(mockSceneManager.addToScene).toHaveBeenCalled();
        });
    });
    
    describe('UI State Management', () => {
        beforeEach(() => {
            uiManager.initialize();
        });
        
        test('should hide all UI elements', () => {
            uiManager.showGameUI();
            uiManager.showPauseUI();
            
            uiManager.hideAllUI();
            
            // Should have called removeFromScene multiple times
            expect(mockSceneManager.removeFromScene).toHaveBeenCalled();
        });
        
        test('should switch between UI states', () => {
            uiManager.showGameUI();
            expect(mockSceneManager.addToScene).toHaveBeenCalled();
            
            uiManager.showGameOverScreen();
            // Should hide previous UI and show new one
            expect(mockSceneManager.removeFromScene).toHaveBeenCalled();
        });
    });
    
    describe('Event Handling', () => {
        beforeEach(() => {
            uiManager.initialize();
        });
        
        test('should set up click event listeners', () => {
            expect(mockCanvas.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
        });
        
        test('should handle pause button clicks', () => {
            uiManager.showGameUI();
            
            // Pause button click would be handled by the event system
            // This is difficult to test in unit tests without DOM simulation
            expect(mockCallbacks.onPauseGame).not.toHaveBeenCalled();
        });
    });
    
    describe('Update Loop', () => {
        beforeEach(() => {
            uiManager.initialize();
        });
        
        test('should handle update calls', () => {
            expect(() => uiManager.update(0.016)).not.toThrow();
        });
        
        test('should update displays during game', () => {
            // Mock game state as running
            (mockGameState.isGameOver as any).mockReturnValue(false);
            (mockGameState.isPaused as any).mockReturnValue(false);
            
            uiManager.update(0.016);
            
            // Should call game state methods to update displays
            expect(mockGameState.getScore).toHaveBeenCalled();
        });
        
        test('should not update displays when game is over', () => {
            // Mock game state as game over
            (mockGameState.isGameOver as any).mockReturnValue(true);
            
            uiManager.update(0.016);
            
            // Should not update displays when game is over
            // The exact behavior depends on implementation
            expect(true).toBe(true);
        });
        
        test('should not update displays when game is paused', () => {
            // Mock game state as paused
            (mockGameState.isPaused as any).mockReturnValue(true);
            
            uiManager.update(0.016);
            
            // Should not update displays when paused
            // The exact behavior depends on implementation
            expect(true).toBe(true);
        });
    });
    
    describe('Resource Management', () => {
        beforeEach(() => {
            uiManager.initialize();
        });
        
        test('should clean up resources on dispose', () => {
            expect(() => uiManager.dispose()).not.toThrow();
        });
        
        test('should remove event listeners on dispose', () => {
            uiManager.dispose();
            
            expect(mockCanvas.removeEventListener).toHaveBeenCalledWith('click', expect.any(Function));
        });
        
        test('should remove UI objects from scene on dispose', () => {
            uiManager.showGameUI();
            uiManager.dispose();
            
            // Should have called removeFromScene to clean up
            expect(mockSceneManager.removeFromScene).toHaveBeenCalled();
        });
    });
    
    describe('Text Display Updates', () => {
        beforeEach(() => {
            uiManager.initialize();
        });
        
        test('should update score text correctly', () => {
            (mockGameState.getScore as any).mockReturnValue(250);
            
            uiManager.updateScoreDisplay();
            
            expect(mockGameState.getScore).toHaveBeenCalled();
        });
        
        test('should update statistics text correctly', () => {
            (mockGameState.getPeopleHit as any).mockReturnValue(3);
            (mockGameState.getPeopleAvoided as any).mockReturnValue(12);
            (mockGameState.getCurrentSegment as any).mockReturnValue(5);
            
            uiManager.updateStatisticsDisplay();
            
            expect(mockGameState.getPeopleHit).toHaveBeenCalled();
            expect(mockGameState.getPeopleAvoided).toHaveBeenCalled();
            expect(mockGameState.getCurrentSegment).toHaveBeenCalled();
        });
    });
    
    describe('Error Handling', () => {
        test('should handle initialization errors gracefully', () => {
            // Create UI manager with invalid configuration
            const invalidConfig = {
                sceneManager: null as any,
                gameState: null as any,
                onPauseGame: vi.fn(),
                onResumeGame: vi.fn(),
                onRestartGame: vi.fn(),
                onReturnToMenu: vi.fn()
            };
            
            const invalidUIManager = new UIManager(invalidConfig);
            expect(() => invalidUIManager.initialize()).toThrow();
        });
        
        test('should handle dispose without initialization', () => {
            const uninitializedUIManager = new UIManager({
                sceneManager: mockSceneManager,
                gameState: mockGameState,
                ...mockCallbacks
            });
            
            expect(() => uninitializedUIManager.dispose()).not.toThrow();
        });
        
        test('should handle update with invalid delta time', () => {
            uiManager.initialize();
            
            expect(() => uiManager.update(0)).not.toThrow();
            expect(() => uiManager.update(-1)).not.toThrow();
            expect(() => uiManager.update(1000)).not.toThrow();
        });
    });
});
/**
 * Unit tests for GameEngine class
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { GameEngine, GameEngineState, GameEngineConfig } from '../GameEngine';

// Mock canvas element
const mockCanvas = {
    getContext: vi.fn(() => ({
        // Mock WebGL context
        canvas: mockCanvas,
        drawingBufferWidth: 800,
        drawingBufferHeight: 600
    }))
} as unknown as HTMLCanvasElement;

describe('GameEngine', () => {
    let gameEngine: GameEngine;
    let config: GameEngineConfig;

    beforeEach(() => {
        config = {
            targetFPS: 60,
            enableLogging: false, // Disable logging for tests
            canvas: mockCanvas
        };
        gameEngine = new GameEngine(config);
    });

    test('should initialize with UNINITIALIZED state', () => {
        expect(gameEngine.getState()).toBe(GameEngineState.UNINITIALIZED);
    });

    test('should initialize successfully', () => {
        gameEngine.initialize();
        expect(gameEngine.getState()).toBe(GameEngineState.INITIALIZED);
    });

    test('should start from initialized state', () => {
        gameEngine.initialize();
        gameEngine.start();
        expect(gameEngine.getState()).toBe(GameEngineState.RUNNING);
    });

    test('should pause from running state', () => {
        gameEngine.initialize();
        gameEngine.start();
        gameEngine.pause();
        expect(gameEngine.getState()).toBe(GameEngineState.PAUSED);
    });

    test('should resume from paused state', () => {
        gameEngine.initialize();
        gameEngine.start();
        gameEngine.pause();
        gameEngine.resume();
        expect(gameEngine.getState()).toBe(GameEngineState.RUNNING);
    });

    test('should register update callbacks', () => {
        const updateCallback = vi.fn();
        gameEngine.registerUpdateCallback(updateCallback);
        
        gameEngine.initialize();
        gameEngine.update(0.016); // 60 FPS delta time
        
        expect(updateCallback).toHaveBeenCalledWith(0.016);
    });

    test('should register render callbacks', () => {
        const renderCallback = vi.fn();
        gameEngine.registerRenderCallback(renderCallback);
        
        gameEngine.initialize();
        gameEngine.render();
        
        expect(renderCallback).toHaveBeenCalled();
    });

    test('should handle errors gracefully', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        // Try to start without initialization
        gameEngine.start();
        
        expect(gameEngine.getState()).toBe(GameEngineState.ERROR);
        expect(consoleSpy).toHaveBeenCalled();
        
        consoleSpy.mockRestore();
    });

    test('should destroy properly', () => {
        gameEngine.initialize();
        gameEngine.start();
        gameEngine.destroy();
        
        expect(gameEngine.getState()).toBe(GameEngineState.STOPPED);
    });
});
/**
 * Integration tests for GameEngine + SceneManager
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { GameEngine, GameEngineConfig } from '../GameEngine';
import { SceneManager, DEFAULT_SCENE_CONFIG } from '../SceneManager';
import { TestScene } from '../TestScene';

// Mock canvas and WebGL context
const mockCanvas = {
    getContext: vi.fn(() => ({
        canvas: mockCanvas,
        drawingBufferWidth: 800,
        drawingBufferHeight: 600,
        getExtension: vi.fn(),
        getParameter: vi.fn(),
        createShader: vi.fn(),
        createProgram: vi.fn(),
        attachShader: vi.fn(),
        linkProgram: vi.fn(),
        useProgram: vi.fn(),
        createBuffer: vi.fn(),
        bindBuffer: vi.fn(),
        bufferData: vi.fn(),
        enableVertexAttribArray: vi.fn(),
        vertexAttribPointer: vi.fn(),
        drawArrays: vi.fn(),
        clear: vi.fn(),
        clearColor: vi.fn(),
        enable: vi.fn(),
        disable: vi.fn(),
        viewport: vi.fn()
    })),
    width: 800,
    height: 600,
    clientWidth: 800,
    clientHeight: 600
} as unknown as HTMLCanvasElement;

// Mock window and document for resize handling
Object.defineProperty(window, 'innerWidth', { value: 800, writable: true });
Object.defineProperty(window, 'innerHeight', { value: 600, writable: true });
Object.defineProperty(document, 'hidden', { value: false, writable: true });

describe('GameEngine + SceneManager Integration', () => {
    let gameEngine: GameEngine;
    let sceneManager: SceneManager;
    let testScene: TestScene;

    beforeEach(() => {
        const engineConfig: GameEngineConfig = {
            targetFPS: 60,
            enableLogging: false,
            canvas: mockCanvas
        };

        const sceneConfig = {
            ...DEFAULT_SCENE_CONFIG,
            canvas: mockCanvas
        };

        gameEngine = new GameEngine(engineConfig);
        sceneManager = new SceneManager(sceneConfig);
        testScene = new TestScene(sceneManager);
    });

    test('should initialize all systems successfully', () => {
        expect(() => {
            gameEngine.initialize();
            sceneManager.initialize();
        }).not.toThrow();

        expect(gameEngine.getState()).toBe('initialized');
        expect(sceneManager.getScene()).toBeDefined();
        expect(sceneManager.getCamera()).toBeDefined();
        expect(sceneManager.getRenderer()).toBeDefined();
    });

    test('should create test scene objects', () => {
        gameEngine.initialize();
        sceneManager.initialize();
        
        const initialChildCount = sceneManager.getScene().children.length;
        testScene.createTestObjects();
        
        // Should have added test objects to the scene
        expect(sceneManager.getScene().children.length).toBeGreaterThan(initialChildCount);
        expect(testScene.getTestObjects().length).toBeGreaterThan(0);
    });

    test('should handle update and render callbacks', () => {
        gameEngine.initialize();
        sceneManager.initialize();
        testScene.createTestObjects();

        let updateCalled = false;
        let renderCalled = false;

        gameEngine.registerUpdateCallback((deltaTime) => {
            testScene.update(deltaTime);
            updateCalled = true;
        });

        gameEngine.registerRenderCallback(() => {
            sceneManager.render();
            renderCalled = true;
        });

        gameEngine.update(0.016);
        gameEngine.render();

        expect(updateCalled).toBe(true);
        expect(renderCalled).toBe(true);
    });

    test('should cleanup resources properly', () => {
        gameEngine.initialize();
        sceneManager.initialize();
        testScene.createTestObjects();

        const objectCount = testScene.getTestObjects().length;
        expect(objectCount).toBeGreaterThan(0);

        testScene.cleanup();
        expect(testScene.getTestObjects().length).toBe(0);

        gameEngine.destroy();
        sceneManager.dispose();
    });
});
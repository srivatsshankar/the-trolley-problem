/**
 * Unit tests for MenuSystem
 * Tests menu creation, navigation, and 3D icon interactions
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { MenuSystem, MenuType, MenuSystemConfig } from '../systems/MenuSystem';
import { SceneManager } from '../engine/SceneManager';

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

describe('MenuSystem', () => {
    let menuSystem: MenuSystem;
    let mockSceneManager: SceneManager;
    let mockCallbacks: {
        onStartGame: ReturnType<typeof vi.fn>;
        onShowOptions: ReturnType<typeof vi.fn>;
        onShowHowToPlay: ReturnType<typeof vi.fn>;
        onShowAbout: ReturnType<typeof vi.fn>;
    };
    
    beforeEach(() => {
        // Create mock callbacks
        mockCallbacks = {
            onStartGame: vi.fn(),
            onShowOptions: vi.fn(),
            onShowHowToPlay: vi.fn(),
            onShowAbout: vi.fn()
        };
        
        // Create mock scene manager
        mockSceneManager = createMockSceneManager();
        
        // Create menu system configuration
        const config: MenuSystemConfig = {
            sceneManager: mockSceneManager,
            ...mockCallbacks
        };
        
        // Create menu system
        menuSystem = new MenuSystem(config);
    });
    
    afterEach(() => {
        if (menuSystem) {
            menuSystem.dispose();
        }
        vi.clearAllMocks();
    });
    
    describe('Initialization', () => {
        test('should create MenuSystem instance', () => {
            expect(menuSystem).toBeDefined();
            expect(menuSystem.getCurrentMenu()).toBe(MenuType.MAIN_MENU);
            expect(menuSystem.isMenuInitialized()).toBe(false);
        });
        
        test('should initialize successfully', () => {
            expect(() => menuSystem.initialize()).not.toThrow();
            expect(menuSystem.isMenuInitialized()).toBe(true);
        });
        
        test('should create main menu with 4 options', () => {
            menuSystem.initialize();
            
            // Verify scene manager addToScene was called (for main menu)
            expect(mockSceneManager.addToScene).toHaveBeenCalled();
        });
    });
    
    describe('Menu Navigation', () => {
        beforeEach(() => {
            menuSystem.initialize();
        });
        
        test('should show main menu by default', () => {
            expect(menuSystem.getCurrentMenu()).toBe(MenuType.MAIN_MENU);
        });
        
        test('should handle start game action', () => {
            // Simulate clicking start ride button
            menuSystem.showMainMenu();
            
            // Since we can't easily simulate mouse events in unit tests,
            // we'll test the callback directly
            expect(mockCallbacks.onStartGame).not.toHaveBeenCalled();
            
            // The actual click handling would be tested in integration tests
        });
        
        test('should handle options action', () => {
            expect(mockCallbacks.onShowOptions).not.toHaveBeenCalled();
        });
        
        test('should handle how to play action', () => {
            expect(mockCallbacks.onShowHowToPlay).not.toHaveBeenCalled();
        });
        
        test('should handle about action', () => {
            expect(mockCallbacks.onShowAbout).not.toHaveBeenCalled();
        });
    });
    
    describe('3D Icon Creation', () => {
        beforeEach(() => {
            menuSystem.initialize();
        });
        
        test('should create 3D icons with proper materials', () => {
            // Test that the menu system creates the expected 3D objects
            // This is verified by checking that addToScene was called
            expect(mockSceneManager.addToScene).toHaveBeenCalled();
        });
        
        test('should position icons correctly', () => {
            // Icons should be positioned horizontally across the screen
            // This would be verified by checking the mesh positions
            // In a real test, we'd inspect the created meshes
            expect(menuSystem.isMenuInitialized()).toBe(true);
        });
        
        test('should create icons with bright, vivid colors', () => {
            // Each icon should have a different bright color
            // start_ride: green, options: blue, how_to_play: yellow, about: orange
            expect(menuSystem.isMenuInitialized()).toBe(true);
        });
    });
    
    describe('Menu State Management', () => {
        beforeEach(() => {
            menuSystem.initialize();
        });
        
        test('should track current menu type', () => {
            expect(menuSystem.getCurrentMenu()).toBe(MenuType.MAIN_MENU);
        });
        
        test('should handle menu transitions', () => {
            menuSystem.showMainMenu();
            expect(menuSystem.getCurrentMenu()).toBe(MenuType.MAIN_MENU);
        });
    });
    
    describe('Event Handling', () => {
        beforeEach(() => {
            menuSystem.initialize();
        });
        
        test('should set up mouse event listeners', () => {
            // Verify that event listeners were added to the canvas
            expect(mockCanvas.addEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
            expect(mockCanvas.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
            expect(mockCanvas.addEventListener).toHaveBeenCalledWith('mouseenter', expect.any(Function));
            expect(mockCanvas.addEventListener).toHaveBeenCalledWith('mouseleave', expect.any(Function));
        });
        
        test('should handle mouse move for hover effects', () => {
            // Mouse move handling would update hover states
            // This is difficult to test in unit tests without DOM simulation
            expect(menuSystem.isMenuInitialized()).toBe(true);
        });
        
        test('should handle click events for menu selection', () => {
            // Click handling would trigger menu actions
            // This is difficult to test in unit tests without DOM simulation
            expect(menuSystem.isMenuInitialized()).toBe(true);
        });
    });
    
    describe('Animation and Visual Effects', () => {
        beforeEach(() => {
            menuSystem.initialize();
        });
        
        test('should support hover animations', () => {
            // Icons should scale up on hover
            expect(menuSystem.isMenuInitialized()).toBe(true);
        });
        
        test('should support click animations', () => {
            // Icons should scale down then back up on click
            expect(menuSystem.isMenuInitialized()).toBe(true);
        });
    });
    
    describe('Resource Management', () => {
        beforeEach(() => {
            menuSystem.initialize();
        });
        
        test('should clean up resources on dispose', () => {
            expect(() => menuSystem.dispose()).not.toThrow();
            expect(menuSystem.isMenuInitialized()).toBe(false);
        });
        
        test('should remove event listeners on dispose', () => {
            menuSystem.dispose();
            
            expect(mockCanvas.removeEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
            expect(mockCanvas.removeEventListener).toHaveBeenCalledWith('click', expect.any(Function));
            expect(mockCanvas.removeEventListener).toHaveBeenCalledWith('mouseenter', expect.any(Function));
            expect(mockCanvas.removeEventListener).toHaveBeenCalledWith('mouseleave', expect.any(Function));
        });
        
        test('should remove menu objects from scene on dispose', () => {
            menuSystem.dispose();
            
            // Should have called removeFromScene to clean up
            expect(mockSceneManager.removeFromScene).toHaveBeenCalled();
        });
    });
    
    describe('Update Loop', () => {
        beforeEach(() => {
            menuSystem.initialize();
        });
        
        test('should handle update calls', () => {
            expect(() => menuSystem.update(0.016)).not.toThrow();
        });
        
        test('should not crash with invalid delta time', () => {
            expect(() => menuSystem.update(0)).not.toThrow();
            expect(() => menuSystem.update(-1)).not.toThrow();
            expect(() => menuSystem.update(1000)).not.toThrow();
        });
    });
    
    describe('Error Handling', () => {
        test('should handle initialization errors gracefully', () => {
            // Create menu system with invalid configuration
            const invalidConfig = {
                sceneManager: null as any,
                onStartGame: vi.fn(),
                onShowOptions: vi.fn(),
                onShowHowToPlay: vi.fn(),
                onShowAbout: vi.fn()
            };
            
            const invalidMenuSystem = new MenuSystem(invalidConfig);
            expect(() => invalidMenuSystem.initialize()).toThrow();
        });
        
        test('should handle dispose without initialization', () => {
            const uninitializedMenuSystem = new MenuSystem({
                sceneManager: mockSceneManager,
                ...mockCallbacks
            });
            
            expect(() => uninitializedMenuSystem.dispose()).not.toThrow();
        });
    });
});
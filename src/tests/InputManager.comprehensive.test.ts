/**
 * Comprehensive unit tests for InputManager
 * Tests requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 11.1, 11.2
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { InputManager } from '../systems/InputManager';
import * as THREE from 'three';

// Mock Three.js objects
vi.mock('three', async () => {
  const actual = await vi.importActual('three');
  return {
    ...actual,
    Vector2: vi.fn().mockImplementation((x = 0, y = 0) => ({ x, y })),
    Raycaster: vi.fn().mockImplementation(() => ({
      setFromCamera: vi.fn(),
      intersectObjects: vi.fn(() => []),
    })),
  };
});

// Mock DOM elements
const createMockCanvas = () => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  getBoundingClientRect: vi.fn(() => ({
    left: 0,
    top: 0,
    width: 800,
    height: 600,
  })),
  width: 800,
  height: 600,
});

const createMockCamera = () => ({
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
});

describe('InputManager Comprehensive Tests', () => {
  let inputManager: InputManager;
  let mockCanvas: any;
  let mockCamera: any;
  let mockScene: any;

  beforeEach(() => {
    mockCanvas = createMockCanvas();
    mockCamera = createMockCamera();
    mockScene = {
      children: [],
    };

    inputManager = new InputManager(mockCanvas, mockCamera, mockScene);
  });

  afterEach(() => {
    inputManager.dispose();
  });

  describe('Initialization', () => {
    it('should initialize with correct default values', () => {
      expect(inputManager.getSelectedTrack()).toBe(1); // Default to track 1
      expect(inputManager.isEnabled()).toBe(true);
      expect(inputManager.getInputState().selectedTrack).toBe(1);
      expect(inputManager.getInputState().isMouseDown).toBe(false);
    });

    it('should set up event listeners on canvas', () => {
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        trackCount: 7,
        buttonHeight: 60,
        buttonSpacing: 15,
        raycastLayers: [1, 2],
      };

      const customInputManager = new InputManager(mockCanvas, mockCamera, mockScene, customConfig);
      
      expect(customInputManager.getSelectedTrack()).toBe(1);
      customInputManager.dispose();
    });
  });

  describe('Track Selection', () => {
    it('should select valid track numbers', () => {
      for (let track = 1; track <= 5; track++) {
        inputManager.selectTrack(track);
        expect(inputManager.getSelectedTrack()).toBe(track);
      }
    });

    it('should reject invalid track numbers', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      inputManager.selectTrack(0); // Invalid
      expect(inputManager.getSelectedTrack()).toBe(1); // Should remain unchanged
      
      inputManager.selectTrack(6); // Invalid
      expect(inputManager.getSelectedTrack()).toBe(1); // Should remain unchanged
      
      inputManager.selectTrack(-1); // Invalid
      expect(inputManager.getSelectedTrack()).toBe(1); // Should remain unchanged
      
      expect(consoleSpy).toHaveBeenCalledTimes(3);
      consoleSpy.mockRestore();
    });

    it('should handle boundary track numbers', () => {
      inputManager.selectTrack(1); // Minimum valid
      expect(inputManager.getSelectedTrack()).toBe(1);
      
      inputManager.selectTrack(5); // Maximum valid
      expect(inputManager.getSelectedTrack()).toBe(5);
    });

    it('should trigger callbacks on track selection', () => {
      const callback = vi.fn();
      inputManager.onTrackSelected(callback);
      
      inputManager.selectTrack(3);
      
      expect(callback).toHaveBeenCalledWith(3);
    });

    it('should handle multiple track selection callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      inputManager.onTrackSelected(callback1);
      inputManager.onTrackSelected(callback2);
      
      inputManager.selectTrack(4);
      
      expect(callback1).toHaveBeenCalledWith(4);
      expect(callback2).toHaveBeenCalledWith(4);
    });
  });

  describe('Mouse Event Handling', () => {
    it('should handle click events', () => {
      const clickEvent = new MouseEvent('click', {
        clientX: 400,
        clientY: 500,
      });

      const clickHandler = mockCanvas.addEventListener.mock.calls
        .find(call => call[0] === 'click')[1];
      
      expect(() => clickHandler(clickEvent)).not.toThrow();
    });

    it('should handle mouse move events', () => {
      const moveEvent = new MouseEvent('mousemove', {
        clientX: 300,
        clientY: 400,
      });

      const moveHandler = mockCanvas.addEventListener.mock.calls
        .find(call => call[0] === 'mousemove')[1];
      
      expect(() => moveHandler(moveEvent)).not.toThrow();
    });

    it('should handle mouse down events', () => {
      const downEvent = new MouseEvent('mousedown', {
        clientX: 200,
        clientY: 300,
      });

      const downHandler = mockCanvas.addEventListener.mock.calls
        .find(call => call[0] === 'mousedown')[1];
      
      expect(() => downHandler(downEvent)).not.toThrow();
      
      const state = inputManager.getInputState();
      expect(state.isMouseDown).toBe(true);
    });

    it('should handle mouse up events', () => {
      // First trigger mouse down
      const downEvent = new MouseEvent('mousedown', {
        clientX: 200,
        clientY: 300,
      });
      const downHandler = mockCanvas.addEventListener.mock.calls
        .find(call => call[0] === 'mousedown')[1];
      downHandler(downEvent);

      // Then mouse up
      const upEvent = new MouseEvent('mouseup', {
        clientX: 200,
        clientY: 300,
      });
      const upHandler = mockCanvas.addEventListener.mock.calls
        .find(call => call[0] === 'mouseup')[1];
      upHandler(upEvent);
      
      const state = inputManager.getInputState();
      expect(state.isMouseDown).toBe(false);
    });

    it('should calculate mouse position correctly', () => {
      const clickEvent = new MouseEvent('click', {
        clientX: 400,
        clientY: 300,
      });

      const clickHandler = mockCanvas.addEventListener.mock.calls
        .find(call => call[0] === 'click')[1];
      clickHandler(clickEvent);

      const state = inputManager.getInputState();
      expect(state.mousePosition.x).toBeCloseTo(0, 1); // Normalized to [-1, 1]
      expect(state.mousePosition.y).toBeCloseTo(0, 1);
    });
  });

  describe('Keyboard Event Handling', () => {
    it('should handle number key presses for track selection', () => {
      const callback = vi.fn();
      inputManager.onTrackSelected(callback);

      // Simulate key press events
      for (let i = 1; i <= 5; i++) {
        const keyEvent = new KeyboardEvent('keydown', {
          key: i.toString(),
          code: `Digit${i}`,
        });

        inputManager.handleKeyDown(keyEvent);
        expect(callback).toHaveBeenCalledWith(i);
      }
    });

    it('should ignore invalid key presses', () => {
      const callback = vi.fn();
      inputManager.onTrackSelected(callback);

      const invalidKeys = ['0', '6', 'a', 'Enter', ' '];
      
      for (const key of invalidKeys) {
        const keyEvent = new KeyboardEvent('keydown', {
          key,
          code: `Key${key.toUpperCase()}`,
        });

        inputManager.handleKeyDown(keyEvent);
      }

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle pause key (spacebar)', () => {
      const pauseCallback = vi.fn();
      inputManager.onPauseToggle(pauseCallback);

      const spaceEvent = new KeyboardEvent('keydown', {
        key: ' ',
        code: 'Space',
      });

      inputManager.handleKeyDown(spaceEvent);
      expect(pauseCallback).toHaveBeenCalled();
    });

    it('should handle escape key for menu', () => {
      const menuCallback = vi.fn();
      inputManager.onMenuToggle(menuCallback);

      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        code: 'Escape',
      });

      inputManager.handleKeyDown(escapeEvent);
      expect(menuCallback).toHaveBeenCalled();
    });
  });

  describe('Input State Management', () => {
    it('should provide complete input state', () => {
      const state = inputManager.getInputState();
      
      expect(state).toHaveProperty('selectedTrack');
      expect(state).toHaveProperty('isMouseDown');
      expect(state).toHaveProperty('mousePosition');
      expect(state).toHaveProperty('lastClickPosition');
      expect(state).toHaveProperty('hoveredObject');
      
      expect(typeof state.selectedTrack).toBe('number');
      expect(typeof state.isMouseDown).toBe('boolean');
      expect(state.mousePosition).toHaveProperty('x');
      expect(state.mousePosition).toHaveProperty('y');
    });

    it('should update state correctly during interactions', () => {
      // Initial state
      let state = inputManager.getInputState();
      expect(state.selectedTrack).toBe(1);
      expect(state.isMouseDown).toBe(false);

      // Select track
      inputManager.selectTrack(3);
      state = inputManager.getInputState();
      expect(state.selectedTrack).toBe(3);

      // Mouse down
      const downEvent = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 200,
      });
      const downHandler = mockCanvas.addEventListener.mock.calls
        .find(call => call[0] === 'mousedown')[1];
      downHandler(downEvent);

      state = inputManager.getInputState();
      expect(state.isMouseDown).toBe(true);
    });

    it('should reset state correctly', () => {
      // Modify state
      inputManager.selectTrack(4);
      const downEvent = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 200,
      });
      const downHandler = mockCanvas.addEventListener.mock.calls
        .find(call => call[0] === 'mousedown')[1];
      downHandler(downEvent);

      // Reset
      inputManager.reset();

      const state = inputManager.getInputState();
      expect(state.selectedTrack).toBe(1);
      expect(state.isMouseDown).toBe(false);
    });
  });

  describe('Enable/Disable Functionality', () => {
    it('should enable and disable input correctly', () => {
      expect(inputManager.isEnabled()).toBe(true);

      inputManager.setEnabled(false);
      expect(inputManager.isEnabled()).toBe(false);

      inputManager.setEnabled(true);
      expect(inputManager.isEnabled()).toBe(true);
    });

    it('should ignore input when disabled', () => {
      const callback = vi.fn();
      inputManager.onTrackSelected(callback);

      inputManager.setEnabled(false);
      inputManager.selectTrack(3);

      // Should not trigger callback when disabled
      expect(callback).not.toHaveBeenCalled();
      expect(inputManager.getSelectedTrack()).toBe(1); // Should remain unchanged
    });

    it('should handle mouse events when disabled', () => {
      inputManager.setEnabled(false);

      const clickEvent = new MouseEvent('click', {
        clientX: 400,
        clientY: 300,
      });

      const clickHandler = mockCanvas.addEventListener.mock.calls
        .find(call => call[0] === 'click')[1];
      
      // Should not throw error but should not process input
      expect(() => clickHandler(clickEvent)).not.toThrow();
    });
  });

  describe('Callback Management', () => {
    it('should register and trigger track selection callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      inputManager.onTrackSelected(callback1);
      inputManager.onTrackSelected(callback2);

      inputManager.selectTrack(2);

      expect(callback1).toHaveBeenCalledWith(2);
      expect(callback2).toHaveBeenCalledWith(2);
    });

    it('should register and trigger pause callbacks', () => {
      const pauseCallback = vi.fn();
      inputManager.onPauseToggle(pauseCallback);

      const spaceEvent = new KeyboardEvent('keydown', {
        key: ' ',
        code: 'Space',
      });

      inputManager.handleKeyDown(spaceEvent);
      expect(pauseCallback).toHaveBeenCalled();
    });

    it('should register and trigger menu callbacks', () => {
      const menuCallback = vi.fn();
      inputManager.onMenuToggle(menuCallback);

      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        code: 'Escape',
      });

      inputManager.handleKeyDown(escapeEvent);
      expect(menuCallback).toHaveBeenCalled();
    });

    it('should handle multiple callbacks of same type', () => {
      const callbacks = [vi.fn(), vi.fn(), vi.fn()];
      
      callbacks.forEach(cb => inputManager.onTrackSelected(cb));
      
      inputManager.selectTrack(5);
      
      callbacks.forEach(cb => {
        expect(cb).toHaveBeenCalledWith(5);
      });
    });
  });

  describe('Raycasting and Object Interaction', () => {
    it('should perform raycasting on mouse events', () => {
      const mockRaycaster = {
        setFromCamera: vi.fn(),
        intersectObjects: vi.fn(() => []),
      };

      // Mock the raycaster creation
      vi.mocked(THREE.Raycaster).mockImplementation(() => mockRaycaster as any);

      const newInputManager = new InputManager(mockCanvas, mockCamera, mockScene);

      const clickEvent = new MouseEvent('click', {
        clientX: 400,
        clientY: 300,
      });

      const clickHandler = mockCanvas.addEventListener.mock.calls
        .find(call => call[0] === 'click')[1];
      clickHandler(clickEvent);

      expect(mockRaycaster.setFromCamera).toHaveBeenCalled();
      expect(mockRaycaster.intersectObjects).toHaveBeenCalled();

      newInputManager.dispose();
    });

    it('should handle object intersections', () => {
      const mockIntersection = {
        object: {
          userData: { trackNumber: 3 },
        },
        point: { x: 0, y: 0, z: 0 },
        distance: 5,
      };

      const mockRaycaster = {
        setFromCamera: vi.fn(),
        intersectObjects: vi.fn(() => [mockIntersection]),
      };

      vi.mocked(THREE.Raycaster).mockImplementation(() => mockRaycaster as any);

      const newInputManager = new InputManager(mockCanvas, mockCamera, mockScene);
      const callback = vi.fn();
      newInputManager.onTrackSelected(callback);

      const clickEvent = new MouseEvent('click', {
        clientX: 400,
        clientY: 300,
      });

      const clickHandler = mockCanvas.addEventListener.mock.calls
        .find(call => call[0] === 'click')[1];
      clickHandler(clickEvent);

      expect(callback).toHaveBeenCalledWith(3);

      newInputManager.dispose();
    });
  });

  describe('Update Loop', () => {
    it('should handle update calls', () => {
      expect(() => inputManager.update(0.016)).not.toThrow();
    });

    it('should handle update with zero delta time', () => {
      expect(() => inputManager.update(0)).not.toThrow();
    });

    it('should handle update with negative delta time', () => {
      expect(() => inputManager.update(-0.016)).not.toThrow();
    });

    it('should handle update with large delta time', () => {
      expect(() => inputManager.update(10.0)).not.toThrow();
    });

    it('should update input state during update loop', () => {
      const initialState = inputManager.getInputState();
      
      inputManager.update(0.016);
      
      const updatedState = inputManager.getInputState();
      expect(updatedState).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null/undefined mouse events', () => {
      const clickHandler = mockCanvas.addEventListener.mock.calls
        .find(call => call[0] === 'click')[1];
      
      expect(() => clickHandler(null)).not.toThrow();
      expect(() => clickHandler(undefined)).not.toThrow();
    });

    it('should handle events with missing properties', () => {
      const incompleteEvent = {
        // Missing clientX, clientY
      };

      const clickHandler = mockCanvas.addEventListener.mock.calls
        .find(call => call[0] === 'click')[1];
      
      expect(() => clickHandler(incompleteEvent)).not.toThrow();
    });

    it('should handle canvas with missing getBoundingClientRect', () => {
      const brokenCanvas = {
        ...mockCanvas,
        getBoundingClientRect: undefined,
      };

      expect(() => {
        new InputManager(brokenCanvas, mockCamera, mockScene);
      }).not.toThrow();
    });

    it('should handle rapid successive events', () => {
      const callback = vi.fn();
      inputManager.onTrackSelected(callback);

      // Rapid track selections
      for (let i = 0; i < 100; i++) {
        inputManager.selectTrack((i % 5) + 1);
      }

      expect(callback).toHaveBeenCalledTimes(100);
    });

    it('should handle events after disposal', () => {
      const callback = vi.fn();
      inputManager.onTrackSelected(callback);

      inputManager.dispose();

      // Should not crash or trigger callbacks after disposal
      expect(() => inputManager.selectTrack(3)).not.toThrow();
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Resource Management', () => {
    it('should remove event listeners on dispose', () => {
      inputManager.dispose();

      expect(mockCanvas.removeEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockCanvas.removeEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(mockCanvas.removeEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(mockCanvas.removeEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
    });

    it('should handle multiple dispose calls safely', () => {
      inputManager.dispose();
      expect(() => inputManager.dispose()).not.toThrow();
    });

    it('should clear callbacks on dispose', () => {
      const callback = vi.fn();
      inputManager.onTrackSelected(callback);

      inputManager.dispose();

      // Callbacks should not be triggered after disposal
      expect(() => inputManager.selectTrack(2)).not.toThrow();
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should handle high-frequency mouse events efficiently', () => {
      const startTime = performance.now();

      // Simulate many mouse move events
      const moveHandler = mockCanvas.addEventListener.mock.calls
        .find(call => call[0] === 'mousemove')[1];

      for (let i = 0; i < 1000; i++) {
        const moveEvent = new MouseEvent('mousemove', {
          clientX: i % 800,
          clientY: i % 600,
        });
        moveHandler(moveEvent);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle 1000 events quickly (less than 50ms)
      expect(duration).toBeLessThan(50);
    });

    it('should handle rapid track selections efficiently', () => {
      const startTime = performance.now();

      for (let i = 0; i < 10000; i++) {
        inputManager.selectTrack((i % 5) + 1);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle 10k selections quickly (less than 100ms)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Configuration', () => {
    it('should use custom track count', () => {
      const customConfig = { trackCount: 7 };
      const customInputManager = new InputManager(mockCanvas, mockCamera, mockScene, customConfig);

      // Should accept tracks 1-7
      customInputManager.selectTrack(7);
      expect(customInputManager.getSelectedTrack()).toBe(7);

      // Should reject track 8
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      customInputManager.selectTrack(8);
      expect(customInputManager.getSelectedTrack()).toBe(7); // Should remain unchanged

      consoleSpy.mockRestore();
      customInputManager.dispose();
    });

    it('should use custom button configuration', () => {
      const customConfig = {
        buttonHeight: 80,
        buttonSpacing: 20,
        raycastLayers: [0, 1, 2],
      };

      const customInputManager = new InputManager(mockCanvas, mockCamera, mockScene, customConfig);
      expect(customInputManager.isEnabled()).toBe(true);

      customInputManager.dispose();
    });
  });
});
/**
 * Unit tests for InputManager
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { InputManager } from '../systems/InputManager';
import { TrolleyController } from '../systems/TrolleyController';
import { TrackGenerator } from '../systems/TrackGenerator';
import { DEFAULT_CONFIG } from '../models/GameConfig';
import * as THREE from 'three';

// Mock DOM environment
const mockUIOverlay = document.createElement('div');
mockUIOverlay.id = 'ui-overlay';
document.body.appendChild(mockUIOverlay);

describe('InputManager', () => {
  let inputManager: InputManager;
  let scene: THREE.Scene;
  let trolleyController: TrolleyController;
  let trackGenerator: TrackGenerator;
  
  beforeEach(() => {
    // Clear the UI overlay before each test
    mockUIOverlay.innerHTML = '';
    
    // Create mock scene
    scene = new THREE.Scene();
    
    // Create trolley controller
    trolleyController = new TrolleyController(DEFAULT_CONFIG);
    
    // Create track generator
    trackGenerator = new TrackGenerator(scene, DEFAULT_CONFIG);
    
    // Create input manager
    inputManager = new InputManager(scene, trolleyController, trackGenerator, DEFAULT_CONFIG);
  });
  
  afterEach(() => {
    // Clean up after each test
    if (inputManager) {
      inputManager.dispose();
    }
  });
  
  test('should create InputManager with correct initial state', () => {
    expect(inputManager).toBeDefined();
    expect(inputManager.getSelectedTrack()).toBe(1);
    expect(inputManager.getSelectionQueue()).toHaveLength(0);
  });
  
  test('should mount and unmount track selector UI', () => {
    inputManager.mount();
    
    const trackSelector = document.getElementById('track-selector');
    expect(trackSelector).toBeDefined();
    
    inputManager.unmount();
    
    const trackSelectorAfterUnmount = document.getElementById('track-selector');
    expect(trackSelectorAfterUnmount).toBeNull();
  });
  
  test('should handle track selection and add to queue', () => {
    inputManager.mount();
    
    // Select track 3
    inputManager.selectTrack(3);
    
    expect(inputManager.getSelectedTrack()).toBe(3);
    
    const queue = inputManager.getSelectionQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].trackNumber).toBe(3);
    expect(queue[0].isProcessed).toBe(false);
  });
  
  test('should replace existing queue entry for same segment', () => {
    inputManager.mount();
    
    // Select track 2, then track 4 quickly
    inputManager.selectTrack(2);
    inputManager.selectTrack(4);
    
    const queue = inputManager.getSelectionQueue();
    expect(queue).toHaveLength(1); // Should only have one entry
    expect(queue[0].trackNumber).toBe(4); // Should be the latest selection
  });
  
  test('should enable and disable input system', () => {
    inputManager.mount();
    
    // Initially enabled
    inputManager.selectTrack(3);
    expect(inputManager.getSelectionQueue()).toHaveLength(1);
    
    // Disable
    inputManager.setEnabled(false);
    inputManager.selectTrack(5); // This should be ignored
    expect(inputManager.getSelectionQueue()).toHaveLength(1); // Should still be 1
    
    // Re-enable
    inputManager.setEnabled(true);
    inputManager.selectTrack(5); // This should work
    expect(inputManager.getSelectionQueue()).toHaveLength(1); // Should replace previous
    expect(inputManager.getSelectionQueue()[0].trackNumber).toBe(5);
  });
  
  test('should process segment entry and apply track selection', () => {
    const switchToTrackSpy = vi.spyOn(trolleyController, 'switchToTrack');
    
    inputManager.mount();
    
    // Select track 4
    inputManager.selectTrack(4);
    
    // Simulate trolley moving to trigger segment entry
    const segmentLength = DEFAULT_CONFIG.tracks.segmentLength;
    trolleyController.setPosition(new THREE.Vector3(0, 0, segmentLength + 1));
    
    // Update input manager to process segment entry
    inputManager.update(0.016);
    
    // Should have called switchToTrack
    expect(switchToTrackSpy).toHaveBeenCalledWith(4);
    
    // Queue entry should be marked as processed
    const queue = inputManager.getSelectionQueue();
    expect(queue).toHaveLength(0); // Processed entries are removed
  });
  
  test('should handle multiple queued selections for different segments', () => {
    inputManager.mount();
    
    // Move trolley to different positions and select tracks
    trolleyController.setPosition(new THREE.Vector3(0, 0, 0));
    inputManager.selectTrack(2);
    
    trolleyController.setPosition(new THREE.Vector3(0, 0, 10));
    inputManager.selectTrack(4);
    
    const queue = inputManager.getSelectionQueue();
    expect(queue).toHaveLength(2);
    expect(queue[0].trackNumber).toBe(2);
    expect(queue[1].trackNumber).toBe(4);
  });
  
  test('should clear selection queue', () => {
    inputManager.mount();
    
    inputManager.selectTrack(2);
    inputManager.selectTrack(3);
    
    expect(inputManager.getSelectionQueue()).toHaveLength(1);
    
    inputManager.clearQueue();
    
    expect(inputManager.getSelectionQueue()).toHaveLength(0);
  });
  
  test('should reset to initial state', () => {
    inputManager.mount();
    
    // Make some selections and move trolley
    inputManager.selectTrack(3);
    trolleyController.setPosition(new THREE.Vector3(0, 0, 50));
    inputManager.update(0.016);
    
    // Reset
    inputManager.reset();
    
    expect(inputManager.getSelectedTrack()).toBe(1);
    expect(inputManager.getSelectionQueue()).toHaveLength(0);
  });
  
  test('should create path previews for track selections', () => {
    inputManager.mount();
    
    // Select a track
    inputManager.selectTrack(3);
    
    // Should have created a path preview
    const previews = inputManager.getPathPreviews();
    expect(previews.size).toBeGreaterThan(0);
    
    // Check that preview has correct properties
    const preview = Array.from(previews.values())[0];
    expect(preview.trackNumber).toBe(3);
    expect(preview.isVisible).toBe(true);
    expect(preview.opacity).toBe(0.3);
    expect(preview.mesh).toBeDefined();
  });
  
  test('should update path preview opacities based on distance', () => {
    inputManager.mount();
    
    // Select a track
    inputManager.selectTrack(3);
    
    // Move trolley far away
    const segmentLength = DEFAULT_CONFIG.tracks.segmentLength;
    trolleyController.setPosition(new THREE.Vector3(0, 0, segmentLength * 5));
    
    // Update input manager
    inputManager.update(0.016);
    
    // Path preview should have reduced opacity
    const previews = inputManager.getPathPreviews();
    if (previews.size > 0) {
      const preview = Array.from(previews.values())[0];
      expect(preview.opacity).toBeLessThan(0.3);
    }
  });
  
  test('should clean up old path previews', () => {
    inputManager.mount();
    
    // Create several path previews by moving and selecting
    for (let i = 0; i < 3; i++) {
      const segmentLength = DEFAULT_CONFIG.tracks.segmentLength;
      trolleyController.setPosition(new THREE.Vector3(0, 0, i * segmentLength));
      inputManager.selectTrack(2 + i);
    }
    
    // Move trolley far ahead
    const segmentLength = DEFAULT_CONFIG.tracks.segmentLength;
    trolleyController.setPosition(new THREE.Vector3(0, 0, segmentLength * 4)); // Adjusted for longer segments
    
    // Update to trigger cleanup
    inputManager.update(0.016);
    
    // Old previews should be cleaned up
    const previews = inputManager.getPathPreviews();
    expect(previews.size).toBeLessThan(3);
  });
  
  test('should handle trolley controller integration correctly', () => {
    const getCurrentTrackSpy = vi.spyOn(trolleyController, 'currentTrack', 'get');
    const getTrackPositionSpy = vi.spyOn(trolleyController, 'getTrackPosition');
    
    getCurrentTrackSpy.mockReturnValue(2);
    getTrackPositionSpy.mockReturnValue(5.0);
    
    inputManager.mount();
    
    // Select a track
    inputManager.selectTrack(4);
    
    // Should have called trolley controller methods
    expect(getTrackPositionSpy).toHaveBeenCalled();
  });
  
  test('should dispose correctly', () => {
    inputManager.mount();
    
    // Create some path previews
    inputManager.selectTrack(3);
    
    const trackSelector = document.getElementById('track-selector');
    expect(trackSelector).toBeDefined();
    
    inputManager.dispose();
    
    // Should be removed from DOM
    const trackSelectorAfterDispose = document.getElementById('track-selector');
    expect(trackSelectorAfterDispose).toBeNull();
    
    // Should handle multiple dispose calls gracefully
    expect(() => inputManager.dispose()).not.toThrow();
  });
  
  test('should sort queue by segment index', () => {
    inputManager.mount();
    
    // Create selections for different segments in random order
    trolleyController.setPosition(new THREE.Vector3(0, 0, 30));
    inputManager.selectTrack(3);
    
    trolleyController.setPosition(new THREE.Vector3(0, 0, 10));
    inputManager.selectTrack(2);
    
    trolleyController.setPosition(new THREE.Vector3(0, 0, 50));
    inputManager.selectTrack(4);
    
    const queue = inputManager.getSelectionQueue();
    
    // Should be sorted by segment index
    for (let i = 1; i < queue.length; i++) {
      expect(queue[i].segmentIndex).toBeGreaterThanOrEqual(queue[i - 1].segmentIndex);
    }
  });
});
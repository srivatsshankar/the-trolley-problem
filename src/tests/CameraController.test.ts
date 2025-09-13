/**
 * Tests for CameraController
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { CameraController } from '../systems/CameraController';

describe('CameraController', () => {
  let camera: THREE.OrthographicCamera;
  let cameraController: CameraController;
  let target: THREE.Object3D;

  beforeEach(() => {
    // Create orthographic camera
    camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000);
    camera.position.set(15, 15, 15);
    
    // Create camera controller
    cameraController = new CameraController(camera, {
      followDistance: 10,
      followHeight: 15,
      followOffset: 5,
      smoothness: 0.1,
      lookAtTarget: true,
      minFollowDistance: 1
    });
    
    // Create target object
    target = new THREE.Object3D();
    target.position.set(0, 0, 0);
  });

  it('should initialize with correct default config', () => {
    const config = cameraController.getConfig();
    expect(config.followDistance).toBe(10);
    expect(config.followHeight).toBe(15);
    expect(config.followOffset).toBe(5);
    expect(config.smoothness).toBe(0.1);
    expect(config.lookAtTarget).toBe(true);
    expect(config.minFollowDistance).toBe(1);
  });

  it('should set and get target correctly', () => {
    expect(cameraController.getTarget()).toBeNull();
    expect(cameraController.isFollowing()).toBe(false);
    
    cameraController.setTarget(target);
    expect(cameraController.getTarget()).toBe(target);
    expect(cameraController.isFollowing()).toBe(true);
  });

  it('should clear target correctly', () => {
    cameraController.setTarget(target);
    expect(cameraController.isFollowing()).toBe(true);
    
    cameraController.clearTarget();
    expect(cameraController.getTarget()).toBeNull();
    expect(cameraController.isFollowing()).toBe(false);
  });

  it('should update camera position when following target', () => {
    const originalPosition = camera.position.clone();
    
    // Set target and move it
    cameraController.setTarget(target);
    target.position.set(10, 0, 10);
    
    // Update camera (simulate multiple frames for smooth movement)
    for (let i = 0; i < 10; i++) {
      cameraController.update(0.016); // 60fps
    }
    
    // Camera should have moved from original position
    expect(camera.position.equals(originalPosition)).toBe(false);
  });

  it('should not update camera when no target is set', () => {
    const originalPosition = camera.position.clone();
    
    // Update without target
    cameraController.update(0.016);
    
    // Camera should remain in original position
    expect(camera.position.equals(originalPosition)).toBe(true);
  });

  it('should reset camera to original position', () => {
    const originalPosition = camera.position.clone();
    
    // Set target and update camera
    cameraController.setTarget(target);
    target.position.set(10, 0, 10);
    cameraController.update(0.016);
    
    // Reset camera
    cameraController.resetCamera();
    
    // Camera should be back to original position
    expect(camera.position.equals(originalPosition)).toBe(true);
  });

  it('should update config correctly', () => {
    const newConfig = {
      followDistance: 20,
      smoothness: 0.2
    };
    
    cameraController.setConfig(newConfig);
    const config = cameraController.getConfig();
    
    expect(config.followDistance).toBe(20);
    expect(config.smoothness).toBe(0.2);
    // Other values should remain unchanged
    expect(config.followHeight).toBe(15);
    expect(config.followOffset).toBe(5);
  });
});
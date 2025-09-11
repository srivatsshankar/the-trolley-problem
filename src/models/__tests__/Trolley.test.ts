/**
 * Unit tests for Trolley 3D model
 * Tests requirements: 5.4, 5.5, 1.4, 1.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { Trolley, DEFAULT_TROLLEY_CONFIG, createTrolley, type TrolleyConfig } from '../Trolley';

describe('Trolley', () => {
  let trolley: Trolley;
  let config: TrolleyConfig;

  beforeEach(() => {
    config = { ...DEFAULT_TROLLEY_CONFIG };
    trolley = new Trolley(config);
  });

  describe('Initialization', () => {
    it('should create trolley with correct configuration', () => {
      expect(trolley).toBeInstanceOf(Trolley);
      
      const group = trolley.getGroup();
      expect(group).toBeInstanceOf(THREE.Group);
      expect(group.name).toBe('Trolley');
    });

    it('should position trolley above ground level', () => {
      const group = trolley.getGroup();
      expect(group.position.y).toBe(config.wheelRadius);
    });

    it('should create all required components', () => {
      const group = trolley.getGroup();
      const children = group.children;
      
      // Should have body, roof, wheels, windows, bell, and bumper
      expect(children.length).toBeGreaterThan(8); // At least body + roof + 6 wheels + 4 windows + bell + bumper
      
      // Check for specific components
      const componentNames = children.map(child => child.name);
      expect(componentNames).toContain('TrolleyBody');
      expect(componentNames).toContain('TrolleyRoof');
      expect(componentNames).toContain('TrolleyBell');
      expect(componentNames).toContain('TrolleyBumper');
      
      // Check for wheels
      const wheelNames = componentNames.filter(name => name.includes('TrolleyWheel'));
      expect(wheelNames.length).toBe(config.wheelCount * 2); // Left and right side wheels
      
      // Check for windows
      const windowNames = componentNames.filter(name => name.includes('Window'));
      expect(windowNames.length).toBe(4); // Front, back, left, right
    });
  });

  describe('3D Model Components', () => {
    it('should create body with correct dimensions and material', () => {
      const group = trolley.getGroup();
      const body = group.children.find(child => child.name === 'TrolleyBody') as THREE.Mesh;
      
      expect(body).toBeInstanceOf(THREE.Mesh);
      expect(body.geometry).toBeInstanceOf(THREE.BoxGeometry);
      expect(body.material).toBeInstanceOf(THREE.MeshLambertMaterial);
      expect(body.castShadow).toBe(true);
      expect(body.receiveShadow).toBe(true);
      
      const material = body.material as THREE.MeshLambertMaterial;
      expect(material.color.getHex()).toBe(config.colors.body);
    });

    it('should create roof positioned above body', () => {
      const group = trolley.getGroup();
      const roof = group.children.find(child => child.name === 'TrolleyRoof') as THREE.Mesh;
      
      expect(roof).toBeInstanceOf(THREE.Mesh);
      expect(roof.position.y).toBe(config.size.height / 2 + 0.1);
      expect(roof.castShadow).toBe(true);
      
      const material = roof.material as THREE.MeshLambertMaterial;
      expect(material.color.getHex()).toBe(config.colors.roof);
    });

    it('should create wheels with correct count and positioning', () => {
      const group = trolley.getGroup();
      const wheels = group.children.filter(child => child.name.includes('TrolleyWheel'));
      
      expect(wheels.length).toBe(config.wheelCount * 2);
      
      wheels.forEach(wheel => {
        expect(wheel).toBeInstanceOf(THREE.Mesh);
        const mesh = wheel as THREE.Mesh;
        expect(mesh.geometry).toBeInstanceOf(THREE.CylinderGeometry);
        expect(mesh.castShadow).toBe(true);
        expect(mesh.rotation.z).toBe(Math.PI / 2);
        
        const material = mesh.material as THREE.MeshLambertMaterial;
        expect(material.color.getHex()).toBe(config.colors.wheels);
      });
    });

    it('should create windows with transparency', () => {
      const group = trolley.getGroup();
      const windows = group.children.filter(child => child.name.includes('Window'));
      
      expect(windows.length).toBe(4);
      
      windows.forEach(window => {
        expect(window).toBeInstanceOf(THREE.Mesh);
        const mesh = window as THREE.Mesh;
        expect(mesh.geometry).toBeInstanceOf(THREE.PlaneGeometry);
        
        const material = mesh.material as THREE.MeshLambertMaterial;
        expect(material.transparent).toBe(true);
        expect(material.opacity).toBe(0.7);
        expect(material.color.getHex()).toBe(config.colors.windows);
      });
    });

    it('should create decorative elements', () => {
      const group = trolley.getGroup();
      
      const bell = group.children.find(child => child.name === 'TrolleyBell');
      expect(bell).toBeInstanceOf(THREE.Mesh);
      
      const bumper = group.children.find(child => child.name === 'TrolleyBumper');
      expect(bumper).toBeInstanceOf(THREE.Mesh);
    });
  });

  describe('Animation System', () => {
    it('should animate wheel rotation based on speed', () => {
      const group = trolley.getGroup();
      const wheels = group.children.filter(child => child.name.includes('TrolleyWheel')) as THREE.Mesh[];
      
      const initialRotations = wheels.map(wheel => wheel.rotation.x);
      
      trolley.update(0.016, 10); // 60 FPS, speed 10
      
      const newRotations = wheels.map(wheel => wheel.rotation.x);
      
      // All wheels should have rotated
      newRotations.forEach((rotation, index) => {
        expect(rotation).not.toBe(initialRotations[index]);
      });
      
      // All wheels should have the same rotation
      const firstRotation = newRotations[0];
      newRotations.forEach(rotation => {
        expect(rotation).toBeCloseTo(firstRotation, 5);
      });
    });

    it('should apply bobbing animation to trolley position', () => {
      const group = trolley.getGroup();
      const initialY = group.position.y;
      
      // Mock Date.now to control bobbing animation
      const mockNow = vi.spyOn(Date, 'now').mockReturnValue(0);
      
      trolley.update(0.016, 5);
      const firstY = group.position.y;
      
      mockNow.mockReturnValue(500); // Different time
      trolley.update(0.016, 5);
      const secondY = group.position.y;
      
      // Y position should change due to bobbing
      expect(firstY).not.toBe(secondY);
      
      // Both should be close to the base position (wheelRadius)
      expect(Math.abs(firstY - config.wheelRadius)).toBeLessThan(0.1);
      expect(Math.abs(secondY - config.wheelRadius)).toBeLessThan(0.1);
      
      mockNow.mockRestore();
    });

    it('should stop animations when disabled', () => {
      const group = trolley.getGroup();
      const wheels = group.children.filter(child => child.name.includes('TrolleyWheel')) as THREE.Mesh[];
      
      trolley.setAnimating(false);
      
      const initialRotations = wheels.map(wheel => wheel.rotation.x);
      const initialY = group.position.y;
      
      trolley.update(0.016, 10);
      
      const newRotations = wheels.map(wheel => wheel.rotation.x);
      const newY = group.position.y;
      
      // Nothing should have changed
      newRotations.forEach((rotation, index) => {
        expect(rotation).toBe(initialRotations[index]);
      });
      expect(newY).toBe(initialY);
    });
  });

  describe('Position and Rotation', () => {
    it('should set position correctly while maintaining ground clearance', () => {
      const newPosition = new THREE.Vector3(5, 10, 15);
      trolley.setPosition(newPosition);
      
      const group = trolley.getGroup();
      expect(group.position.x).toBe(5);
      expect(group.position.y).toBe(10 + config.wheelRadius); // Should add wheel radius
      expect(group.position.z).toBe(15);
    });

    it('should set rotation correctly', () => {
      const newRotation = new THREE.Euler(0.1, 0.2, 0.3);
      trolley.setRotation(newRotation);
      
      const group = trolley.getGroup();
      expect(group.rotation.x).toBeCloseTo(0.1, 5);
      expect(group.rotation.y).toBeCloseTo(0.2, 5);
      expect(group.rotation.z).toBeCloseTo(0.3, 5);
    });
  });

  describe('Direction Indicators', () => {
    it('should show left direction indicator', () => {
      trolley.showDirectionIndicator('left');
      
      const group = trolley.getGroup();
      const indicator = group.children.find(child => child.name === 'DirectionIndicatorleft');
      
      expect(indicator).toBeInstanceOf(THREE.Mesh);
      const mesh = indicator as THREE.Mesh;
      expect(mesh.position.x).toBeLessThan(0); // Should be on the left side
      expect(mesh.rotation.z).toBe(Math.PI / 2);
      
      const material = mesh.material as THREE.MeshLambertMaterial;
      expect(material.color.getHex()).toBe(0xFF4444); // Red for left
    });

    it('should show right direction indicator', () => {
      trolley.showDirectionIndicator('right');
      
      const group = trolley.getGroup();
      const indicator = group.children.find(child => child.name === 'DirectionIndicatorright');
      
      expect(indicator).toBeInstanceOf(THREE.Mesh);
      const mesh = indicator as THREE.Mesh;
      expect(mesh.position.x).toBeGreaterThan(0); // Should be on the right side
      expect(mesh.rotation.z).toBe(-Math.PI / 2);
      
      const material = mesh.material as THREE.MeshLambertMaterial;
      expect(material.color.getHex()).toBe(0x44FF44); // Green for right
    });

    it('should remove existing indicators when showing new ones', () => {
      trolley.showDirectionIndicator('left');
      trolley.showDirectionIndicator('right');
      
      const group = trolley.getGroup();
      const leftIndicators = group.children.filter(child => child.name === 'DirectionIndicatorleft');
      const rightIndicators = group.children.filter(child => child.name === 'DirectionIndicatorright');
      
      expect(leftIndicators.length).toBe(0); // Left should be removed
      expect(rightIndicators.length).toBe(1); // Right should be present
    });

    it('should remove all indicators when direction is none', () => {
      trolley.showDirectionIndicator('left');
      trolley.showDirectionIndicator('none');
      
      const group = trolley.getGroup();
      const indicators = group.children.filter(child => child.name.includes('DirectionIndicator'));
      
      expect(indicators.length).toBe(0);
    });
  });

  describe('Collision Detection', () => {
    it('should provide bounding box for collision detection', () => {
      const boundingBox = trolley.getBoundingBox();
      
      expect(boundingBox).toBeInstanceOf(THREE.Box3);
      expect(boundingBox.isEmpty()).toBe(false);
      
      // Bounding box should encompass the trolley dimensions
      const size = boundingBox.getSize(new THREE.Vector3());
      expect(size.x).toBeGreaterThan(config.size.width);
      expect(size.y).toBeGreaterThan(config.size.height);
      expect(size.z).toBeGreaterThan(config.size.length);
    });
  });

  describe('Resource Management', () => {
    it('should dispose of all resources properly', () => {
      const group = trolley.getGroup();
      const meshes = group.children.filter(child => child instanceof THREE.Mesh) as THREE.Mesh[];
      
      // Mock dispose methods to track calls
      const geometryDisposeSpy = vi.fn();
      const materialDisposeSpy = vi.fn();
      
      meshes.forEach(mesh => {
        if (mesh.geometry) {
          mesh.geometry.dispose = geometryDisposeSpy;
        }
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(material => {
              material.dispose = materialDisposeSpy;
            });
          } else {
            mesh.material.dispose = materialDisposeSpy;
          }
        }
      });
      
      trolley.dispose();
      
      expect(geometryDisposeSpy).toHaveBeenCalled();
      expect(materialDisposeSpy).toHaveBeenCalled();
    });
  });

  describe('Factory Function', () => {
    it('should create trolley with default configuration', () => {
      const defaultTrolley = createTrolley();
      
      expect(defaultTrolley).toBeInstanceOf(Trolley);
      
      const group = defaultTrolley.getGroup();
      expect(group.name).toBe('Trolley');
    });

    it('should create trolley with custom configuration', () => {
      const customConfig = {
        size: { width: 2.0, height: 1.5, length: 3.0 },
        colors: { body: 0xFF0000, roof: 0x00FF00, wheels: 0x0000FF, windows: 0xFFFF00 }
      };
      
      const customTrolley = createTrolley(customConfig);
      
      expect(customTrolley).toBeInstanceOf(Trolley);
      
      const group = customTrolley.getGroup();
      const body = group.children.find(child => child.name === 'TrolleyBody') as THREE.Mesh;
      const material = body.material as THREE.MeshLambertMaterial;
      
      expect(material.color.getHex()).toBe(0xFF0000);
    });
  });

  describe('Visual Requirements', () => {
    it('should use bright and vivid colors for cartoonish feel', () => {
      const group = trolley.getGroup();
      const body = group.children.find(child => child.name === 'TrolleyBody') as THREE.Mesh;
      const roof = group.children.find(child => child.name === 'TrolleyRoof') as THREE.Mesh;
      
      const bodyMaterial = body.material as THREE.MeshLambertMaterial;
      const roofMaterial = roof.material as THREE.MeshLambertMaterial;
      
      // Check that colors are bright (high saturation/value)
      expect(bodyMaterial.color.getHex()).toBe(DEFAULT_TROLLEY_CONFIG.colors.body);
      expect(roofMaterial.color.getHex()).toBe(DEFAULT_TROLLEY_CONFIG.colors.roof);
    });

    it('should be suitable for isometric camera view', () => {
      const boundingBox = trolley.getBoundingBox();
      const size = boundingBox.getSize(new THREE.Vector3());
      
      // Trolley should have reasonable proportions for isometric view
      expect(size.x).toBeGreaterThan(0.5);
      expect(size.y).toBeGreaterThan(0.5);
      expect(size.z).toBeGreaterThan(1.0);
      
      // Should not be too large for the game view
      expect(size.x).toBeLessThan(3.0);
      expect(size.y).toBeLessThan(3.0);
      expect(size.z).toBeLessThan(5.0);
    });

    it('should cast and receive shadows for depth perception', () => {
      const group = trolley.getGroup();
      const meshes = group.children.filter(child => child instanceof THREE.Mesh) as THREE.Mesh[];
      
      // Most meshes should cast shadows
      const shadowCasters = meshes.filter(mesh => mesh.castShadow);
      expect(shadowCasters.length).toBeGreaterThan(0);
      
      // Body should receive shadows
      const body = meshes.find(mesh => mesh.name === 'TrolleyBody');
      expect(body?.receiveShadow).toBe(true);
    });
  });
});
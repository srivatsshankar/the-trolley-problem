/**
 * Tests for Person class
 * Verifies requirements: 6.3, 6.4
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { 
  Person, 
  PersonConfig, 
  DEFAULT_PERSON_CONFIG, 
  PERSON_COLOR_VARIATIONS,
  createPersonWithVariation,
  createPerson
} from '../Person';

// Mock Three.js for testing
vi.mock('three', () => ({
  Vector3: vi.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
    x, y, z,
    clone: vi.fn().mockReturnThis(),
    copy: vi.fn().mockReturnThis(),
    distanceTo: vi.fn().mockReturnValue(1.0),
    set: vi.fn().mockReturnThis()
  })),
  Group: vi.fn().mockImplementation(() => ({
    position: { copy: vi.fn(), x: 0, y: 0, z: 0 },
    rotation: { z: 0, y: 0 },
    scale: { y: 1 },
    add: vi.fn(),
    remove: vi.fn(),
    traverse: vi.fn(),
    visible: true,
    userData: {},
    parent: null
  })),
  Box3: vi.fn().mockImplementation(() => ({
    setFromObject: vi.fn(),
    intersectsBox: vi.fn().mockReturnValue(false),
    containsPoint: vi.fn().mockReturnValue(false),
    expandByScalar: vi.fn().mockReturnThis(),
    clone: vi.fn().mockReturnThis()
  })),
  BoxGeometry: vi.fn(),
  SphereGeometry: vi.fn(),
  CylinderGeometry: vi.fn(),
  MeshLambertMaterial: vi.fn().mockImplementation(() => ({
    color: { multiplyScalar: vi.fn(), setHex: vi.fn() },
    emissive: { setHex: vi.fn() },
    dispose: vi.fn()
  })),
  Mesh: vi.fn().mockImplementation(() => ({
    position: { copy: vi.fn(), set: vi.fn(), x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { y: 1 },
    castShadow: true,
    receiveShadow: true,
    name: '',
    geometry: { dispose: vi.fn() },
    material: { dispose: vi.fn() }
  }))
}));

describe('Person', () => {
  let mockPosition: THREE.Vector3;

  beforeEach(() => {
    mockPosition = new THREE.Vector3(1, 2, 3);
    vi.clearAllMocks();
  });

  describe('Person Creation', () => {
    test('should create person with correct properties', () => {
      const config: PersonConfig = {
        ...DEFAULT_PERSON_CONFIG,
        position: mockPosition
      };
      
      const person = new Person(config);

      expect(person.id).toBeGreaterThanOrEqual(0);
      expect(person.position).toBeDefined();
      expect(person.boundingBox).toBeDefined();
      expect(person.isHit).toBe(false);
    });

    test('should create people with unique IDs', () => {
      const config: PersonConfig = {
        ...DEFAULT_PERSON_CONFIG,
        position: mockPosition
      };
      
      const person1 = new Person(config);
      const person2 = new Person(config);

      expect(person1.id).not.toBe(person2.id);
    });

    test('should use default configurations correctly', () => {
      const person = createPerson(mockPosition);

      expect(person.id).toBeGreaterThanOrEqual(0);
      expect(person.isHit).toBe(false);
    });
  });

  describe('Person with Variation Creation', () => {
    test('should create person with random appearance variation', () => {
      const person = createPersonWithVariation(mockPosition);

      expect(person.id).toBeGreaterThanOrEqual(0);
      expect(person.isHit).toBe(false);
    });

    test('should create different appearances over multiple calls', () => {
      const people = Array.from({ length: 10 }, () => createPersonWithVariation(mockPosition));
      
      // All people should be valid
      people.forEach(person => {
        expect(person.id).toBeGreaterThanOrEqual(0);
        expect(person.isHit).toBe(false);
      });

      // Should have unique IDs
      const ids = people.map(p => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(people.length);
    });
  });

  describe('Person Properties', () => {
    test('should return correct center position', () => {
      const person = createPerson(mockPosition);
      const center = person.getCenter();

      expect(center).toBeDefined();
    });

    test('should return correct size', () => {
      const person = createPerson(mockPosition);
      const size = person.getSize();

      expect(size.width).toBe(DEFAULT_PERSON_CONFIG.size.width);
      expect(size.height).toBe(DEFAULT_PERSON_CONFIG.size.height);
      expect(size.depth).toBe(DEFAULT_PERSON_CONFIG.size.depth);
    });

    test('should update position correctly', () => {
      const person = createPerson(mockPosition);
      const newPosition = new THREE.Vector3(5, 6, 7);
      
      person.setPosition(newPosition);
      
      // Position should be updated
      expect(person.position).toBeDefined();
    });

    test('should control visibility', () => {
      const person = createPerson(mockPosition);
      
      person.setVisible(false);
      person.setVisible(true);
      
      // Should not throw errors
      expect(person.isPersonDisposed()).toBe(false);
    });

    test('should control animations', () => {
      const person = createPerson(mockPosition);
      
      person.setAnimating(false);
      person.setAnimating(true);
      
      // Should not throw errors
      expect(person.isPersonDisposed()).toBe(false);
    });
  });

  describe('Person Animations', () => {
    test('should update animations when not hit', () => {
      const person = createPerson(mockPosition);
      
      // Should not throw errors
      person.update(0.016); // 60 FPS delta time
      
      expect(person.isHit).toBe(false);
    });

    test('should stop animations when hit', () => {
      const person = createPerson(mockPosition);
      
      person.markAsHit();
      person.update(0.016);
      
      expect(person.isHit).toBe(true);
    });
  });

  describe('Collision Detection', () => {
    test('should detect bounding box collision', () => {
      const person = createPerson(mockPosition);
      const mockBox = new THREE.Box3();
      
      // Mock the collision detection
      person.boundingBox.intersectsBox = vi.fn().mockReturnValue(true);
      
      const collision = person.checkCollision(mockBox);
      expect(collision).toBe(true);
    });

    test('should detect point collision with tolerance', () => {
      const person = createPerson(mockPosition);
      const testPoint = new THREE.Vector3(1, 2, 3);
      
      // Mock the point collision
      person.boundingBox.containsPoint = vi.fn().mockReturnValue(true);
      
      const collision = person.checkPointCollision(testPoint, 0.1);
      expect(collision).toBe(true);
    });

    test('should not detect collision when not intersecting', () => {
      const person = createPerson(mockPosition);
      const mockBox = new THREE.Box3();
      
      // Mock no collision
      person.boundingBox.intersectsBox = vi.fn().mockReturnValue(false);
      
      const collision = person.checkCollision(mockBox);
      expect(collision).toBe(false);
    });
  });

  describe('Person Hit State', () => {
    test('should mark person as hit', () => {
      const person = createPerson(mockPosition);
      
      expect(person.isHit).toBe(false);
      
      person.markAsHit();
      
      expect(person.isHit).toBe(true);
    });

    test('should handle multiple hit calls safely', () => {
      const person = createPerson(mockPosition);
      
      person.markAsHit();
      person.markAsHit(); // Should not cause issues
      
      expect(person.isHit).toBe(true);
    });
  });

  describe('Person Cloning', () => {
    test('should clone person at new position', () => {
      const person = createPerson(mockPosition);
      const newPosition = new THREE.Vector3(10, 11, 12);
      
      const clonedPerson = person.clone(newPosition);
      
      expect(clonedPerson.id).not.toBe(person.id);
      expect(clonedPerson.isHit).toBe(false);
    });

    test('should clone person with appearance variation', () => {
      const person = createPerson(mockPosition);
      const newPosition = new THREE.Vector3(10, 11, 12);
      const variation = { clothing: 0xFF0000 }; // Red clothing
      
      const clonedPerson = person.clone(newPosition, variation);
      
      expect(clonedPerson.id).not.toBe(person.id);
      expect(clonedPerson.isHit).toBe(false);
    });
  });

  describe('Resource Management', () => {
    test('should dispose resources properly', () => {
      const person = createPerson(mockPosition);
      
      expect(person.isPersonDisposed()).toBe(false);
      
      person.dispose();
      
      expect(person.isPersonDisposed()).toBe(true);
    });

    test('should handle multiple dispose calls safely', () => {
      const person = createPerson(mockPosition);
      
      person.dispose();
      person.dispose(); // Should not cause issues
      
      expect(person.isPersonDisposed()).toBe(true);
    });
  });

  describe('Three.js Integration', () => {
    test('should create proper Three.js group', () => {
      const person = createPerson(mockPosition);
      const group = person.getGroup();

      expect(group).toBeDefined();
      expect(group.userData.type).toBe('person');
      expect(group.userData.id).toBe(person.id);
    });

    test('should have proper mesh properties', () => {
      const person = createPerson(mockPosition);
      const group = person.getGroup();

      expect(group).toBeDefined();
      // Group should have been configured properly
      expect(group.position).toBeDefined();
    });
  });

  describe('Color Variations', () => {
    test('should have valid color variations', () => {
      expect(PERSON_COLOR_VARIATIONS.clothing.length).toBeGreaterThan(0);
      expect(PERSON_COLOR_VARIATIONS.hair.length).toBeGreaterThan(0);
      expect(PERSON_COLOR_VARIATIONS.skin.length).toBeGreaterThan(0);
      
      // All colors should be valid hex numbers
      PERSON_COLOR_VARIATIONS.clothing.forEach(color => {
        expect(typeof color).toBe('number');
        expect(color).toBeGreaterThanOrEqual(0);
      });
    });

    test('should create people with different color combinations', () => {
      const people = Array.from({ length: 5 }, () => createPersonWithVariation(mockPosition));
      
      // All should be valid people
      people.forEach(person => {
        expect(person.id).toBeGreaterThanOrEqual(0);
        expect(person.isHit).toBe(false);
      });
    });
  });

  describe('Default Configuration', () => {
    test('should have valid default configuration', () => {
      expect(DEFAULT_PERSON_CONFIG.size.width).toBeGreaterThan(0);
      expect(DEFAULT_PERSON_CONFIG.size.height).toBeGreaterThan(0);
      expect(DEFAULT_PERSON_CONFIG.size.depth).toBeGreaterThan(0);
      expect(DEFAULT_PERSON_CONFIG.animationSpeed).toBeGreaterThan(0);
      
      // Colors should be valid hex numbers
      expect(typeof DEFAULT_PERSON_CONFIG.colors.skin).toBe('number');
      expect(typeof DEFAULT_PERSON_CONFIG.colors.clothing).toBe('number');
      expect(typeof DEFAULT_PERSON_CONFIG.colors.hair).toBe('number');
      expect(typeof DEFAULT_PERSON_CONFIG.colors.shoes).toBe('number');
    });
  });
});
/**
 * Test camera configuration and visibility
 * This test verifies that the camera frustum has been increased and the
 * minimum sections in view functionality is working
 */

import { DEFAULT_CONFIG } from '../models/GameConfig';

describe('Camera Visibility Configuration', () => {
  test('should have increased camera frustum size', () => {
    expect(DEFAULT_CONFIG.rendering.cameraFrustumSize).toBe(65);
    expect(DEFAULT_CONFIG.rendering.cameraFrustumSize).toBeGreaterThan(35); // Previous value
  });
  
  test('should configure minimum sections in view', () => {
    expect(DEFAULT_CONFIG.rendering.minSectionsInView).toBe(2.5);
    expect(DEFAULT_CONFIG.rendering.minSectionsInView).toBeGreaterThan(2); // Ensure at least 2 sections
  });
  
  test('should configure preview sections ahead', () => {
    expect(DEFAULT_CONFIG.rendering.previewSectionsAhead).toBe(1.5);
    expect(DEFAULT_CONFIG.rendering.previewSectionsAhead).toBeGreaterThan(1); // Preload ahead
  });
  
  test('should ensure sufficient view distance for minimum sections', () => {
    const { minSectionsInView } = DEFAULT_CONFIG.rendering;
    const { segmentLength } = DEFAULT_CONFIG.tracks;
    
    // Calculate minimum distance needed to show minSectionsInView
    // 1 section = 2.5 segments, so we need minSectionsInView * segmentLength * 2.5
    const minViewDistance = minSectionsInView * segmentLength * 2.5;
    
    expect(minViewDistance).toBe(2.5 * 25.0 * 2.5); // 156.25 units
    expect(DEFAULT_CONFIG.rendering.viewDistance).toBeGreaterThanOrEqual(minViewDistance * 0.9); // Within 10%
  });
});
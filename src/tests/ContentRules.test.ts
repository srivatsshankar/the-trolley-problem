import * as THREE from 'three';
import { describe, it, test, expect } from 'vitest';
import { TrackGenerator } from '../systems/TrackGenerator';
import { DEFAULT_CONFIG, GameConfig } from '../models/GameConfig';

// Helper to build a simple scene
function createScene() {
  return new THREE.Scene();
}

function createTrackGenerator(scene: THREE.Scene, config?: Partial<GameConfig>) {
  const gameConfig: GameConfig = { ...DEFAULT_CONFIG, ...(config || {}) } as GameConfig;
  return new TrackGenerator(scene, gameConfig);
}

function getMultiTrackSegmentIndex(): number {
  // First 3 segments are single track; first multi-track is 3
  return 3;
}

describe('Content generation rules', () => {
  test('Pre-5 sections: all 5 tracks have 1-5 people; one track has 1-2', () => {
    const scene = createScene();
    const tg = createTrackGenerator(scene);

    const segIndex = getMultiTrackSegmentIndex(); // sectionIndex = floor(3/2.5)=1 (<5)
  tg.generateSegment(segIndex);

    // Access PeopleManager via content stats
    // Count people per track in this segment from PeopleManager directly
    const pm = (tg as any).contentManager.getPeopleManager();
    const perTrack: number[] = [];
    for (let i = 0; i < 5; i++) {
      perTrack[i] = pm.getPeopleOnTrack(segIndex, i).length;
    }

    // Each track must have between 1 and 5 people
    perTrack.forEach(count => {
      expect(count).toBeGreaterThanOrEqual(1);
      expect(count).toBeLessThanOrEqual(5);
    });

    // At least one track must have 1-2 people
    const hasOneToTwo = perTrack.some(c => c >= 1 && c <= 2);
    expect(hasOneToTwo).toBe(true);
  });

  test('After 5 sections: exactly one track has barrier and 0 people', () => {
    const scene = createScene();
    const tg = createTrackGenerator(scene);

    // Choose a segment whose sectionIndex >= 5; sectionIndex = floor(idx/2.5)
    const segIndex = Math.ceil(5 * 2.5); // first segment in section 5
  tg.generateSegment(segIndex);

    const cm = (tg as any).contentManager;
    const pm = cm.getPeopleManager();
    const om = cm.getObstacleManager();

    // Count obstacles in this segment
    const obstacles = om.getObstaclesForSegment(segIndex);
    expect(obstacles.length).toBe(1);

    // Find track(s) with obstacles
    const tracksWithObstacle: number[] = [];
    for (let i = 0; i < 5; i++) {
      if (om.hasObstacleOnTrack(segIndex, i)) tracksWithObstacle.push(i);
    }
    expect(tracksWithObstacle.length).toBe(1);

    // Ensure that track has 0 people, others have 1-5
    for (let i = 0; i < 5; i++) {
      const count = pm.getPeopleOnTrack(segIndex, i).length;
      if (tracksWithObstacle.includes(i)) {
        expect(count).toBe(0);
      } else {
        expect(count).toBeGreaterThanOrEqual(1);
        expect(count).toBeLessThanOrEqual(5);
      }
    }
  });

  test('After 20 sections: exactly two tracks have barriers and 0 people each', () => {
    const scene = createScene();
    const tg = createTrackGenerator(scene);

    // Choose a segment whose sectionIndex >= 20
    const segIndex = Math.ceil(20 * 2.5); // first segment in section 20
  tg.generateSegment(segIndex);

    const cm = (tg as any).contentManager;
    const pm = cm.getPeopleManager();
    const om = cm.getObstacleManager();

    const obstacles = om.getObstaclesForSegment(segIndex);
    expect(obstacles.length).toBe(2);

    const tracksWithObstacle: number[] = [];
    for (let i = 0; i < 5; i++) {
      if (om.hasObstacleOnTrack(segIndex, i)) tracksWithObstacle.push(i);
    }
    expect(tracksWithObstacle.length).toBe(2);

    for (let i = 0; i < 5; i++) {
      const count = pm.getPeopleOnTrack(segIndex, i).length;
      if (tracksWithObstacle.includes(i)) {
        expect(count).toBe(0);
      } else {
        expect(count).toBeGreaterThanOrEqual(1);
        expect(count).toBeLessThanOrEqual(5);
      }
    }
  });

  test('Last 0.5 segments of sections should be empty (no people, no barriers)', () => {
    const scene = createScene();
    const tg = createTrackGenerator(scene);

    // Test segments that are in the last 0.5 portion of sections
    // segmentIndex % 2.5 >= 2.0 should be empty
    const testSegments = [
      4,   // segment 4: 4 % 2.5 = 1.5, but we want 2+ so try 5
      5,   // segment 5: 5 % 2.5 = 0.0 (new section, should have content)
      7,   // segment 7: 7 % 2.5 = 2.0 (exactly at boundary - should be empty)
      9,   // segment 9: 9 % 2.5 = 1.5 (should have content)
      10,  // segment 10: 10 % 2.5 = 0.0 (new section, should have content)
      12,  // segment 12: 12 % 2.5 = 2.0 (should be empty)
    ];

    for (const segIndex of testSegments) {
      tg.generateSegment(segIndex);
      
      const cm = (tg as any).contentManager;
      const pm = cm.getPeopleManager();
      const om = cm.getObstacleManager();

      const segmentPositionInSection = segIndex % 2.5;
      const shouldBeEmpty = segmentPositionInSection >= 2.0;

      // Count people and obstacles
      let totalPeople = 0;
      for (let i = 0; i < 5; i++) {
        totalPeople += pm.getPeopleOnTrack(segIndex, i).length;
      }
      const obstacles = om.getObstaclesForSegment(segIndex);

      if (shouldBeEmpty) {
        expect(totalPeople).toBe(0);
        expect(obstacles.length).toBe(0);
      } else {
        // Should have content (this verifies our test logic is correct)
        expect(totalPeople).toBeGreaterThan(0);
      }
    }
  });
});

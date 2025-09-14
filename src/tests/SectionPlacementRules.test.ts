import * as THREE from 'three';
import { describe, test, expect } from 'vitest';
import { TrackGenerator } from '../systems/TrackGenerator';
import { DEFAULT_CONFIG, GameConfig } from '../models/GameConfig';

function createScene() {
  return new THREE.Scene();
}

function createTrackGenerator(scene: THREE.Scene, config?: Partial<GameConfig>) {
  const gameConfig: GameConfig = { ...DEFAULT_CONFIG, ...(config || {}) } as GameConfig;
  return new TrackGenerator(scene, gameConfig);
}

function getSectionBounds(cfg: GameConfig, segIndex: number) {
  const portionLength = cfg.tracks.segmentLength;
  const sectionLength = portionLength * 2.5;
  const sectionIndex = Math.floor((segIndex * portionLength) / sectionLength);
  const sectionStartZ = sectionIndex * sectionLength;
  const allowedStartZ = sectionStartZ + sectionLength * 0.15;
  const allowedEndZ = sectionStartZ + sectionLength * 0.65;
  return { sectionStartZ, allowedStartZ, allowedEndZ, portionLength };
}

describe('Section placement constraints (15%-65%)', () => {
  test('People are spawned only within [15%, 65%] of the section', () => {
    const scene = createScene();
    const tg = createTrackGenerator(scene);
    const cfg = (tg as any).gameConfig as GameConfig;

    // Use multi-track segments with posInSection 0.0 and 1.0 (seg 5 and 6)
    const segmentsToCheck = [5, 6];

    for (const segIndex of segmentsToCheck) {
      tg.generateSegment(segIndex);

      const { allowedStartZ, allowedEndZ } = getSectionBounds(cfg, segIndex);
      const cm = (tg as any).contentManager;
      const pm = cm.getPeopleManager();

      for (let track = 0; track < 5; track++) {
        const people = pm.getPeopleOnTrack(segIndex, track);
        for (const person of people) {
          const z = person.getCenter().z;
          expect(z).toBeGreaterThanOrEqual(allowedStartZ);
          expect(z).toBeLessThanOrEqual(allowedEndZ);
        }
      }
    }
  });

  test('No content is generated in the last 35% of the section (>= 65%)', () => {
    const scene = createScene();
    const tg = createTrackGenerator(scene);

    // Segment with posInSection 2.0 must be empty
    const segIndex = 7; // 7 % 2.5 = 2.0
    tg.generateSegment(segIndex);

    const cm = (tg as any).contentManager;
    const pm = cm.getPeopleManager();
    const om = cm.getObstacleManager();

    let totalPeople = 0;
    for (let t = 0; t < 5; t++) {
      totalPeople += pm.getPeopleOnTrack(segIndex, t).length;
    }
    const obstacles = om.getObstaclesForSegment(segIndex);

    expect(totalPeople).toBe(0);
    expect(obstacles.length).toBe(0);
  });

  test('Obstacles are spawned within [15%, 65%] after barrier-start section', () => {
    const scene = createScene();
    const tg = createTrackGenerator(scene);
    const cfg = (tg as any).gameConfig as GameConfig;

    // Pick a segment within section >= 5 with posInSection 1.5 (seg 14)
    const segIndex = 14; // sectionIndex = floor(14/2.5)=5, barriers active
    tg.generateSegment(segIndex);

    const { allowedStartZ, allowedEndZ } = getSectionBounds(cfg, segIndex);
    const cm = (tg as any).contentManager;
    const om = cm.getObstacleManager();

    const obstacles = om.getObstaclesForSegment(segIndex);
    // There should be exactly 1 obstacle per existing rules when section >=5 and <20
    expect(obstacles.length).toBe(1);

    for (const obs of obstacles) {
      const z = obs.getCenter().z;
      expect(z).toBeGreaterThanOrEqual(allowedStartZ);
      expect(z).toBeLessThanOrEqual(allowedEndZ);
    }
  });
});

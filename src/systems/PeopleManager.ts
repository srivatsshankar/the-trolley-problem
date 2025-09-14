/**
 * PeopleManager - Manages people placement and distribution on tracks
 * Implements requirements: 6.3, 6.4
 */

import * as THREE from 'three';
import { Person, createPersonWithVariation } from '../models/Person';
import { GameConfigManager } from '../models/GameConfig';

export interface PeopleGenerationResult {
  people: Person[];
  peoplePerTrack: number[];
  totalPeople: number;
  guaranteedSinglePersonTrack: number;
}

export class PeopleManager {
  private people: Map<string, Person> = new Map();
  private scene: THREE.Scene;
  private configManager: GameConfigManager;
  
  constructor(scene: THREE.Scene, configManager: GameConfigManager) {
    this.scene = scene;
    this.configManager = configManager;
  }

  /**
   * Generate people for a multi-track section.
   * New requirements:
  * - Every non-occupied track must have between 1 and 5 people.
  * - Ensure at least one track has only 1-2 people in the section.
  * - Ensure at least one (different) track has 4-5 people in the section (when possible).
  * - Tracks occupied by barriers must have 0 people.
  * - People must be positioned within 15% to 65% of the section length.
   */
  public generatePeopleForSection(sectionIndex: number, tracks: THREE.Object3D[], occupiedTracks: number[] = [], zMin?: number, zMax?: number): PeopleGenerationResult {
    const trackCount = tracks.length;
    
    // Only generate people for multi-track sections (5 tracks)
    if (trackCount !== 5) {
      return {
        people: [],
        peoplePerTrack: [],
        totalPeople: 0,
        guaranteedSinglePersonTrack: -1
      };
    }
    
  const distribution = this.configManager.getPeopleDistribution();
  const portionLength = this.configManager.getConfig().tracks.segmentLength;
  const sectionLength = portionLength * 2.5;
  const sectionStartZ = sectionIndex * sectionLength;
    const availableTracks = this.getAvailableTracks(trackCount, occupiedTracks);
    
    if (availableTracks.length === 0) {
      this.log(`No available tracks for people in section ${sectionIndex} - all tracks occupied by barriers`);
      return {
        people: [],
        peoplePerTrack: new Array(trackCount).fill(0),
        totalPeople: 0,
        guaranteedSinglePersonTrack: -1
      };
    }
    
    // Generate people distribution per non-occupied track
    const peopleDistribution = this.generatePeopleDistribution(
      availableTracks,
      distribution.minPeoplePerTrack,
      distribution.maxPeoplePerTrack
    );
    
    const people: Person[] = [];
    const peoplePerTrack = new Array(trackCount).fill(0);
    let totalPeople = 0;
  let guaranteedSinglePersonTrack = -1;
    
    // Place people on tracks
    for (let trackIndex = 0; trackIndex < trackCount; trackIndex++) {
      if (occupiedTracks.includes(trackIndex)) {
        continue; // Skip tracks with obstacles
      }
      
      const peopleCount = peopleDistribution[trackIndex];
  if (peopleCount === 0) continue;
      
      const track = tracks[trackIndex];
      if (!track) continue;
      
      // Generate people for this track
      // Determine placement bounds: prefer provided zMin/zMax; otherwise clamp to [15%, 65%] of the section
      let minZ = zMin ?? sectionStartZ + sectionLength * 0.15;
      let maxZ = zMax ?? sectionStartZ + sectionLength * 0.65;
      // Ensure bounds are valid
      if (maxZ < minZ) {
        const tmp = minZ; minZ = maxZ; maxZ = tmp;
      }

      const trackPeople = this.generatePeopleForTrack(
        track.position,
        sectionIndex,
        trackIndex,
        peopleCount,
        minZ,
        maxZ
      );
      
      people.push(...trackPeople);
      peoplePerTrack[trackIndex] = peopleCount;
      totalPeople += peopleCount;
      
      // Track the guaranteed single person track
      if (peopleCount >= 1 && peopleCount <= 2 && guaranteedSinglePersonTrack === -1) {
        guaranteedSinglePersonTrack = trackIndex;
      }
    }
    
    this.log(`Generated ${totalPeople} people for section ${sectionIndex}, distribution: [${peoplePerTrack.join(', ')}], available tracks: [${availableTracks.join(', ')}], occupied tracks: [${occupiedTracks.join(', ')}]`);
    
    return {
      people,
      peoplePerTrack,
      totalPeople,
      guaranteedSinglePersonTrack
    };
  }

  /**
   * Get available tracks (not occupied by obstacles)
   */
  private getAvailableTracks(trackCount: number, occupiedTracks: number[]): number[] {
    const allTracks = Array.from({ length: trackCount }, (_, i) => i);
    return allTracks.filter(track => !occupiedTracks.includes(track));
  }

  /**
   * Generate people distribution across available tracks for a single segment
   * Requirements:
   * - Every available (non-occupied) track has 1-5 people
   * - Ensure at least one track has only 1-2 people
   * - Ensure at least one (different) track has 4-5 people, when two or more tracks are available
   */
  private generatePeopleDistribution(
    availableTracks: number[],
    minPeople: number,
    maxPeople: number
  ): number[] {
    const distribution = new Array(5).fill(0);
    
    if (availableTracks.length === 0) {
      return distribution;
    }
    
    // Select one guaranteed track to have 1-2 people
    const guaranteedLowTrack = availableTracks[Math.floor(Math.random() * availableTracks.length)];
    const guaranteedLowCount = Math.floor(Math.random() * 2) + 1; // 1 or 2
    distribution[guaranteedLowTrack] = guaranteedLowCount;

    // If possible, select a different guaranteed track to have 4-5 people
    let guaranteedHighTrack: number | null = null;
    if (availableTracks.length >= 2) {
      const otherTracks = availableTracks.filter(t => t !== guaranteedLowTrack);
      guaranteedHighTrack = otherTracks[Math.floor(Math.random() * otherTracks.length)];
      const guaranteedHighCount = 4 + Math.floor(Math.random() * 2); // 4 or 5
      distribution[guaranteedHighTrack] = guaranteedHighCount;
    }

    // All other available tracks get between min and max people (inclusive)
    for (const trackIndex of availableTracks) {
      if (trackIndex === guaranteedLowTrack || trackIndex === guaranteedHighTrack) continue;
      const count = Math.floor(Math.random() * (maxPeople - minPeople + 1)) + minPeople; // [min, max]
      distribution[trackIndex] = count;
    }

    this.log(`People distribution per section: low track ${guaranteedLowTrack} (${guaranteedLowCount})` + (guaranteedHighTrack !== null ? `, high track ${guaranteedHighTrack} (${distribution[guaranteedHighTrack]})` : '') + `, others in [${minPeople}, ${maxPeople}]`);
    return distribution;
  }

  /**
   * Generate people for a specific track
   */
  private generatePeopleForTrack(
    trackPosition: THREE.Vector3,
  _sectionIndex: number,
    trackIndex: number,
    peopleCount: number,
    zMin: number,
    zMax: number
  ): Person[] {
    const people: Person[] = [];
    const config = this.configManager.getConfig();
  const trackWidth = config.tracks.width;
    
    // Calculate positions for people along the track
    const positions = this.calculatePeoplePositions(
      trackPosition,
      zMin,
      zMax,
      trackWidth,
      peopleCount
    );
    
      // Create people at calculated positions
    for (let i = 0; i < peopleCount; i++) {
      const position = positions[i];
      const person = createPersonWithVariation(position);
      
      // Add to scene
      this.scene.add(person.getGroup());
      
      // Store person with unique key
        // Key by the actual railway portion (segment) index based on Z position
        const portionLength = this.configManager.getConfig().tracks.segmentLength;
        const segmentKeyIndex = Math.floor(position.z / portionLength);
        const personKey = `${segmentKeyIndex}_${trackIndex}_${i}`;
      this.people.set(personKey, person);
      
      people.push(person);
    }
    
    return people;
  }

  /**
   * Calculate positions for people within the current segment's bounds
   */
  private calculatePeoplePositions(
    trackPosition: THREE.Vector3,
    zMin: number,
    zMax: number,
    _trackWidth: number,
    peopleCount: number
  ): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    const segStart = zMin;
    const segEnd = zMax;

    // Guard against invalid ranges
    if (segEnd <= segStart) {
      return positions;
    }

    if (peopleCount === 1) {
      // Single person: place randomly within this segment
      const randomZ = segStart + Math.random() * (segEnd - segStart);
      positions.push(new THREE.Vector3(trackPosition.x, trackPosition.y + 0.8, randomZ));
    } else {
      // Multiple people: distribute evenly within this segment
      const spacing = (segEnd - segStart) / (peopleCount + 1);
      for (let i = 0; i < peopleCount; i++) {
        positions.push(new THREE.Vector3(trackPosition.x, trackPosition.y + 0.8, segStart + spacing * (i + 1)));
      }
    }

    return positions;
  }

  /**
   * Update all people animations
   */
  public updatePeopleAnimations(deltaTime: number): void {
    this.people.forEach(person => {
      person.update(deltaTime);
    });
  }

  /**
   * Get people for a specific segment
   */
  public getPeopleForSegment(segmentIndex: number): Person[] {
    const people: Person[] = [];
    
    this.people.forEach((person, key) => {
      const [segIdx] = key.split('_').map(Number);
      if (segIdx === segmentIndex) {
        people.push(person);
      }
    });
    
    return people;
  }

  /**
   * Get people on a specific track in a segment
   */
  public getPeopleOnTrack(segmentIndex: number, trackIndex: number): Person[] {
    const people: Person[] = [];
    
    this.people.forEach((person, key) => {
      const [segIdx, trackIdx] = key.split('_').map(Number);
      if (segIdx === segmentIndex && trackIdx === trackIndex) {
        people.push(person);
      }
    });
    
    return people;
  }

  /**
   * Get all people within a distance from a position
   */
  public getPeopleNearPosition(position: THREE.Vector3, maxDistance: number): Person[] {
    const nearbyPeople: Person[] = [];
    
    this.people.forEach(person => {
      const distance = person.getCenter().distanceTo(position);
      if (distance <= maxDistance) {
        nearbyPeople.push(person);
      }
    });
    
    return nearbyPeople;
  }

  /**
   * Check collision between a bounding box and all people
   */
  public checkCollisionWithPeople(boundingBox: THREE.Box3): Person[] {
    const hitPeople: Person[] = [];
    
    this.people.forEach(person => {
      if (!person.isHit && person.checkCollision(boundingBox)) {
        person.markAsHit();
        hitPeople.push(person);
      }
    });
    
    return hitPeople;
  }

  /**
   * Check collision between a point and all people
   */
  public checkPointCollisionWithPeople(point: THREE.Vector3, tolerance: number = 0.2): Person[] {
    const hitPeople: Person[] = [];
    
    this.people.forEach(person => {
      if (!person.isHit && person.checkPointCollision(point, tolerance)) {
        person.markAsHit();
        hitPeople.push(person);
      }
    });
    
    return hitPeople;
  }

  /**
   * Get count of people hit and avoided in a segment
   */
  public getSegmentPeopleStats(segmentIndex: number): { hit: number; avoided: number; total: number } {
    let hit = 0;
    let total = 0;
    
    this.people.forEach((person, key) => {
      const [segIdx] = key.split('_').map(Number);
      if (segIdx === segmentIndex) {
        total++;
        if (person.isHit) {
          hit++;
        }
      }
    });
    
    return {
      hit,
      avoided: total - hit,
      total
    };
  }

  /**
   * Remove people for a specific section (for cleanup)
   */
  public removePeopleForSection(sectionIndex: number): void {
    const keysToRemove: string[] = [];
    
    this.people.forEach((person, key) => {
      const [storedSegmentIdx] = key.split('_').map(Number);
      const portionLength = this.configManager.getConfig().tracks.segmentLength;
      const sectionLength = portionLength * 2.5;
      const sectionOfStored = Math.floor((storedSegmentIdx * portionLength) / sectionLength);
      if (sectionOfStored === sectionIndex) {
        // Remove from scene
        this.scene.remove(person.getGroup());
        
        // Dispose resources
        person.dispose();
        
        keysToRemove.push(key);
      }
    });
    
    // Remove from map
    keysToRemove.forEach(key => this.people.delete(key));
    
    if (keysToRemove.length > 0) {
      this.log(`Removed ${keysToRemove.length} people from section ${sectionIndex}`);
    }
  }

  /**
   * Update people visibility based on distance
   */
  public updatePeopleVisibility(currentPosition: THREE.Vector3, viewDistance: number): void {
    this.people.forEach(person => {
      const distance = person.getCenter().distanceTo(currentPosition);
      const shouldBeVisible = distance <= viewDistance;
      person.setVisible(shouldBeVisible);
    });
  }

  /**
   * Get statistics about managed people
   */
  public getPeopleStats(): {
    totalPeople: number;
    hitPeople: number;
    avoidedPeople: number;
    peopleBySegment: Record<number, { total: number; hit: number; avoided: number }>;
  } {
    const stats = {
      totalPeople: this.people.size,
      hitPeople: 0,
      avoidedPeople: 0,
      peopleBySegment: {} as Record<number, { total: number; hit: number; avoided: number }>
    };
    
    this.people.forEach((person, key) => {
      const [segmentIndex] = key.split('_').map(Number);
      
      // Initialize segment stats if not exists
      if (!stats.peopleBySegment[segmentIndex]) {
        stats.peopleBySegment[segmentIndex] = { total: 0, hit: 0, avoided: 0 };
      }
      
      // Count totals
      stats.peopleBySegment[segmentIndex].total++;
      
      if (person.isHit) {
        stats.hitPeople++;
        stats.peopleBySegment[segmentIndex].hit++;
      } else {
        stats.avoidedPeople++;
        stats.peopleBySegment[segmentIndex].avoided++;
      }
    });
    
    return stats;
  }

  /**
   * Create test person for testing purposes
   */
  public createTestPerson(
    segmentIndex: number,
    trackIndex: number,
    position: THREE.Vector3
  ): Person {
    const person = createPersonWithVariation(position);
    
    // Add to scene
    this.scene.add(person.getGroup());
    
    // Store person
    const key = `${segmentIndex}_${trackIndex}_test`;
    this.people.set(key, person);
    
    this.log(`Created test person at segment ${segmentIndex}, track ${trackIndex}`);
    
    return person;
  }

  /**
   * Clear all people
   */
  public clearAllPeople(): void {
    this.people.forEach(person => {
      this.scene.remove(person.getGroup());
      person.dispose();
    });
    
    this.people.clear();
    this.log('Cleared all people');
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this.log('Disposing PeopleManager...');
    this.clearAllPeople();
  }

  /**
   * Logging utility
   */
  private log(message: string): void {
    console.log(`[PeopleManager] ${message}`);
  }
}
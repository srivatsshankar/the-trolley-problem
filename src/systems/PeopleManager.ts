/**
 * PeopleManager - Manages people placement and distribution on tracks
 * Implements requirements: 6.3, 6.4
 */

import * as THREE from 'three';
import { Person, createPersonWithVariation } from '../models/Person';
import { GameConfigManager } from '../models/GameConfig';
import { TrackSegment } from './TrackGenerator';

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
   * Generate people for a track segment
   * Requirements: 6.3, 6.4 - 1-5 people per track, one track with exactly 1
   */
  public generatePeopleForSegment(segment: TrackSegment, segmentIndex: number, occupiedTracks: number[] = []): PeopleGenerationResult {
    // const _config = this.configManager.getConfig();
    const trackCount = segment.tracks?.length || 0;
    
    // Only generate people for multi-track segments (5 tracks)
    if (trackCount !== 5) {
      return {
        people: [],
        peoplePerTrack: [],
        totalPeople: 0,
        guaranteedSinglePersonTrack: -1
      };
    }
    
    const distribution = this.configManager.getPeopleDistribution();
    const availableTracks = this.getAvailableTracks(trackCount, occupiedTracks);
    
    if (availableTracks.length === 0) {
      this.log(`No available tracks for people in segment ${segmentIndex}`);
      return {
        people: [],
        peoplePerTrack: new Array(trackCount).fill(0),
        totalPeople: 0,
        guaranteedSinglePersonTrack: -1
      };
    }
    
    // Generate people distribution
    const peopleDistribution = this.generatePeopleDistribution(
      availableTracks,
      distribution.minPeoplePerTrack,
      distribution.maxPeoplePerTrack,
      distribution.guaranteedSinglePersonTrack
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
      
      const track = segment.tracks[trackIndex];
      if (!track) continue;
      
      // Generate people for this track
      const trackPeople = this.generatePeopleForTrack(
        track.position,
        segment,
        segmentIndex,
        trackIndex,
        peopleCount
      );
      
      people.push(...trackPeople);
      peoplePerTrack[trackIndex] = peopleCount;
      totalPeople += peopleCount;
      
      // Track the guaranteed single person track
      if (peopleCount === 1 && guaranteedSinglePersonTrack === -1) {
        guaranteedSinglePersonTrack = trackIndex;
      }
    }
    
    this.log(`Generated ${totalPeople} people for segment ${segmentIndex}, distribution: [${peoplePerTrack.join(', ')}]`);
    
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
   * Generate people distribution across available tracks
   * Requirement 6.4: One track with exactly 1 person
   */
  private generatePeopleDistribution(
    availableTracks: number[],
    minPeople: number,
    maxPeople: number,
    guaranteedSingle: boolean
  ): number[] {
    const distribution = new Array(5).fill(0);
    
    if (availableTracks.length === 0) {
      return distribution;
    }
    
    // First, ensure one track has exactly 1 person if required
    if (guaranteedSingle && availableTracks.length > 0) {
      const singlePersonTrack = availableTracks[Math.floor(Math.random() * availableTracks.length)];
      distribution[singlePersonTrack] = 1;
      
      // Remove this track from available tracks for further distribution
      const remainingTracks = availableTracks.filter(track => track !== singlePersonTrack);
      
      // Distribute people on remaining tracks
      for (const trackIndex of remainingTracks) {
        const peopleCount = Math.floor(Math.random() * (maxPeople - minPeople + 1)) + minPeople;
        distribution[trackIndex] = peopleCount;
      }
    } else {
      // Distribute people randomly on all available tracks
      for (const trackIndex of availableTracks) {
        const peopleCount = Math.floor(Math.random() * (maxPeople - minPeople + 1)) + minPeople;
        distribution[trackIndex] = peopleCount;
      }
    }
    
    return distribution;
  }

  /**
   * Generate people for a specific track
   */
  private generatePeopleForTrack(
    trackPosition: THREE.Vector3,
    segment: TrackSegment,
    segmentIndex: number,
    trackIndex: number,
    peopleCount: number
  ): Person[] {
    const people: Person[] = [];
    const config = this.configManager.getConfig();
    const segmentLength = config.tracks.segmentLength;
    const trackWidth = config.tracks.width;
    
    // Calculate positions for people along the track
    const positions = this.calculatePeoplePositions(
      trackPosition,
      segment.startZ,
      segmentLength,
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
      const personKey = `${segmentIndex}_${trackIndex}_${i}`;
      this.people.set(personKey, person);
      
      people.push(person);
    }
    
    return people;
  }

  /**
   * Calculate positions for people along a track
   */
  private calculatePeoplePositions(
    trackPosition: THREE.Vector3,
    segmentStartZ: number,
    segmentLength: number,
    trackWidth: number,
    peopleCount: number
  ): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    
    if (peopleCount === 1) {
      // Single person: place in middle of segment
      const position = new THREE.Vector3(
        trackPosition.x + (Math.random() - 0.5) * trackWidth * 0.8, // Slight random offset
        trackPosition.y + 0.8, // Above track surface
        segmentStartZ + segmentLength * 0.5
      );
      positions.push(position);
    } else {
      // Multiple people: distribute along the track
      const spacing = segmentLength * 0.6 / (peopleCount - 1); // Use 60% of segment length
      const startZ = segmentStartZ + segmentLength * 0.2; // Start 20% into segment
      
      for (let i = 0; i < peopleCount; i++) {
        const position = new THREE.Vector3(
          trackPosition.x + (Math.random() - 0.5) * trackWidth * 0.8, // Random X offset
          trackPosition.y + 0.8, // Above track surface
          startZ + (i * spacing) + (Math.random() - 0.5) * spacing * 0.3 // Slight Z variation
        );
        positions.push(position);
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
   * Remove people for a specific segment (for cleanup)
   */
  public removePeopleForSegment(segmentIndex: number): void {
    const keysToRemove: string[] = [];
    
    this.people.forEach((person, key) => {
      const [segIdx] = key.split('_').map(Number);
      if (segIdx === segmentIndex) {
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
      this.log(`Removed ${keysToRemove.length} people from segment ${segmentIndex}`);
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
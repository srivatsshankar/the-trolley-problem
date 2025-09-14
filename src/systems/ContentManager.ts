/**
 * ContentManager - Coordinates people and barrier generation on tracks
 * Implements the complete track content requirements:
 * - Every track in each multi-track segment must have 1-5 people (unless occupied by a barrier)
 * - After crossing 5 sections: exactly one track has no people and a single barrier
 * - After crossing 20 sections: exactly two tracks have no people and a single barrier each
 * - Barrier types: trolley (blue/green/yellow/orange), rock, or buffer
 */

import * as THREE from 'three';
import { PeopleManager } from './PeopleManager';
import { ObstacleManager } from './ObstacleManager';
import { GameConfigManager } from '../models/GameConfig';

export interface SectionContentResult {
  peopleGenerated: boolean;
  barriersGenerated: boolean;
  barrierCount: number;
  affectedTracks: number[];
}

export interface ContentGenerationConfig {
  barrierStartSection: number; // Section after which barriers start appearing (5)
  highBarrierSection: number;  // Section after which 2 barriers appear (20)
  trolleyColors: number[];     // Available trolley barrier colors
}

export class ContentManager {
  private peopleManager: PeopleManager;
  private obstacleManager: ObstacleManager;
  private configManager: GameConfigManager;
  private config: ContentGenerationConfig;
  
  // Track which sections have been processed
  private processedSections: Set<number> = new Set();
  
  constructor(scene: THREE.Scene, configManager: GameConfigManager) {
    this.configManager = configManager;
    
    // Initialize managers
  this.peopleManager = new PeopleManager(scene, configManager);
  this.obstacleManager = new ObstacleManager(scene, configManager);
    
    // Configuration for content generation
    this.config = {
      barrierStartSection: 5,   // Barriers start after 5 sections
      highBarrierSection: 20,   // 2 barriers start after 20 sections
      trolleyColors: [
        0x4169E1, // Blue
        0x32CD32, // Green  
        0xFFD700, // Yellow
        0xFF8C00  // Orange
      ]
    };
    
    this.log('ContentManager initialized');
  }

  /**
   * Generate content for a track section based on section rules
   * Requirements:
   * - Populate people on every non-occupied track (1-5 per track, total <= 5)
   * - Ensure at least one track has only 1-2 people
   * - Apply barrier rules based on section thresholds (>=5: 1 barrier, >=20: 2 barriers)
   */
  public generateContentForSection(sectionIndex: number, tracks: THREE.Object3D[]): SectionContentResult {
    // Only process multi-track sections (5 tracks)
    if (!tracks || tracks.length !== 5) {
      return {
        peopleGenerated: false,
        barriersGenerated: false,
        barrierCount: 0,
        affectedTracks: []
      };
    }

    // Check if this specific section has already been processed
    if (this.processedSections.has(sectionIndex)) {
      return {
        peopleGenerated: false,
        barriersGenerated: false,
        barrierCount: 0,
        affectedTracks: []
      };
    }

    this.log(`Processing section ${sectionIndex}`);

  // Determine current segment bounds from the first track's Z position
    const cfg = this.configManager.getConfig();
    const portionLength = cfg.tracks.segmentLength;
    const sectionLength = portionLength * 2.5;
    const firstTrackZ = tracks[0].position.z;
    const currentSegmentStartZ = Math.floor(firstTrackZ / portionLength) * portionLength;
    const currentSegmentEndZ = currentSegmentStartZ + portionLength;
    const currentSectionStartZ = Math.floor(firstTrackZ / sectionLength) * sectionLength;
    const posInSectionPortions = (currentSegmentStartZ - currentSectionStartZ) / portionLength;

    // Rule 5 and test: Last 0.5 portion of a section (>= 2.0 portions) must be empty
    if (posInSectionPortions >= 2.0) {
      this.log(`Skipping content for segment at Z=${currentSegmentStartZ} (last 0.5 of section)`);
      this.processedSections.add(sectionIndex);
      return {
        peopleGenerated: false,
        barriersGenerated: false,
        barrierCount: 0,
        affectedTracks: []
      };
    }

    // Calculate allowed placement window within section: 15% to 65%
    const allowedStartZ = currentSectionStartZ + sectionLength * 0.15;
    const allowedEndZ = currentSectionStartZ + sectionLength * 0.65;
    // Clamp to the current railway portion bounds so we don't spill outside this segment
    const clampedZMin = Math.max(currentSegmentStartZ, allowedStartZ);
    const clampedZMax = Math.min(currentSegmentEndZ, allowedEndZ);

    // If the current segment lies completely outside the allowed window, skip content
    if (clampedZMax <= clampedZMin) {
      this.log(`Skipping content for segment at Z=${currentSegmentStartZ} (outside 15%-65% window)`);
      this.processedSections.add(sectionIndex);
      return {
        peopleGenerated: false,
        barriersGenerated: false,
        barrierCount: 0,
        affectedTracks: []
      };
    }

    // Generate barriers first (if applicable) to know which tracks are occupied
    const barrierResult = this.generateBarriersForSection(
      sectionIndex,
      tracks,
      clampedZMin,
      // Place only within allowed window intersected with this segment
      clampedZMax
    );
    
    // Get all occupied tracks (newly generated barriers)
    const allOccupiedTracks = barrierResult.affectedTracks;
    
    // Generate people for this section on non-occupied tracks
    const peopleResult = this.generatePeopleForSection(
      sectionIndex,
      tracks,
      allOccupiedTracks,
      clampedZMin,
      clampedZMax
    );
    this.log(`Generated ${peopleResult.totalPeople} people on non-occupied tracks for section ${sectionIndex}`);

    // Mark this section as processed to avoid reprocessing
    this.processedSections.add(sectionIndex);

    return {
      peopleGenerated: peopleResult.totalPeople > 0,
      barriersGenerated: barrierResult.barrierCount > 0,
      barrierCount: barrierResult.barrierCount,
      affectedTracks: barrierResult.affectedTracks
    };
  }

  /**
   * Generate barriers for a section based on section rules
   */
  private generateBarriersForSection(sectionIndex: number, tracks: THREE.Object3D[], zMin: number, zMax: number): {
    barrierCount: number;
    affectedTracks: number[];
  } {
    // No barriers before crossing the first N sections
    if (sectionIndex < this.config.barrierStartSection) {
      return { barrierCount: 0, affectedTracks: [] };
    }

    // Determine number of barriers based on section
    let barrierCount: number;
    if (sectionIndex >= this.config.highBarrierSection) {
      barrierCount = 2; // 2 barriers after section 20
    } else {
      barrierCount = 1; // 1 barrier after section 5
    }

    // Select random tracks for barriers
    const availableTracks = [0, 1, 2, 3, 4];
  const selectedTracks = this.selectRandomTracks(availableTracks, barrierCount);

    // Generate barriers on selected tracks using ObstacleManager
    for (const trackIndex of selectedTracks) {
      const trackObject = tracks[trackIndex];
      if (!trackObject) continue;
      
      // For section-based generation, we need a representative position.
      // Let's assume the track object's position is the start of the section track.
      const position = this.calculateBarrierPosition(trackObject.position, zMin, zMax);
      // Key obstacle by the actual railway portion (segment) index derived from Z
      const portionLength = this.configManager.getConfig().tracks.segmentLength;
      const segmentIndexForKey = Math.floor(position.z / portionLength);
      this.obstacleManager.createTestObstacle(segmentIndexForKey, trackIndex, 'trolley', position);
    }

    this.log(`Generated ${barrierCount} barriers for section ${sectionIndex} on tracks [${selectedTracks.join(', ')}]`);

    return {
      barrierCount,
      affectedTracks: selectedTracks
    };
  }

  /**
   * Calculate barrier position on track for a given section
   */
  private calculateBarrierPosition(trackPosition: THREE.Vector3, zMin: number, zMax: number): THREE.Vector3 {
    // Safety clamp to ensure we respect [zMin, zMax]
    const minZ = Math.min(zMin, zMax);
    const maxZ = Math.max(zMin, zMax);
    const z = minZ + Math.random() * Math.max(0.0, (maxZ - minZ));
    return new THREE.Vector3(
      trackPosition.x,
      trackPosition.y + 0.5,
      z
    );
  }

  /**
   * Generate people for a section on tracks not occupied by barriers
   */
  private generatePeopleForSection(sectionIndex: number, tracks: THREE.Object3D[], occupiedTracks: number[], zMin?: number, zMax?: number) {
    return this.peopleManager.generatePeopleForSection(sectionIndex, tracks, occupiedTracks, zMin, zMax);
  }

  /**
   * Select random tracks for barriers
   */
  private selectRandomTracks(availableTracks: number[], count: number): number[] {
    const selected: number[] = [];
    const tracks = [...availableTracks];
    
    for (let i = 0; i < Math.min(count, tracks.length); i++) {
      const randomIndex = Math.floor(Math.random() * tracks.length);
      const selectedTrack = tracks.splice(randomIndex, 1)[0];
      selected.push(selectedTrack);
    }
    
    return selected.sort((a, b) => a - b);
  }

  /**
   * Update all managed content
   */
  public update(deltaTime: number): void {
    // Update people animations
    this.peopleManager.updatePeopleAnimations(deltaTime);
  }

  /**
   * Update content visibility based on position
   */
  public updateContentVisibility(currentPosition: THREE.Vector3, viewDistance: number): void {
    this.peopleManager.updatePeopleVisibility(currentPosition, viewDistance);
    this.obstacleManager.updateObstacleVisibility(currentPosition, viewDistance);
  }

  /**
   * Clean up content for old sections
   */
  public cleanupContentForSection(sectionIndex: number): void {
    this.peopleManager.removePeopleForSection(sectionIndex);
    this.obstacleManager.removeObstaclesForSection(sectionIndex);
    
    // Also clean up processed section tracking
    this.processedSections.delete(sectionIndex);
  }

  /**
   * Get people manager for external access
   */
  public getPeopleManager(): PeopleManager {
    return this.peopleManager;
  }

  /**
   * Get obstacle manager for external access
   */
  public getObstacleManager(): ObstacleManager {
    return this.obstacleManager;
  }

  /**
   * Check collisions with all content
   */
  public checkCollisions(boundingBox: THREE.Box3): {
    hitPeople: any[];
    hitObstacle: any;
  } {
    const hitPeople = this.peopleManager.checkCollisionWithPeople(boundingBox);
    const hitObstacle = this.obstacleManager.checkCollisionWithObstacles(boundingBox);
    
    return { hitPeople, hitObstacle };
  }

  /**
   * Get content statistics
   */
  public getContentStats(): {
    people: any;
    obstacles: any;
    processedSections: number[];
  } {
    return {
      people: this.peopleManager.getPeopleStats(),
      obstacles: this.obstacleManager.getObstacleStats(),
      processedSections: Array.from(this.processedSections).sort((a, b) => a - b)
    };
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this.log('Disposing ContentManager...');
    this.peopleManager.dispose();
    this.obstacleManager.dispose();
    this.processedSections.clear();
  }

  /**
   * Logging utility
   */
  private log(message: string): void {
    console.log(`[ContentManager] ${message}`);
  }
}
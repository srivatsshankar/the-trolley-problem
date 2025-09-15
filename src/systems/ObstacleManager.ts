/**
 * ObstacleManager - Manages obstacle placement and generation
 * Implements requirements: 6.1, 6.2, 6.5, 7.4
 */

import * as THREE from 'three';
import { Obstacle, createObstacle, ObstacleType } from '../models/Obstacle';
import { GameConfigManager } from '../models/GameConfig';
import { TrackSegment } from './TrackGenerator';

export interface ObstacleGenerationResult {
  obstacles: Obstacle[];
  barrierCount: number;
  affectedTracks: number[];
}

export class ObstacleManager {
  private obstacles: Map<string, Obstacle> = new Map();
  private scene: THREE.Scene;
  private configManager: GameConfigManager;

  constructor(scene: THREE.Scene, configManager: GameConfigManager) {
    this.scene = scene;
    this.configManager = configManager;
  }

  /**
   * Generate obstacles for a track segment
   * Requirements: 6.1, 6.2 - One barrier per segment initially, alternating between rock and trolley
   */
  public generateObstaclesForSegment(segment: TrackSegment, segmentIndex: number): ObstacleGenerationResult {
    // const _config = this.configManager.getConfig();
    const barrierCount = this.configManager.getBarrierCount(segmentIndex);
    const trackCount = segment.tracks.length;

    // Only generate obstacles for multi-track segments (5 tracks)
    if (trackCount !== 5) {
      return {
        obstacles: [],
        barrierCount: 0,
        affectedTracks: []
      };
    }

    const obstacles: Obstacle[] = [];
    const affectedTracks: number[] = [];

    // Select random tracks for barriers
    const availableTracks = Array.from({ length: trackCount }, (_, i) => i);
    const selectedTracks = this.selectRandomTracks(availableTracks, barrierCount);

    // Determine section index (2.5 segments per section)
    const sectionIndex = Math.floor(segmentIndex / 2.5);

    // Determine obstacle type based purely on section index
    // Since first obstacles appear in section 1, make section 1 = rock, section 2 = trolley, etc.
    // Odd sections (1, 3, 5...) = rock, Even sections (2, 4, 6...) = trolley
    const obstacleType: ObstacleType = (sectionIndex % 2 === 1) ? 'rock' : 'trolley';

    // Generate obstacles on selected tracks
    selectedTracks.forEach((trackIndex) => {
      const track = segment.tracks[trackIndex];
      if (!track) { return; }

      // Calculate obstacle position on the track (positioned within section boundaries)
      const obstaclePosition = this.calculateObstaclePosition(track.position, obstacleType, segmentIndex);

      // Create obstacle with alternating type
      const obstacle = createObstacle(obstacleType, obstaclePosition);

      // Add to scene
      this.scene.add(obstacle.getGroup());

      // Store obstacle with unique key based on section and track
      const obstacleKey = `section_${sectionIndex}_track_${trackIndex}`;
      this.obstacles.set(obstacleKey, obstacle);

      obstacles.push(obstacle);
      affectedTracks.push(trackIndex);
    });

    this.log(`Generated ${obstacles.length} ${obstacleType} obstacles for segment ${segmentIndex} (section ${sectionIndex}) on tracks [${affectedTracks.join(', ')}] at positions: ${obstacles.map(o => `(${o.getCenter().x.toFixed(1)}, ${o.getCenter().y.toFixed(1)}, ${o.getCenter().z.toFixed(1)})`).join(', ')}`);

    return {
      obstacles,
      barrierCount,
      affectedTracks
    };
  }

  /**
   * Select random tracks for obstacle placement
   * Ensures barriers are distributed across different tracks
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
   * Calculate obstacle position on a track based on section positioning
   */
  private calculateObstaclePosition(trackPosition: THREE.Vector3, type: ObstacleType, segmentIndex: number): THREE.Vector3 {
    const config = this.configManager.getConfig();
    const segmentLength = config.tracks.segmentLength;

    // Calculate section boundaries (2.5 segments per section)
    const sectionIndex = Math.floor(segmentIndex / 2.5);
    const sectionLength = segmentLength * 2.5;
    const sectionStartZ = sectionIndex * sectionLength;

    // Place obstacle between 15% and 60% of the section
    const minSectionOffset = sectionLength * 0.15; // 15% from section start
    const maxSectionOffset = sectionLength * 0.60; // 60% from section start
    const sectionOffset = minSectionOffset + Math.random() * (maxSectionOffset - minSectionOffset);

    // Calculate absolute Z position
    const absoluteZ = sectionStartZ + sectionOffset;

    // Railway track constants (should match RailwayTrack.ts and Trolley.ts)
    const RAIL_TOP_HEIGHT = 0.25; // tieHeight (0.15) + railHeight/2 (0.1)
    const RAIL_HALF_HEIGHT = 0.1; // Half of rail height
    const railsTop = RAIL_TOP_HEIGHT + RAIL_HALF_HEIGHT;

    // Compute Y based on obstacle type
    let obstacleY: number;
    if (type === 'trolley') {
      // Match player trolley base height so wheels are visible above rails
      const BODY_HALF = 1.0 / 2; // DEFAULT_OBSTACLE_CONFIGS.trolley.size.height
      const WHEEL_HEIGHT = 0.25; // matches trolley wheel height
      const HOVER_OFFSET_TROLLEY = 0.50; // significantly increased for much better visibility
      obstacleY = railsTop + HOVER_OFFSET_TROLLEY + BODY_HALF + WHEEL_HEIGHT;
    } else {
      // For rocks, place them sitting ON the rails with proper height
      const ROCK_HALF_HEIGHT = 1.5 / 2; // DEFAULT_OBSTACLE_CONFIGS.rock.size.height / 2
      const HOVER_OFFSET_ROCK = 0.25; // Increased from 0.15 for better visibility
      obstacleY = railsTop + HOVER_OFFSET_ROCK + ROCK_HALF_HEIGHT; // Bottom of rock sits on rail surface + offset
    }

    return new THREE.Vector3(
      trackPosition.x,
      obstacleY, // Proper hovering height above rails
      absoluteZ
    );
  }

  /**
   * Get obstacles for a specific section
   */
  public getObstaclesForSection(sectionIndex: number): Obstacle[] {
    const obstacles: Obstacle[] = [];

    this.obstacles.forEach((obstacle, key) => {
      if (key.startsWith(`section_${sectionIndex}_`)) {
        obstacles.push(obstacle);
      }
    });

    return obstacles;
  }

  /**
   * Get obstacles for a specific segment (legacy method - now maps to section)
   */
  public getObstaclesForSegment(segmentIndex: number): Obstacle[] {
    const sectionIndex = Math.floor(segmentIndex / 2.5);
    return this.getObstaclesForSection(sectionIndex);
  }

  /**
   * Get obstacle at specific track position in section
   */
  public getObstacleAtTrack(segmentIndex: number, trackIndex: number): Obstacle | undefined {
    const sectionIndex = Math.floor(segmentIndex / 2.5);
    const key = `section_${sectionIndex}_track_${trackIndex}`;
    return this.obstacles.get(key);
  }

  /**
   * Check if track has obstacle in section
   */
  public hasObstacleOnTrack(segmentIndex: number, trackIndex: number): boolean {
    const sectionIndex = Math.floor(segmentIndex / 2.5);
    const key = `section_${sectionIndex}_track_${trackIndex}`;
    return this.obstacles.has(key);
  }

  /**
   * Get all obstacles within a distance from a position
   */
  public getObstaclesNearPosition(position: THREE.Vector3, maxDistance: number): Obstacle[] {
    const nearbyObstacles: Obstacle[] = [];

    this.obstacles.forEach(obstacle => {
      const distance = obstacle.getCenter().distanceTo(position);
      if (distance <= maxDistance) {
        nearbyObstacles.push(obstacle);
      }
    });

    return nearbyObstacles;
  }

  /**
   * Check collision between a bounding box and all obstacles
   */
  public checkCollisionWithObstacles(boundingBox: THREE.Box3): Obstacle | null {
    for (const obstacle of this.obstacles.values()) {
      if (obstacle.checkCollision(boundingBox)) {
        return obstacle;
      }
    }
    return null;
  }

  /**
   * Check collision between a point and all obstacles
   */
  public checkPointCollisionWithObstacles(point: THREE.Vector3, tolerance: number = 0.1): Obstacle | null {
    for (const obstacle of this.obstacles.values()) {
      if (obstacle.checkPointCollision(point, tolerance)) {
        return obstacle;
      }
    }
    return null;
  }

  /**
   * Remove obstacles for a specific segment (for cleanup) - maps to section
   */
  public removeObstaclesForSegment(segmentIndex: number): void {
    const sectionIndex = Math.floor(segmentIndex / 2.5);
    this.removeObstaclesForSection(sectionIndex);
  }

  /**
   * Remove obstacles for a specific section (for cleanup)
   */
  public removeObstaclesForSection(sectionIndex: number): void {
    const keysToRemove: string[] = [];

    this.obstacles.forEach((obstacle, key) => {
      if (key.startsWith(`section_${sectionIndex}_`)) {
        // Remove from scene
        this.scene.remove(obstacle.getGroup());

        // Dispose resources
        obstacle.dispose();

        keysToRemove.push(key);
      }
    });

    // Remove from map
    keysToRemove.forEach(key => this.obstacles.delete(key));

    if (keysToRemove.length > 0) {
      this.log(`Removed ${keysToRemove.length} obstacles from section ${sectionIndex}`);
    }
  }

  /**
   * Update obstacle visibility based on distance
   */
  public updateObstacleVisibility(currentPosition: THREE.Vector3, viewDistance: number): void {
    this.obstacles.forEach(obstacle => {
      const distance = obstacle.getCenter().distanceTo(currentPosition);
      const shouldBeVisible = distance <= viewDistance;
      obstacle.setVisible(shouldBeVisible);
    });
  }

  /**
   * Get statistics about managed obstacles
   */
  public getObstacleStats(): {
    totalObstacles: number;
    obstaclesByType: Record<ObstacleType, number>;
    obstaclesBySection: Record<number, number>;
  } {
    const stats = {
      totalObstacles: this.obstacles.size,
      obstaclesByType: { rock: 0, trolley: 0 } as Record<ObstacleType, number>,
      obstaclesBySection: {} as Record<number, number>
    };

    this.obstacles.forEach((obstacle, key) => {
      // Count by type
      stats.obstaclesByType[obstacle.type]++;

      // Count by section - extract section index from key format "section_X_track_Y"
      const sectionMatch = key.match(/section_(\d+)_track_\d+/);
      if (sectionMatch) {
        const sectionIndex = parseInt(sectionMatch[1]);
        stats.obstaclesBySection[sectionIndex] = (stats.obstaclesBySection[sectionIndex] || 0) + 1;
      }
    });

    return stats;
  }

  /**
   * Create specific obstacle for testing purposes
   */
  public createTestObstacle(
    segmentIndex: number,
    trackIndex: number,
    type: ObstacleType,
    position: THREE.Vector3
  ): Obstacle {
    const obstacle = createObstacle(type, position);

    // Add to scene
    this.scene.add(obstacle.getGroup());

    // Store obstacle with section-based key
    const sectionIndex = Math.floor(segmentIndex / 2.5);
    const key = `section_${sectionIndex}_track_${trackIndex}`;
    this.obstacles.set(key, obstacle);

    this.log(`Created test ${type} obstacle at segment ${segmentIndex} (section ${sectionIndex}), track ${trackIndex}`);

    return obstacle;
  }

  /**
   * Clear all obstacles
   */
  public clearAllObstacles(): void {
    this.obstacles.forEach(obstacle => {
      this.scene.remove(obstacle.getGroup());
      obstacle.dispose();
    });

    this.obstacles.clear();
    this.log('Cleared all obstacles');
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this.log('Disposing ObstacleManager...');
    this.clearAllObstacles();
  }

  /**
   * Logging utility
   */
  private log(message: string): void {
    console.log(`[ObstacleManager] ${message}`);
  }
}
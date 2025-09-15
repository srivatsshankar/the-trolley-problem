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
  // Persist alternating type after section 5 so even single-obstacle segments flip types over time
  private nextTypeAfterSection5: ObstacleType = 'trolley';

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

    // Determine obstacle type for this segment (all obstacles in segment use same type)
    let obstacleType: ObstacleType;
    if (sectionIndex >= 5) {
      // Use persistent alternation across segments after section 5
      obstacleType = this.nextTypeAfterSection5;
      // Update for next segment
      this.nextTypeAfterSection5 = this.nextTypeAfterSection5 === 'trolley' ? 'rock' : 'trolley';
    } else {
      // Before section 5, alternate by segment parity
      // Even segments (0, 2, 4...) = rock, Odd segments (1, 3, 5...) = trolley
      obstacleType = (segmentIndex % 2 === 0) ? 'rock' : 'trolley';
    }

    // Generate obstacles on selected tracks
    selectedTracks.forEach((trackIndex) => {
      const track = segment.tracks[trackIndex];
      if (!track) { return; }

      // Calculate obstacle position on the track (all obstacles in segment use same type)
      const obstaclePosition = this.calculateObstaclePosition(track.position, segment, obstacleType);

      // Create obstacle with alternating type
      const obstacle = createObstacle(obstacleType, obstaclePosition);

      // Add to scene
      this.scene.add(obstacle.getGroup());

      // Store obstacle with unique key keyed by actual railway portion (segment) index based on Z
      const portionLength = this.configManager.getConfig().tracks.segmentLength;
      const keySegmentIndex = Math.floor(obstaclePosition.z / portionLength);
      const obstacleKey = `${keySegmentIndex}_${trackIndex}`;
      this.obstacles.set(obstacleKey, obstacle);

      obstacles.push(obstacle);
      affectedTracks.push(trackIndex);
    });

    this.log(`Generated ${obstacles.length} ${obstacleType} obstacles for segment ${segmentIndex} on tracks [${affectedTracks.join(', ')}]`);

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
   * Calculate obstacle position on a track
   */
  private calculateObstaclePosition(trackPosition: THREE.Vector3, segment: TrackSegment, type: ObstacleType): THREE.Vector3 {
    const config = this.configManager.getConfig();
    const segmentLength = config.tracks.segmentLength;

    // Place obstacle within the central band of the section rules (approximate per segment)
    // Using 15% to 65% of the segment to align with section constraints when used standalone
    const minOffset = segmentLength * 0.15; // 15% from start
    const maxOffset = segmentLength * 0.65; // 65% from start
    const zOffset = minOffset + Math.random() * (maxOffset - minOffset);

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
      // Keep rocks near ground/track surface; small hover to avoid z-fighting
      const HOVER_OFFSET_ROCK = 0.15;
      obstacleY = railsTop + HOVER_OFFSET_ROCK;
    }

    return new THREE.Vector3(
      trackPosition.x,
      obstacleY, // Proper hovering height above rails
      segment.startZ + zOffset
    );
  }

  /**
   * Get obstacles for a specific segment
   */
  public getObstaclesForSegment(segmentIndex: number): Obstacle[] {
    const obstacles: Obstacle[] = [];

    this.obstacles.forEach((obstacle, key) => {
      const [segIdx] = key.split('_').map(Number);
      if (segIdx === segmentIndex) {
        obstacles.push(obstacle);
      }
    });

    return obstacles;
  }

  /**
   * Get obstacle at specific track position in segment
   */
  public getObstacleAtTrack(segmentIndex: number, trackIndex: number): Obstacle | undefined {
    const key = `${segmentIndex}_${trackIndex}`;
    return this.obstacles.get(key);
  }

  /**
   * Check if track has obstacle in segment
   */
  public hasObstacleOnTrack(segmentIndex: number, trackIndex: number): boolean {
    const key = `${segmentIndex}_${trackIndex}`;
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
   * Remove obstacles for a specific segment (for cleanup)
   */
  public removeObstaclesForSegment(segmentIndex: number): void {
    const keysToRemove: string[] = [];

    this.obstacles.forEach((obstacle, key) => {
      const [segIdx] = key.split('_').map(Number);
      if (segIdx === segmentIndex) {
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
      this.log(`Removed ${keysToRemove.length} obstacles from segment ${segmentIndex}`);
    }
  }

  /**
   * Remove obstacles for a specific section (for cleanup)
   */
  public removeObstaclesForSection(sectionIndex: number): void {
    const keysToRemove: string[] = [];

    this.obstacles.forEach((obstacle, key) => {
      const [secIdx] = key.split('_').map(Number);
      if (secIdx === sectionIndex) {
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
    obstaclesBySegment: Record<number, number>;
  } {
    const stats = {
      totalObstacles: this.obstacles.size,
      obstaclesByType: { rock: 0, trolley: 0 } as Record<ObstacleType, number>,
      obstaclesBySegment: {} as Record<number, number>
    };

    this.obstacles.forEach((obstacle, key) => {
      // Count by type
      stats.obstaclesByType[obstacle.type]++;

      // Count by segment
      const [segmentIndex] = key.split('_').map(Number);
      stats.obstaclesBySegment[segmentIndex] = (stats.obstaclesBySegment[segmentIndex] || 0) + 1;
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

    // Store obstacle
    const key = `${segmentIndex}_${trackIndex}`;
    this.obstacles.set(key, obstacle);

    this.log(`Created test ${type} obstacle at segment ${segmentIndex}, track ${trackIndex}`);

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
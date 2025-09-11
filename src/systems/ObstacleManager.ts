/**
 * ObstacleManager - Manages obstacle placement and generation
 * Implements requirements: 6.1, 6.2, 6.5, 7.4
 */

import * as THREE from 'three';
import { Obstacle, createRandomObstacle, createObstacle, ObstacleType } from '../models/Obstacle';
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
   * Requirements: 6.1, 6.2 - One barrier per segment initially, random type selection
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
    
    // Generate obstacles on selected tracks
    for (const trackIndex of selectedTracks) {
      const track = segment.tracks[trackIndex];
      if (!track) continue;
      
      // Calculate obstacle position on the track
      const obstaclePosition = this.calculateObstaclePosition(track.position, segment);
      
      // Create random obstacle
      const obstacle = createRandomObstacle(obstaclePosition);
      
      // Add to scene
      this.scene.add(obstacle.getGroup());
      
      // Store obstacle with unique key
      const obstacleKey = `${segmentIndex}_${trackIndex}`;
      this.obstacles.set(obstacleKey, obstacle);
      
      obstacles.push(obstacle);
      affectedTracks.push(trackIndex);
    }
    
    this.log(`Generated ${obstacles.length} obstacles for segment ${segmentIndex} on tracks [${affectedTracks.join(', ')}]`);
    
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
  private calculateObstaclePosition(trackPosition: THREE.Vector3, segment: TrackSegment): THREE.Vector3 {
    const config = this.configManager.getConfig();
    const segmentLength = config.tracks.segmentLength;
    
    // Place obstacle randomly within the segment, but not too close to edges
    const minOffset = segmentLength * 0.2; // 20% from start
    const maxOffset = segmentLength * 0.8; // 80% from start
    const zOffset = minOffset + Math.random() * (maxOffset - minOffset);
    
    return new THREE.Vector3(
      trackPosition.x,
      trackPosition.y + 0.5, // Slightly above track
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
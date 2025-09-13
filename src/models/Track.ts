/**
 * Track class - Represents a single track with Three.js mesh generation
 * Implements requirements: 3.1, 3.2, 3.3, 1.5
 * Updated to use realistic railway tracks with rails and ties
 */

import * as THREE from 'three';
import { RailwayTrack, createRailwayTrack, DEFAULT_RAILWAY_CONFIG } from './RailwayTrack';

export interface TrackConfig {
  width: number;
  length: number;
  height: number;
  color: number;
  emissive: number;
  metalness: number;
  roughness: number;
}

/**
 * Track class handles individual track geometry and rendering
 * Now uses realistic railway tracks with rails and wooden ties
 */
export class Track {
  public readonly id: number;
  public readonly position: THREE.Vector3;
  public readonly mesh: THREE.Group; // Changed from Mesh to Group for railway track
  public readonly railwayTrack: RailwayTrack;
  
  private config: TrackConfig;
  private isDisposed: boolean = false;

  constructor(id: number, position: THREE.Vector3, config: TrackConfig) {
    this.id = id;
    this.position = position.clone();
    this.config = config;
    
    // Create railway track with realistic rails and ties
    this.railwayTrack = createRailwayTrack(id, position, this.getColorType(), {
      length: config.length,
      railColor: this.getRailColor(),
      tieColor: this.getTieColor()
    });
    
    // Use the railway track group as the mesh
    this.mesh = this.railwayTrack.group;
  }

  /**
   * Get color type based on track color
   */
  private getColorType(): 'NORMAL' | 'SELECTED' | 'DANGER' {
    if (this.config.color === TRACK_COLORS.SELECTED) return 'SELECTED';
    if (this.config.color === TRACK_COLORS.DANGER) return 'DANGER';
    return 'NORMAL';
  }

  /**
   * Get rail color based on track configuration
   */
  private getRailColor(): number {
    // Map track colors to appropriate rail colors
    switch (this.config.color) {
      case TRACK_COLORS.SELECTED:
        return 0x00AA00; // Dark green for selected
      case TRACK_COLORS.DANGER:
        return 0xCC3300; // Dark red for danger
      default:
        return DEFAULT_RAILWAY_CONFIG.railColor; // Standard steel gray
    }
  }

  /**
   * Get tie color based on track configuration
   */
  private getTieColor(): number {
    // Map track colors to appropriate tie colors
    switch (this.config.color) {
      case TRACK_COLORS.SELECTED:
        return 0x228B22; // Forest green for selected
      case TRACK_COLORS.DANGER:
        return 0x8B0000; // Dark red for danger
      default:
        return DEFAULT_RAILWAY_CONFIG.tieColor; // Standard brown wood
    }
  }

  /**
   * Update track position
   */
  public setPosition(newPosition: THREE.Vector3): void {
    this.position.copy(newPosition);
    this.railwayTrack.setPosition(newPosition);
  }

  /**
   * Get track bounds for collision detection
   */
  public getBounds(): THREE.Box3 {
    return this.railwayTrack.getBounds();
  }

  /**
   * Get track center point
   */
  public getCenter(): THREE.Vector3 {
    return this.railwayTrack.getCenter();
  }

  /**
   * Get track width
   */
  public getWidth(): number {
    return this.railwayTrack.getWidth();
  }

  /**
   * Get track length
   */
  public getLength(): number {
    return this.railwayTrack.getLength();
  }

  /**
   * Check if point is on this track
   */
  public containsPoint(point: THREE.Vector3, tolerance: number = 0.1): boolean {
    return this.railwayTrack.containsPoint(point, tolerance);
  }

  /**
   * Get distance from point to track center
   */
  public distanceToPoint(point: THREE.Vector3): number {
    return this.railwayTrack.distanceToPoint(point);
  }

  /**
   * Update material properties (for dynamic effects)
   */
  public updateMaterial(properties: Partial<{
    color: number;
    emissive: number;
    opacity: number;
  }>): void {
    // Update the track config and recreate if color changed
    if (properties.color !== undefined && properties.color !== this.config.color) {
      this.config.color = properties.color;
      
      // Update railway track colors
      const railColor = this.getRailColor();
      const tieColor = this.getTieColor();
      
      // Update rail materials
      this.railwayTrack.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const material = child.material as THREE.MeshStandardMaterial | THREE.MeshLambertMaterial;
          if (child.userData?.type === 'rail') {
            material.color.setHex(railColor);
          } else if (child.userData?.type === 'tie') {
            material.color.setHex(tieColor);
          }
          material.needsUpdate = true;
        }
      });
    }
  }

  /**
   * Clone this track at a new position
   */
  public clone(newId: number, newPosition: THREE.Vector3): Track {
    return new Track(newId, newPosition, { ...this.config });
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    if (this.isDisposed) return;
    
    this.railwayTrack.dispose();
    
    this.isDisposed = true;
  }

  /**
   * Check if track is disposed
   */
  public isTrackDisposed(): boolean {
    return this.isDisposed;
  }
}

/**
 * Default track configuration with bright, vivid colors
 */
export const DEFAULT_TRACK_CONFIG: TrackConfig = {
  width: 2.0,
  length: 10.0,
  height: 0.2,
  color: 0x4169E1,      // Royal blue - bright and vivid
  emissive: 0x001122,   // Slight blue glow
  metalness: 0.1,       // Slightly metallic
  roughness: 0.3        // Smooth but not mirror-like
};

/**
 * Track color variations for different track types
 */
export const TRACK_COLORS = {
  NORMAL: 0x4169E1,     // Royal blue
  SELECTED: 0x00FF00,   // Bright green
  PREVIEW: 0xFFD700,    // Gold
  DANGER: 0xFF4500,     // Orange red
  SAFE: 0x32CD32        // Lime green
} as const;

/**
 * Utility function to create track with specific color
 */
export function createTrack(
  id: number, 
  position: THREE.Vector3, 
  colorType: keyof typeof TRACK_COLORS = 'NORMAL',
  customConfig?: Partial<TrackConfig>
): Track {
  const config: TrackConfig = {
    ...DEFAULT_TRACK_CONFIG,
    color: TRACK_COLORS[colorType],
    ...customConfig
  };
  
  return new Track(id, position, config);
}
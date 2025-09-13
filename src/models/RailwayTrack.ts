/**
 * RailwayTrack class - Realistic railway track with metal rails and wooden ties
 * Replaces simple blue line tracks with proper railway components
 */

import * as THREE from 'three';

export interface RailwayTrackConfig {
  length: number;
  railWidth: number;
  railHeight: number;
  railSpacing: number;
  tieWidth: number;
  tieHeight: number;
  tieLength: number;
  tieSpacing: number;
  railColor: number;
  tieColor: number;
}

/**
 * RailwayTrack creates realistic railway tracks with metal rails and wooden ties
 */
export class RailwayTrack {
  public readonly id: number;
  public readonly position: THREE.Vector3;
  public readonly group: THREE.Group;
  
  private config: RailwayTrackConfig;
  private rails: THREE.Mesh[] = [];
  private ties: THREE.Mesh[] = [];
  private isDisposed: boolean = false;

  constructor(id: number, position: THREE.Vector3, config: RailwayTrackConfig) {
    this.id = id;
    this.position = position.clone();
    this.config = config;
    
    // Create group to hold all track components
    this.group = new THREE.Group();
    this.group.position.copy(this.position);
    
    // Set user data for identification
    this.group.userData = {
      type: 'railway-track',
      id: this.id
    };
    
    // Create track components
    this.createTies();
    this.createRails();
    
    // Enable shadows
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  /**
   * Create wooden railway ties (sleepers)
   */
  private createTies(): void {
    const tieGeometry = new THREE.BoxGeometry(
      this.config.tieLength,
      this.config.tieHeight,
      this.config.tieWidth
    );
    
    const tieMaterial = new THREE.MeshLambertMaterial({
      color: this.config.tieColor
    });
    
    // Calculate number of ties needed
    const tieCount = Math.floor(this.config.length / this.config.tieSpacing) + 1;
    const startZ = -this.config.length / 2;
    
    for (let i = 0; i < tieCount; i++) {
      const tie = new THREE.Mesh(tieGeometry, tieMaterial);
      
      // Position tie along the track
      tie.position.set(
        0,
        this.config.tieHeight / 2,
        startZ + (i * this.config.tieSpacing)
      );
      
      // Mark as tie for material updates
      tie.userData = { type: 'tie' };
      
      this.ties.push(tie);
      this.group.add(tie);
    }
  }

  /**
   * Create metal railway rails
   */
  private createRails(): void {
    const railGeometry = new THREE.BoxGeometry(
      this.config.railWidth,
      this.config.railHeight,
      this.config.length
    );
    
    const railMaterial = new THREE.MeshStandardMaterial({
      color: this.config.railColor,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x111111
    });
    
    // Create left rail
    const leftRail = new THREE.Mesh(railGeometry, railMaterial);
    leftRail.position.set(
      -this.config.railSpacing / 2,
      this.config.tieHeight + this.config.railHeight / 2,
      0
    );
    leftRail.userData = { type: 'rail' };
    
    // Create right rail
    const rightRail = new THREE.Mesh(railGeometry, railMaterial.clone());
    rightRail.position.set(
      this.config.railSpacing / 2,
      this.config.tieHeight + this.config.railHeight / 2,
      0
    );
    rightRail.userData = { type: 'rail' };
    
    this.rails.push(leftRail, rightRail);
    this.group.add(leftRail);
    this.group.add(rightRail);
  }

  /**
   * Update track position
   */
  public setPosition(newPosition: THREE.Vector3): void {
    this.position.copy(newPosition);
    this.group.position.copy(this.position);
  }

  /**
   * Get track bounds for collision detection
   */
  public getBounds(): THREE.Box3 {
    const box = new THREE.Box3();
    box.setFromObject(this.group);
    return box;
  }

  /**
   * Get track center point
   */
  public getCenter(): THREE.Vector3 {
    return this.position.clone();
  }

  /**
   * Get track width (rail spacing)
   */
  public getWidth(): number {
    return this.config.railSpacing;
  }

  /**
   * Get track length
   */
  public getLength(): number {
    return this.config.length;
  }

  /**
   * Check if point is on this track
   */
  public containsPoint(point: THREE.Vector3, tolerance: number = 0.5): boolean {
    const bounds = this.getBounds();
    bounds.expandByScalar(tolerance);
    return bounds.containsPoint(point);
  }

  /**
   * Get distance from point to track center
   */
  public distanceToPoint(point: THREE.Vector3): number {
    return this.position.distanceTo(point);
  }

  /**
   * Clone this track at a new position
   */
  public clone(newId: number, newPosition: THREE.Vector3): RailwayTrack {
    return new RailwayTrack(newId, newPosition, { ...this.config });
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    if (this.isDisposed) return;
    
    // Dispose geometries and materials
    this.ties.forEach(tie => {
      tie.geometry.dispose();
      if (Array.isArray(tie.material)) {
        tie.material.forEach(mat => mat.dispose());
      } else {
        tie.material.dispose();
      }
    });
    
    this.rails.forEach(rail => {
      rail.geometry.dispose();
      if (Array.isArray(rail.material)) {
        rail.material.forEach(mat => mat.dispose());
      } else {
        rail.material.dispose();
      }
    });
    
    // Remove from parent if it has one
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
    
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
 * Default railway track configuration
 */
export const DEFAULT_RAILWAY_CONFIG: RailwayTrackConfig = {
  length: 10.0,
  railWidth: 0.15,
  railHeight: 0.2,
  railSpacing: 1.435, // Standard gauge (1435mm)
  tieWidth: 0.2,
  tieHeight: 0.15,
  tieLength: 2.5,
  tieSpacing: 0.6, // Ties every 60cm
  railColor: 0x696969, // Dark gray steel
  tieColor: 0x8B4513   // Saddle brown wood
};

/**
 * Railway track color variations
 */
export const RAILWAY_COLORS = {
  NORMAL_RAIL: 0x696969,    // Dark gray steel
  NORMAL_TIE: 0x8B4513,     // Saddle brown
  SELECTED_RAIL: 0x00FF00,  // Bright green
  SELECTED_TIE: 0x228B22,   // Forest green
  DANGER_RAIL: 0xFF4500,    // Orange red
  DANGER_TIE: 0x8B0000      // Dark red
} as const;

/**
 * Utility function to create railway track with specific colors
 */
export function createRailwayTrack(
  id: number, 
  position: THREE.Vector3, 
  colorType: 'NORMAL' | 'SELECTED' | 'DANGER' = 'NORMAL',
  customConfig?: Partial<RailwayTrackConfig>
): RailwayTrack {
  const config: RailwayTrackConfig = {
    ...DEFAULT_RAILWAY_CONFIG,
    railColor: RAILWAY_COLORS[`${colorType}_RAIL` as keyof typeof RAILWAY_COLORS],
    tieColor: RAILWAY_COLORS[`${colorType}_TIE` as keyof typeof RAILWAY_COLORS],
    ...customConfig
  };
  
  return new RailwayTrack(id, position, config);
}
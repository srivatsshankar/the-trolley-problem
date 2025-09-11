/**
 * Track class - Represents a single track with Three.js mesh generation
 * Implements requirements: 3.1, 3.2, 3.3, 1.5
 */

import * as THREE from 'three';

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
 */
export class Track {
  public readonly id: number;
  public readonly position: THREE.Vector3;
  public readonly mesh: THREE.Mesh;
  public readonly geometry: THREE.BufferGeometry;
  public readonly material: THREE.Material;
  
  private config: TrackConfig;
  private isDisposed: boolean = false;

  constructor(id: number, position: THREE.Vector3, config: TrackConfig) {
    this.id = id;
    this.position = position.clone();
    this.config = config;
    
    // Create geometry and material
    this.geometry = this.createGeometry();
    this.material = this.createMaterial();
    
    // Create mesh
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.copy(this.position);
    
    // Enable shadows for depth perception
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    
    // Set user data for identification
    this.mesh.userData = {
      type: 'track',
      id: this.id
    };
  }

  /**
   * Create track geometry with proper dimensions
   */
  private createGeometry(): THREE.BufferGeometry {
    // Create box geometry for the track
    const geometry = new THREE.BoxGeometry(
      this.config.width,
      this.config.height,
      this.config.length
    );
    
    // Add UV coordinates for texturing if needed
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    
    return geometry;
  }

  /**
   * Create bright, vivid material for cartoonish appearance
   */
  private createMaterial(): THREE.Material {
    return new THREE.MeshStandardMaterial({
      color: this.config.color,
      emissive: this.config.emissive,
      metalness: this.config.metalness,
      roughness: this.config.roughness,
      
      // Enable flat shading for cartoonish look
      flatShading: false,
      
      // Ensure material responds to lighting
      transparent: false,
      opacity: 1.0,
      
      // Bright, vivid appearance
      toneMapped: true
    });
  }

  /**
   * Update track position
   */
  public setPosition(newPosition: THREE.Vector3): void {
    this.position.copy(newPosition);
    this.mesh.position.copy(this.position);
  }

  /**
   * Get track bounds for collision detection
   */
  public getBounds(): THREE.Box3 {
    const box = new THREE.Box3();
    box.setFromObject(this.mesh);
    return box;
  }

  /**
   * Get track center point
   */
  public getCenter(): THREE.Vector3 {
    return this.position.clone();
  }

  /**
   * Get track width
   */
  public getWidth(): number {
    return this.config.width;
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
  public containsPoint(point: THREE.Vector3, tolerance: number = 0.1): boolean {
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
   * Update material properties (for dynamic effects)
   */
  public updateMaterial(properties: Partial<{
    color: number;
    emissive: number;
    opacity: number;
  }>): void {
    const material = this.material as THREE.MeshStandardMaterial;
    
    if (properties.color !== undefined) {
      material.color.setHex(properties.color);
    }
    if (properties.emissive !== undefined) {
      material.emissive.setHex(properties.emissive);
    }
    if (properties.opacity !== undefined) {
      material.opacity = properties.opacity;
      material.transparent = properties.opacity < 1.0;
    }
    
    material.needsUpdate = true;
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
    
    this.geometry.dispose();
    this.material.dispose();
    
    // Remove from parent if it has one
    if (this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
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
/**
 * PathPreviewSystem - Handles curved path visualization and preview effects
 * Implements requirements: 5.1, 5.2
 */

import * as THREE from 'three';
import { TrolleyController } from './TrolleyController';
import { GameConfig } from '../models/GameConfig';

export interface PathPreviewConfig {
  previewDistance: number;
  curveSegments: number;
  tubeRadius: number;
  translucentOpacity: number;
  opaqueOpacity: number;
  animationSpeed: number;
  maxPreviewSegments: number;
}

export interface CurvedPath {
  trackNumber: number;
  segmentIndex: number;
  curve: THREE.QuadraticBezierCurve3;
  mesh: THREE.Mesh;
  isTranslucent: boolean;
  opacity: number;
  animationPhase: number;
}

export class PathPreviewSystem {
  private scene: THREE.Scene;
  private trolleyController: TrolleyController;
  private gameConfig: GameConfig;
  private config: PathPreviewConfig;
  
  // Path preview storage
  private activePaths: Map<string, CurvedPath> = new Map();
  
  // Materials for different states
  private translucentMaterial!: THREE.MeshLambertMaterial;
  private opaqueMaterial!: THREE.MeshLambertMaterial;
  private glowMaterial!: THREE.MeshLambertMaterial;
  
  // Animation properties
  private animationTime: number = 0;
  
  constructor(
    scene: THREE.Scene,
    trolleyController: TrolleyController,
    gameConfig: GameConfig,
    config?: Partial<PathPreviewConfig>
  ) {
    this.scene = scene;
    this.trolleyController = trolleyController;
    this.gameConfig = gameConfig;
    
    this.config = {
      previewDistance: 15.0,
      curveSegments: 24,
      tubeRadius: 0.15,
      translucentOpacity: 0.3,
      opaqueOpacity: 1.0,
      animationSpeed: 2.0,
      maxPreviewSegments: 3,
      ...config
    };
    
    this.createMaterials();
    console.log('[PathPreviewSystem] Created with enhanced curved path visualization');
  }
  
  /**
   * Create materials for different path states
   */
  private createMaterials(): void {
    // Translucent material for preview paths
    this.translucentMaterial = new THREE.MeshLambertMaterial({
      color: 0xFFD700, // Gold color
      transparent: true,
      opacity: this.config.translucentOpacity,
      emissive: 0x332200,
      emissiveIntensity: 0.2
    });
    
    // Opaque material for confirmed paths
    this.opaqueMaterial = new THREE.MeshLambertMaterial({
      color: 0xFFA500, // Orange color
      transparent: false,
      opacity: this.config.opaqueOpacity,
      emissive: 0x441100,
      emissiveIntensity: 0.3
    });
    
    // Glowing material for active selection
    this.glowMaterial = new THREE.MeshLambertMaterial({
      color: 0x00FF00, // Bright green
      transparent: true,
      opacity: 0.8,
      emissive: 0x004400,
      emissiveIntensity: 0.5
    });
  }
  
  /**
   * Create curved path preview for track selection
   * Requirement 5.1: Curved path appears translucent before segment
   */
  public createPathPreview(trackNumber: number, segmentIndex: number): void {
    // Validate track number
    if (trackNumber < 1 || trackNumber > this.gameConfig.tracks.count) {
      console.warn(`[PathPreviewSystem] Invalid track number: ${trackNumber}`);
      return;
    }
    
    const pathKey = `${trackNumber}-${segmentIndex}`;
    
    // Remove existing path for this key
    this.removePathPreview(pathKey);
    
    // Calculate path geometry
    const curve = this.createCurvedPath(trackNumber, segmentIndex);
    if (!curve) {
      console.log(`[PathPreviewSystem] No curve needed for track ${trackNumber}, segment ${segmentIndex}`);
      return;
    }
    
    // Create tube geometry for the path
    const geometry = new THREE.TubeGeometry(
      curve,
      this.config.curveSegments,
      this.config.tubeRadius,
      8,
      false
    );
    
    // Create mesh with translucent material
    const mesh = new THREE.Mesh(geometry, this.translucentMaterial.clone());
    mesh.userData = {
      type: 'path-preview',
      trackNumber,
      segmentIndex,
      pathKey
    };
    
    // Add to scene
    this.scene.add(mesh);
    
    // Store path data
    const curvedPath: CurvedPath = {
      trackNumber,
      segmentIndex,
      curve,
      mesh,
      isTranslucent: true,
      opacity: this.config.translucentOpacity,
      animationPhase: 0
    };
    
    this.activePaths.set(pathKey, curvedPath);
    
    console.log(`[PathPreviewSystem] Created translucent path preview for track ${trackNumber}, segment ${segmentIndex}`);
  }
  
  /**
   * Make path preview opaque after button check
   * Requirement 5.2: Path becomes opaque after button check
   */
  public makePathOpaque(trackNumber: number, segmentIndex: number): void {
    const pathKey = `${trackNumber}-${segmentIndex}`;
    const path = this.activePaths.get(pathKey);
    
    if (!path) {
      console.warn(`[PathPreviewSystem] No path found for ${pathKey}`);
      return;
    }
    
    // Update material to opaque
    if (path.mesh.material) {
      (path.mesh.material as THREE.Material).dispose();
    }
    
    path.mesh.material = this.opaqueMaterial.clone();
    path.isTranslucent = false;
    path.opacity = this.config.opaqueOpacity;
    
    console.log(`[PathPreviewSystem] Made path opaque for track ${trackNumber}, segment ${segmentIndex}`);
  }
  
  /**
   * Create curved path geometry between current and target track
   */
  private createCurvedPath(trackNumber: number, segmentIndex: number): THREE.QuadraticBezierCurve3 | null {
    // Validate track number
    if (trackNumber < 1 || trackNumber > this.gameConfig.tracks.count) {
      console.warn(`[PathPreviewSystem] Invalid track number: ${trackNumber}`);
      return null;
    }
    
    const segmentLength = this.gameConfig.tracks.segmentLength;
    const segmentZ = segmentIndex * segmentLength;
    
    // Get current trolley position and track
    const trolleyPos = this.trolleyController.position;
    const currentTrack = this.trolleyController.currentTrack;
    
    // Calculate track positions
    let currentX: number;
    let targetX: number;
    
    try {
      currentX = this.trolleyController.getTrackPosition(currentTrack);
      targetX = this.trolleyController.getTrackPosition(trackNumber);
    } catch (error) {
      console.warn(`[PathPreviewSystem] Error getting track positions:`, error);
      return null;
    }
    
    // If already on target track, no curve needed
    if (Math.abs(currentX - targetX) < 0.1) {
      return null;
    }
    
    // Create curved path with smooth bezier curve
    const startZ = Math.max(trolleyPos.z, segmentZ - segmentLength * 0.8);
    const endZ = segmentZ + segmentLength * 0.2;
    const midZ = (startZ + endZ) / 2;
    
    // Control point for smooth curve
    const controlX = (currentX + targetX) / 2;
    const controlY = 0.3; // Slight elevation for visibility
    
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(currentX, 0.1, startZ),
      new THREE.Vector3(controlX, controlY, midZ),
      new THREE.Vector3(targetX, 0.1, endZ)
    );
    
    return curve;
  }
  
  /**
   * Update path preview system - handles animations and transitions
   */
  public update(deltaTime: number): void {
    this.animationTime += deltaTime * this.config.animationSpeed;
    
    // Update each active path
    this.activePaths.forEach((path, _pathKey) => {
      this.updatePathAnimation(path, deltaTime);
      this.updatePathVisibility(path);
    });
    
    // Clean up old paths
    this.cleanupOldPaths();
  }
  
  /**
   * Update individual path animations
   */
  private updatePathAnimation(path: CurvedPath, deltaTime: number): void {
    path.animationPhase += deltaTime * this.config.animationSpeed;
    
    if (path.isTranslucent) {
      // Animate translucent paths with pulsing effect
      const pulseIntensity = 0.5 + 0.3 * Math.sin(path.animationPhase * 2);
      const material = path.mesh.material as THREE.MeshLambertMaterial;
      
      if (material.emissive) {
        material.emissiveIntensity = pulseIntensity * 0.2;
      }
      
      // Subtle opacity animation
      const baseOpacity = this.config.translucentOpacity;
      material.opacity = baseOpacity + 0.1 * Math.sin(path.animationPhase);
    } else {
      // Animate opaque paths with steady glow
      const material = path.mesh.material as THREE.MeshLambertMaterial;
      if (material.emissive) {
        material.emissiveIntensity = 0.3 + 0.1 * Math.sin(path.animationPhase * 0.5);
      }
    }
  }
  
  /**
   * Update path visibility based on distance and relevance
   */
  private updatePathVisibility(path: CurvedPath): void {
    const trolleyPos = this.trolleyController.position;
    const segmentLength = this.gameConfig.tracks.segmentLength;
    const currentSegment = Math.floor(trolleyPos.z / segmentLength);
    
    // Calculate distance to path segment
    const segmentDistance = Math.abs(path.segmentIndex - currentSegment);
    
    // Fade out distant paths
    let visibilityFactor = 1.0;
    if (segmentDistance > 2) {
      visibilityFactor = Math.max(0.1, 1.0 - (segmentDistance - 2) * 0.3);
    }
    
    // Update material opacity
    const material = path.mesh.material as THREE.MeshLambertMaterial;
    const baseOpacity = path.isTranslucent ? this.config.translucentOpacity : this.config.opaqueOpacity;
    material.opacity = baseOpacity * visibilityFactor;
    
    // Hide very distant or irrelevant paths
    path.mesh.visible = visibilityFactor > 0.05;
  }
  
  /**
   * Remove specific path preview
   */
  public removePathPreview(pathKey: string): void {
    const path = this.activePaths.get(pathKey);
    if (!path) return;
    
    // Remove from scene
    this.scene.remove(path.mesh);
    
    // Dispose of geometry and material
    path.mesh.geometry.dispose();
    if (path.mesh.material) {
      (path.mesh.material as THREE.Material).dispose();
    }
    
    // Remove from storage
    this.activePaths.delete(pathKey);
  }
  
  /**
   * Clean up old and irrelevant paths
   */
  private cleanupOldPaths(): void {
    const trolleyPos = this.trolleyController.position;
    const segmentLength = this.gameConfig.tracks.segmentLength;
    const currentSegment = Math.floor(trolleyPos.z / segmentLength);
    
    const pathsToRemove: string[] = [];
    
    this.activePaths.forEach((path, pathKey) => {
      // Remove paths that are too far behind
      if (path.segmentIndex < currentSegment - 2) {
        pathsToRemove.push(pathKey);
      }
      
      // Remove paths that are too far ahead
      if (path.segmentIndex > currentSegment + this.config.maxPreviewSegments) {
        pathsToRemove.push(pathKey);
      }
    });
    
    pathsToRemove.forEach(pathKey => {
      this.removePathPreview(pathKey);
    });
  }
  
  /**
   * Highlight path for active selection
   */
  public highlightPath(trackNumber: number, segmentIndex: number): void {
    const pathKey = `${trackNumber}-${segmentIndex}`;
    const path = this.activePaths.get(pathKey);
    
    if (!path) return;
    
    // Temporarily change material to glow material
    const originalMaterial = path.mesh.material;
    path.mesh.material = this.glowMaterial.clone();
    
    // Revert after short duration
    setTimeout(() => {
      if (path.mesh.material) {
        (path.mesh.material as THREE.Material).dispose();
      }
      path.mesh.material = originalMaterial;
    }, 500);
  }
  
  /**
   * Get all active path previews
   */
  public getActivePaths(): Map<string, CurvedPath> {
    return new Map(this.activePaths);
  }
  
  /**
   * Clear all path previews
   */
  public clearAllPaths(): void {
    this.activePaths.forEach((_path, pathKey) => {
      this.removePathPreview(pathKey);
    });
    this.activePaths.clear();
    console.log('[PathPreviewSystem] Cleared all path previews');
  }
  
  /**
   * Set path preview visibility
   */
  public setVisible(visible: boolean): void {
    this.activePaths.forEach(path => {
      path.mesh.visible = visible;
    });
  }
  
  /**
   * Get path preview for specific track and segment
   */
  public getPathPreview(trackNumber: number, segmentIndex: number): CurvedPath | undefined {
    const pathKey = `${trackNumber}-${segmentIndex}`;
    return this.activePaths.get(pathKey);
  }
  
  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<PathPreviewConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update materials if opacity changed
    if (newConfig.translucentOpacity !== undefined) {
      this.translucentMaterial.opacity = this.config.translucentOpacity;
    }
    if (newConfig.opaqueOpacity !== undefined) {
      this.opaqueMaterial.opacity = this.config.opaqueOpacity;
    }
  }
  
  /**
   * Dispose of all resources
   */
  public dispose(): void {
    // Clear all paths
    this.clearAllPaths();
    
    // Dispose of materials
    this.translucentMaterial.dispose();
    this.opaqueMaterial.dispose();
    this.glowMaterial.dispose();
    
    console.log('[PathPreviewSystem] Disposed');
  }
}

/**
 * Default configuration for PathPreviewSystem
 */
export const DEFAULT_PATH_PREVIEW_CONFIG: PathPreviewConfig = {
  previewDistance: 15.0,
  curveSegments: 24,
  tubeRadius: 0.15,
  translucentOpacity: 0.3,
  opaqueOpacity: 1.0,
  animationSpeed: 2.0,
  maxPreviewSegments: 3
};

/**
 * Factory function to create PathPreviewSystem
 */
export function createPathPreviewSystem(
  scene: THREE.Scene,
  trolleyController: TrolleyController,
  gameConfig: GameConfig,
  config?: Partial<PathPreviewConfig>
): PathPreviewSystem {
  return new PathPreviewSystem(scene, trolleyController, gameConfig, config);
}
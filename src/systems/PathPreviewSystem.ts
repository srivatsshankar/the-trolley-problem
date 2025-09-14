/**
 * PathPreviewSystem - Handles curved path visualization and preview effects
 * Implements requirements: 5.1, 5.2
 */

import * as THREE from 'three';
import { TrolleyController } from './TrolleyController';
import { GameConfig } from '../models/GameConfig';
import { DEFAULT_RAILWAY_CONFIG } from '../models/RailwayTrack';
import { CurvedRailwayTrack, createCurvedRailwayTrack } from '../models/CurvedRailwayTrack';

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
  curve: THREE.Curve<THREE.Vector3>;
  curvedTrack: CurvedRailwayTrack;
  isTranslucent: boolean;
  opacity: number;
  animationPhase: number;
}

interface TransitionConnector {
  curvedTrack: CurvedRailwayTrack;
  curve: THREE.Curve<THREE.Vector3>;
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
  
  // Temporary connector shown only during actual transition
  private transitionConnector?: TransitionConnector;
  
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
    
    // Create curved railway track with translucent appearance
    const curvedTrack = createCurvedRailwayTrack(curve, 'NORMAL', {
      curveSegments: this.config.curveSegments
    });
    
    // Make it translucent for preview
    curvedTrack.updateColors(0xFFD700, 0xDDDD00); // Gold colors for preview
    curvedTrack.group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const material = child.material as THREE.Material;
        material.transparent = true;
        material.opacity = this.config.translucentOpacity;
      }
    });
    
    curvedTrack.group.userData = {
      type: 'path-preview',
      trackNumber,
      segmentIndex,
      pathKey
    };
    
    // Add to scene
    this.scene.add(curvedTrack.group);
    
    // Store path data
    const curvedPath: CurvedPath = {
      trackNumber,
      segmentIndex,
      curve,
      curvedTrack,
      isTranslucent: true,
      opacity: this.config.translucentOpacity,
      animationPhase: 0
    };
    
    this.activePaths.set(pathKey, curvedPath);
    
    console.log(`[PathPreviewSystem] Created translucent curved railway preview for track ${trackNumber}, segment ${segmentIndex}`);
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
    
    // Update curved track to opaque orange colors
    path.curvedTrack.updateColors(0xFFA500, 0xFF8C00); // Orange colors for confirmed path
    path.curvedTrack.group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const material = child.material as THREE.Material;
        material.transparent = false;
        material.opacity = this.config.opaqueOpacity;
      }
    });
    
    path.isTranslucent = false;
    path.opacity = this.config.opaqueOpacity;
    
    console.log(`[PathPreviewSystem] Made curved railway path opaque for track ${trackNumber}, segment ${segmentIndex}`);
  }
  
  /**
   * Create curved path geometry that matches the exact shape the trolley will follow
   */
  private createCurvedPath(trackNumber: number, segmentIndex: number): THREE.Curve<THREE.Vector3> | null {
    // Validate track number
    if (trackNumber < 1 || trackNumber > this.gameConfig.tracks.count) {
      console.warn(`[PathPreviewSystem] Invalid track number: ${trackNumber}`);
      return null;
    }
    
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
    
    // Calculate the next section boundary where transition will occur
    const sectionLength = this.gameConfig.tracks.segmentLength * 2.5; // Section is 2.5x segment length
    const currentSectionIndex = Math.floor(trolleyPos.z / sectionLength);
    const nextSectionBoundaryZ = (currentSectionIndex + 1) * sectionLength;
    
    // Simulate the exact curve the trolley will create when it transitions
    // Use the same parameters as TrolleyController.switchToTrack()
    const trolleySpeed = Math.max(this.trolleyController.speed, this.trolleyController.baseSpeed);
    const transitionDuration = 1.0; // Same as TrolleyController._transitionDuration
    
    // The trolley's curve starts at the boundary and extends forward based on speed × duration
    const startZ = nextSectionBoundaryZ;
    const endZ = nextSectionBoundaryZ + trolleySpeed * transitionDuration;
    
    // Use the exact same curve generation method as TrolleyController
    const curve = CurvedRailwayTrack.createTrackTransition(
      currentX,
      targetX,
      startZ,
      endZ,
      0.05 // Same elevation as TrolleyController
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
    
    // Remove connector if not transitioning
    if (!this.trolleyController.isTransitioning && this.transitionConnector) {
      this.removeTransitionConnector();
    }
  }
  
  /**
   * Update individual path animations
   */
  private updatePathAnimation(path: CurvedPath, deltaTime: number): void {
    path.animationPhase += deltaTime * this.config.animationSpeed;
    
    if (path.isTranslucent) {
      // Animate translucent paths with pulsing effect
      const baseOpacity = this.config.translucentOpacity;
      const animatedOpacity = baseOpacity + 0.1 * Math.sin(path.animationPhase);
      
      // Update opacity on all materials in the curved track
      path.curvedTrack.group.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const material = child.material as THREE.Material;
          if (material.transparent) {
            material.opacity = animatedOpacity;
          }
        }
      });
    } else {
      // Animate opaque paths with subtle glow variation
      const glowIntensity = 0.8 + 0.2 * Math.sin(path.animationPhase * 0.5);
      
      // Update materials for subtle animation
      path.curvedTrack.group.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const material = child.material as THREE.MeshStandardMaterial | THREE.MeshLambertMaterial;
          if ('emissiveIntensity' in material) {
            material.emissiveIntensity = glowIntensity * 0.1;
          }
        }
      });
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
    
    // Update material opacity on all components
    const baseOpacity = path.isTranslucent ? this.config.translucentOpacity : this.config.opaqueOpacity;
    const targetOpacity = baseOpacity * visibilityFactor;
    
    path.curvedTrack.group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const material = child.material as THREE.Material;
        if (material.transparent || path.isTranslucent) {
          material.opacity = targetOpacity;
        }
      }
    });
    
    // Hide very distant or irrelevant paths
    path.curvedTrack.group.visible = visibilityFactor > 0.05;
  }
  
  /**
   * Remove specific path preview
   */
  public removePathPreview(pathKey: string): void {
    const path = this.activePaths.get(pathKey);
    if (!path) return;
    
    // Remove from scene
    this.scene.remove(path.curvedTrack.group);
    
    // Dispose of curved track resources
    path.curvedTrack.dispose();
    
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
    
    // Store original colors
    const originalColors: { rail: number; tie: number } = { rail: 0, tie: 0 };
    path.curvedTrack.group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const material = child.material as THREE.MeshStandardMaterial | THREE.MeshLambertMaterial;
        if (child.userData.type === 'curved-rail') {
          originalColors.rail = material.color.getHex();
        } else if (child.userData.type === 'curved-tie') {
          originalColors.tie = material.color.getHex();
        }
      }
    });
    
    // Temporarily change to bright green glow
    path.curvedTrack.updateColors(0x00FF00, 0x00AA00);
    
    // Revert after short duration
    setTimeout(() => {
      if (!path.curvedTrack.isTrackDisposed()) {
        path.curvedTrack.updateColors(originalColors.rail, originalColors.tie);
      }
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
      path.curvedTrack.group.visible = visible;
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
   * Update preview color for dynamic color changes based on trolley position
   * Used by InputManager to show yellow/orange preview colors
   */
  public updatePreviewColor(trackNumber: number, color: number, opacity: number): void {
    this.activePaths.forEach((path, pathKey) => {
      if (path.trackNumber === trackNumber && path.isTranslucent) {
        // Update the curved track colors
        path.curvedTrack.group.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const material = child.material as THREE.Material;
            if ('color' in material) {
              (material as any).color.setHex(color);
            }
            if (material.transparent) {
              material.opacity = opacity;
            }
          }
        });
        
        // Update path opacity tracking
        path.opacity = opacity;
      }
    });
  }

  /**
   * Create a temporary curved railway connector matching existing track aesthetics
   */
  public showTransitionConnector(curve: THREE.Curve<THREE.Vector3>): void {
    // Remove previous if any
    this.removeTransitionConnector();

    // Create realistic curved railway track for transition
    const curvedTrack = createCurvedRailwayTrack(curve, 'NORMAL', {
      curveSegments: Math.max(24, this.config.curveSegments),
      tieSpacing: DEFAULT_RAILWAY_CONFIG.tieSpacing * 1.5 // Slightly wider spacing for performance
    });

    curvedTrack.group.userData.type = 'transition-connector';
    this.scene.add(curvedTrack.group);
    
    this.transitionConnector = { curvedTrack, curve };
    
    console.log('[PathPreviewSystem] Created realistic curved railway transition connector');
  }

  public removeTransitionConnector(): void {
    if (!this.transitionConnector) return;
    
    this.scene.remove(this.transitionConnector.curvedTrack.group);
    this.transitionConnector.curvedTrack.dispose();
    this.transitionConnector = undefined;
    
    console.log('[PathPreviewSystem] Removed curved railway transition connector');
  }
  
  /**
   * Dispose of all resources
   */
  public dispose(): void {
    // Clear all paths
    this.clearAllPaths();
    // Remove temporary connector if present
    this.removeTransitionConnector();
    
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
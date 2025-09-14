/**
 * InputManager - Handles input system and track selection logic with queuing
 * Implements requirements: 4.3, 4.4, 4.5, 5.1, 5.2
 */

import { TrackSelector, DEFAULT_TRACK_SELECTOR_CONFIG } from '../components/TrackSelector';
import { TrolleyController } from './TrolleyController';
import { TrackGenerator } from './TrackGenerator';
import { GameConfig } from '../models/GameConfig';
import { PathPreviewSystem, createPathPreviewSystem } from './PathPreviewSystem';
// Removed unused CurvedTrackSystem
import { SegmentTransitionSystem, createSegmentTransitionSystem } from './SegmentTransitionSystem';
import * as THREE from 'three';
import { CurvedRailwayTrack } from '../models/CurvedRailwayTrack';

export interface TrackSelectionQueue {
  trackNumber: number;
  segmentIndex: number;
  isProcessed: boolean;
}

export interface PathPreview {
  trackNumber: number;
  segmentIndex: number;
  isVisible: boolean;
  opacity: number;
  mesh?: THREE.Mesh;
}

export class InputManager {
  private trackSelector: TrackSelector;
  private trolleyController: TrolleyController;
  private gameConfig: GameConfig;
  private scene: THREE.Scene;
  
  // Track selection queuing system
  private selectionQueue: TrackSelectionQueue[] = [];
  private lastProcessedSegment: number = -1;
  
  // Enhanced path preview system
  private pathPreviewSystem: PathPreviewSystem;
  
  // Segment transition system (enforces end-of-segment switching)
  private segmentTransitionSystem: SegmentTransitionSystem;
  
  // Legacy path preview system (for backward compatibility)
  private pathPreviews: Map<number, PathPreview> = new Map();
  private previewMaterial: THREE.Material;
  private solidMaterial: THREE.Material;
  
  // State tracking
  private isEnabled: boolean = true;
  private currentSelectedTrack: number = 1;
  
  constructor(
    scene: THREE.Scene,
    trolleyController: TrolleyController,
    _trackGenerator: TrackGenerator,
    gameConfig: GameConfig
  ) {
    this.scene = scene;
    this.trolleyController = trolleyController;

    this.gameConfig = gameConfig;
    
    // Create track selector UI component
    this.trackSelector = new TrackSelector(DEFAULT_TRACK_SELECTOR_CONFIG);
    
  // Create enhanced path preview system
  this.pathPreviewSystem = createPathPreviewSystem(scene, trolleyController, gameConfig);
    
  // Create segment transition system to enforce end-of-segment switching
  this.segmentTransitionSystem = createSegmentTransitionSystem(trolleyController, gameConfig);
    
    // Create materials for legacy path preview (backward compatibility)
    this.previewMaterial = new THREE.MeshLambertMaterial({
      color: 0xffff00, // Yellow for preview
      transparent: true,
      opacity: 0.3
    });
    
    this.solidMaterial = new THREE.MeshLambertMaterial({
      color: 0xffa500, // Orange for confirmed path
      transparent: false,
      opacity: 1.0
    });
    
    this.setupEventHandlers();

    // Connect trolley transition callbacks to show/hide the physical curved connector
    this.trolleyController.setTransitionCallbacks({
      onStart: (curve) => {
        this.pathPreviewSystem.showTransitionConnector(curve);
      },
      onEnd: () => {
        this.pathPreviewSystem.removeTransitionConnector();
      }
    });
    console.log('[InputManager] Created with enhanced track selection and path preview system');
  }
  
  /**
   * Set up event handlers for track selection
   */
  private setupEventHandlers(): void {
    // Handle track selection from UI
    this.trackSelector.onTrackSelected((trackNumber: number) => {
      this.handleTrackSelection(trackNumber);
    });

    // Keyboard shortcuts: 1-5 select tracks
    window.addEventListener('keydown', this.onKeyDown);
  }

  private onKeyDown = (event: KeyboardEvent) => {
    if (!this.isEnabled) return;
    if (['1','2','3','4','5'].includes(event.key)) {
      const track = parseInt(event.key, 10);
      this.selectTrack(track);
    }
  };
  
  /**
   * Handle track selection and add to queue
   * Requirement 4.3: Queue track number when button is pressed
   */
  private handleTrackSelection(trackNumber: number): void {
    if (!this.isEnabled) {
      return;
    }
    
    this.currentSelectedTrack = trackNumber;
    
    // Calculate which segment this selection will apply to
    const trolleyPosition = this.trolleyController.position;
    const segmentLength = this.gameConfig.tracks.segmentLength;
    const currentSegment = Math.floor(trolleyPosition.z / segmentLength);
    const targetSegment = currentSegment + 1; // Apply to next segment
    
    // Add to queue (replace any existing selection for this segment)
    this.addToQueue(trackNumber, targetSegment);
    
    // Update path preview
    this.updatePathPreview(trackNumber, targetSegment);
    
    console.log(`[InputManager] Track ${trackNumber} queued for segment ${targetSegment}`);
  }
  
  /**
   * Add track selection to queue
   */
  private addToQueue(trackNumber: number, segmentIndex: number): void {
    // Remove any existing queue entry for this segment
    this.selectionQueue = this.selectionQueue.filter(
      entry => entry.segmentIndex !== segmentIndex
    );
    
    // Add new selection to queue
    const queueEntry: TrackSelectionQueue = {
      trackNumber,
      segmentIndex,
      isProcessed: false
    };
    
    this.selectionQueue.push(queueEntry);
    
    // Sort queue by segment index
    this.selectionQueue.sort((a, b) => a.segmentIndex - b.segmentIndex);
  }
  
  /**
   * Update path preview system
   * Requirement 5.1: Curved path appears translucent before segment
   * Requirement 5.2: Path becomes opaque after button check
   */
  private updatePathPreview(trackNumber: number, segmentIndex: number): void {
    // Use enhanced path preview system
    this.pathPreviewSystem.createPathPreview(trackNumber, segmentIndex);
    
    // Legacy system for backward compatibility
    const existingPreview = this.pathPreviews.get(segmentIndex);
    if (existingPreview && existingPreview.mesh) {
      this.scene.remove(existingPreview.mesh);
      existingPreview.mesh.geometry.dispose();
      if (Array.isArray(existingPreview.mesh.material)) {
        existingPreview.mesh.material.forEach(mat => mat.dispose());
      } else {
        existingPreview.mesh.material.dispose();
      }
    }
    
    // Create legacy path preview for backward compatibility
    const preview = this.createPathPreview(trackNumber, segmentIndex);
    this.pathPreviews.set(segmentIndex, preview);
    
    if (preview.mesh) {
      this.scene.add(preview.mesh);
    }
  }
  
  /**
   * Create curved path preview mesh
   */
  private createPathPreview(trackNumber: number, segmentIndex: number): PathPreview {
    const segmentLength = this.gameConfig.tracks.segmentLength;
    const segmentZ = segmentIndex * segmentLength;
    
    // Get current and target track positions
    const currentTrack = this.trolleyController.currentTrack;
    const currentX = this.trolleyController.getTrackPosition(currentTrack);
    const targetX = this.trolleyController.getTrackPosition(trackNumber);
    
    // Create smooth curved path geometry using improved curve generation
    const curve = CurvedRailwayTrack.createTrackTransition(
      currentX,
      targetX,
      segmentZ - segmentLength * 0.5,
      segmentZ,
      0.1
    );
    
    // const points = curve.getPoints(20);
    // const _geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    // Create tube geometry for better visibility
    const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.1, 8, false);
    const mesh = new THREE.Mesh(tubeGeometry, this.previewMaterial.clone());
    
    return {
      trackNumber,
      segmentIndex,
      isVisible: true,
      opacity: 0.3,
      mesh
    };
  }
  
  /**
   * Update input system - called each frame
   * Requirement 4.4: Check button when entering segment
   */
  public update(deltaTime: number): void {
    if (!this.isEnabled) {
      return;
    }
    
    // Update enhanced path preview system
    this.pathPreviewSystem.update(deltaTime);
    
  // Update segment transition system (executes switches exactly at boundaries)
  this.segmentTransitionSystem.update(deltaTime);
    
    // Check if trolley has entered a new segment
    const trolleyPosition = this.trolleyController.position;
    const segmentLength = this.gameConfig.tracks.segmentLength;
    const currentSegment = Math.floor(trolleyPosition.z / segmentLength);
    const upcomingSegment = currentSegment + 1;

    // Auto-enqueue the currently pressed button for the upcoming segment
    // Requirement: before entering a new segment, enqueue the pressed value
    const hasUpcoming = this.selectionQueue.some(e => e.segmentIndex === upcomingSegment);
    if (!hasUpcoming) {
      // Ensure exactly one queued value for the upcoming segment at all times
      this.addToQueue(this.currentSelectedTrack, upcomingSegment);
      this.updatePathPreview(this.currentSelectedTrack, upcomingSegment);
      console.log(`[InputManager] Auto-queued track ${this.currentSelectedTrack} for segment ${upcomingSegment}`);
    }
    
    if (currentSegment > this.lastProcessedSegment) {
      this.processSegmentEntry(currentSegment);
      this.lastProcessedSegment = currentSegment;
    }
    
    // Update legacy path preview opacities
    this.updatePathPreviewOpacities();
    
    // Clean up old previews
    this.cleanupOldPreviews(currentSegment);
  }
  
  /**
   * Process segment entry and apply queued track selections
   * Requirement 4.4: Check which button is pressed when entering segment
   * Requirement 4.5: Move trolley along curved path to selected track
   */
  private processSegmentEntry(segmentIndex: number): void {
    // Find queued selection for this segment
    const queueEntry = this.selectionQueue.find(
      entry => entry.segmentIndex === segmentIndex && !entry.isProcessed
    );
    
    if (queueEntry) {
      // Schedule track selection for execution at the END of this segment
      // This guarantees the actual switch happens exactly at the boundary
      this.segmentTransitionSystem.scheduleTrackChange(queueEntry.trackNumber, segmentIndex);
      queueEntry.isProcessed = true;
      
      // Update path preview to solid (opaque)
      this.makePathPreviewSolid(segmentIndex);
      
  console.log(`[InputManager] Scheduled track selection ${queueEntry.trackNumber} for end of segment ${segmentIndex}`);
    } else {
      // No selection queued, continue on current track
      const currentTrack = this.trolleyController.currentTrack;
      console.log(`[InputManager] No track selection queued for segment ${segmentIndex}, continuing on track ${currentTrack}`);
    }
    
    // Remove processed entries from queue
    this.selectionQueue = this.selectionQueue.filter(entry => !entry.isProcessed);
  }
  
  /**
   * Make path preview solid (opaque) after button check
   * Requirement 5.2: Path becomes opaque after button check
   */
  private makePathPreviewSolid(segmentIndex: number): void {
    // Use enhanced path preview system
    const queueEntry = this.selectionQueue.find(entry => entry.segmentIndex === segmentIndex);
    if (queueEntry) {
      this.pathPreviewSystem.makePathOpaque(queueEntry.trackNumber, segmentIndex);
    }
    
    // Legacy system for backward compatibility
    const preview = this.pathPreviews.get(segmentIndex);
    if (preview && preview.mesh) {
      // Replace material with solid version
      if (preview.mesh.material) {
        if (Array.isArray(preview.mesh.material)) {
          preview.mesh.material.forEach(mat => mat.dispose());
        } else {
          preview.mesh.material.dispose();
        }
      }
      
      preview.mesh.material = this.solidMaterial.clone();
      preview.opacity = 1.0;
      preview.isVisible = true;
    }
  }
  
  /**
   * Update path preview opacities based on distance to segment
   */
  private updatePathPreviewOpacities(): void {
    const trolleyPosition = this.trolleyController.position;
    const segmentLength = this.gameConfig.tracks.segmentLength;
    const currentSegment = Math.floor(trolleyPosition.z / segmentLength);
    
    this.pathPreviews.forEach((preview, segmentIndex) => {
      if (!preview.mesh) return;
      
      const distance = Math.abs(segmentIndex - currentSegment);
      
      // Fade out previews that are far away
      if (distance > 3) {
        preview.opacity = 0.1;
      } else if (distance > 1) {
        preview.opacity = 0.2;
      } else {
        preview.opacity = 0.3;
      }
      
      // Update material opacity
      if (preview.mesh.material && 'opacity' in preview.mesh.material) {
        (preview.mesh.material as any).opacity = preview.opacity;
      }
    });
  }
  
  /**
   * Clean up old path previews
   */
  private cleanupOldPreviews(currentSegment: number): void {
    const cleanupDistance = 5; // Keep previews for 5 segments behind
    
    this.pathPreviews.forEach((preview, segmentIndex) => {
      if (segmentIndex < currentSegment - cleanupDistance) {
        if (preview.mesh) {
          this.scene.remove(preview.mesh);
          preview.mesh.geometry.dispose();
          if (Array.isArray(preview.mesh.material)) {
            preview.mesh.material.forEach(mat => mat.dispose());
          } else {
            preview.mesh.material.dispose();
          }
        }
        this.pathPreviews.delete(segmentIndex);
      }
    });
  }
  
  /**
   * Mount the track selector UI to the DOM
   */
  public mount(): void {
    this.trackSelector.mount();
  // Default pressed is track 3
  const prev = this.isEnabled; this.isEnabled = false; // avoid queueing on initial select
  this.trackSelector.selectTrack(3);
  this.currentSelectedTrack = 3;
  this.isEnabled = prev;
    console.log('[InputManager] Track selector UI mounted');
  }
  
  /**
   * Unmount the track selector UI from the DOM
   */
  public unmount(): void {
    this.trackSelector.unmount();
    console.log('[InputManager] Track selector UI unmounted');
  }
  
  /**
   * Enable or disable input system
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.trackSelector.setEnabled(enabled);
    console.log(`[InputManager] ${enabled ? 'Enabled' : 'Disabled'}`);
  }
  
  /**
   * Get currently selected track
   */
  public getSelectedTrack(): number {
    return this.currentSelectedTrack;
  }
  
  /**
   * Get current selection queue
   */
  public getSelectionQueue(): TrackSelectionQueue[] {
    return [...this.selectionQueue];
  }
  
  /**
   * Get path previews for debugging
   */
  public getPathPreviews(): Map<number, PathPreview> {
    return new Map(this.pathPreviews);
  }
  
  /**
   * Force select a track (for testing or programmatic control)
   */
  public selectTrack(trackNumber: number): void {
    this.trackSelector.selectTrack(trackNumber);
  }
  
  /**
   * Clear all queued selections
   */
  public clearQueue(): void {
    this.selectionQueue = [];
    console.log('[InputManager] Selection queue cleared');
  }
  
  /**
   * Reset input system to initial state
   */
  public reset(): void {
    this.clearQueue();

    this.lastProcessedSegment = -1;
    this.currentSelectedTrack = 1;
    
    // Temporarily disable to avoid triggering selection handler
    const wasEnabled = this.isEnabled;
    this.isEnabled = false;
    this.trackSelector.selectTrack(1);
    this.isEnabled = wasEnabled;
    
    // Clear all path previews
    this.pathPreviews.forEach(preview => {
      if (preview.mesh) {
        this.scene.remove(preview.mesh);
        preview.mesh.geometry.dispose();
        if (Array.isArray(preview.mesh.material)) {
          preview.mesh.material.forEach(mat => mat.dispose());
        } else {
          preview.mesh.material.dispose();
        }
      }
    });
    this.pathPreviews.clear();
    
    console.log('[InputManager] Reset to initial state');
  }
  
  /**
   * Get path preview system for external access
   */
  public getPathPreviewSystem(): PathPreviewSystem {
    return this.pathPreviewSystem;
  }
  
  /**
   * Dispose of all resources
   */
  public dispose(): void {
  window.removeEventListener('keydown', this.onKeyDown);
    this.trackSelector.dispose();
    
    // Dispose of enhanced path preview system
    this.pathPreviewSystem.dispose();
    
    // Dispose of legacy materials
    this.previewMaterial.dispose();
    this.solidMaterial.dispose();
    
    // Clean up legacy path previews
    this.pathPreviews.forEach(preview => {
      if (preview.mesh) {
        this.scene.remove(preview.mesh);
        preview.mesh.geometry.dispose();
        if (Array.isArray(preview.mesh.material)) {
          preview.mesh.material.forEach(mat => mat.dispose());
        } else {
          preview.mesh.material.dispose();
        }
      }
    });
    this.pathPreviews.clear();
    
    this.selectionQueue = [];
    
    console.log('[InputManager] Disposed');
  }
}
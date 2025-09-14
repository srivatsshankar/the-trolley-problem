/**
 * InputManager - Handles input system and track selection logic
 * Simple approach: Check which button is pressed when trolley reaches section boundary
 * Implements requirements: 4.3, 4.4, 4.5, 5.1, 5.2
 */

import { TrackSelector, DEFAULT_TRACK_SELECTOR_CONFIG } from '../components/TrackSelector';
import { TrolleyController } from './TrolleyController';
import { TrackGenerator } from './TrackGenerator';
import { GameConfig } from '../models/GameConfig';
import { PathPreviewSystem, createPathPreviewSystem } from './PathPreviewSystem';
// Removed unused CurvedTrackSystem and SegmentTransitionSystem (no queue needed)
import * as THREE from 'three';
import { CurvedRailwayTrack } from '../models/CurvedRailwayTrack';

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

  // Section-based state tracking (sections are 2.5x railway portions)
  private lastProcessedSection: number = -1;

  // Enhanced path preview system
  private pathPreviewSystem: PathPreviewSystem;



  // Track generator reference for section calculations
  private trackGenerator: TrackGenerator;

  // Single preview for the current transition
  private currentPreview: PathPreview | null = null;
  private previewMaterial: THREE.Material;



  // State tracking - only track currently pressed button
  private isEnabled: boolean = true;
  private currentSelectedTrack: number = 3; // Default to track 3

  constructor(
    scene: THREE.Scene,
    trolleyController: TrolleyController,
    trackGenerator: TrackGenerator,
    gameConfig: GameConfig
  ) {
    this.scene = scene;
    this.trolleyController = trolleyController;
    this.trackGenerator = trackGenerator;
    this.gameConfig = gameConfig;

    // Create track selector UI component
    this.trackSelector = new TrackSelector(DEFAULT_TRACK_SELECTOR_CONFIG);

    // Create enhanced path preview system
    this.pathPreviewSystem = createPathPreviewSystem(scene, trolleyController, gameConfig);



    // Create material for path preview
    this.previewMaterial = new THREE.MeshLambertMaterial({
      color: 0xffff00, // Yellow for preview
      transparent: true,
      opacity: 0.6
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
    if (['1', '2', '3', '4', '5'].includes(event.key)) {
      const track = parseInt(event.key, 10);
      this.selectTrack(track);
    }
  };

  /**
   * Handle track selection - update the currently selected track and refresh preview
   */
  private handleTrackSelection(trackNumber: number): void {
    if (!this.isEnabled) {
      return;
    }

    const previousTrack = this.currentSelectedTrack;
    this.currentSelectedTrack = trackNumber;
    
    // If track selection changed, immediately update preview if we're in preview range
    if (previousTrack !== trackNumber) {
      const trolleyPosition = this.trolleyController.position;
      const currentSection = this.trackGenerator.getCurrentSectionIndex(trolleyPosition);
      const sectionProgress = this.trackGenerator.getSectionProgress(trolleyPosition);
      const sectionLength = this.trackGenerator.getSectionLength();
      const distanceToSectionEnd = sectionLength * (1 - sectionProgress);
      const previewThreshold = sectionLength * 0.3;

      // Update preview immediately since we show it throughout the section
      const currentTrack = this.trolleyController.currentTrack;
      
      if (this.currentSelectedTrack !== currentTrack) {
        // Clear old preview and create new one
        this.clearCurrentPreview();
        this.createPreviewAtNextSectionBoundary(this.currentSelectedTrack, currentSection);
        this.updatePreviewColor(sectionProgress);
      } else {
        // Selected same track as current, clear preview
        this.clearCurrentPreview();
      }
    }
    
    console.log(`[InputManager] Track ${trackNumber} selected`);
  }

  /**
   * Create preview for the track transition at the next section boundary
   */
  private createPreviewAtNextSectionBoundary(trackNumber: number, currentSectionIndex: number): void {
    // Clear any existing preview
    this.clearCurrentPreview();

    // Calculate the next section boundary where the transition will occur
    const sectionLength = this.trackGenerator.getSectionLength();
    const segmentLength = this.gameConfig.tracks.segmentLength;
    const nextSectionBoundaryZ = (currentSectionIndex + 1) * sectionLength;
    const segmentIndex = Math.floor(nextSectionBoundaryZ / segmentLength);

    // Use enhanced path preview system
    this.pathPreviewSystem.createPathPreview(trackNumber, segmentIndex);

    // Create preview for the exact location where trolley will transition
    const preview = this.createPathPreviewAtBoundary(trackNumber, nextSectionBoundaryZ);
    this.currentPreview = preview;

    if (preview.mesh) {
      this.scene.add(preview.mesh);
    }

    console.log(`[InputManager] Created preview for track ${trackNumber} at next section boundary Z=${nextSectionBoundaryZ}`);
  }

  /**
   * Create curved path preview mesh that matches the exact shape the trolley will follow
   */
  private createPathPreviewAtBoundary(trackNumber: number, boundaryZ: number): PathPreview {
    // Get current and target track positions
    const currentTrack = this.trolleyController.currentTrack;
    const currentX = this.trolleyController.getTrackPosition(currentTrack);
    const targetX = this.trolleyController.getTrackPosition(trackNumber);

    // Simulate the exact curve the trolley will create when it transitions
    // The trolley creates its curve when it reaches the boundary, using its current speed and transition duration
    const trolleySpeed = Math.max(this.trolleyController.speed, this.trolleyController.baseSpeed);
    const transitionDuration = 1.0; // Same as TrolleyController._transitionDuration
    
    // The trolley's curve will start at the boundary and extend forward based on speed × duration
    const startZ = boundaryZ;
    const endZ = boundaryZ + trolleySpeed * transitionDuration;

    // Use the exact same curve generation method as TrolleyController
    const curve = CurvedRailwayTrack.createTrackTransition(
      currentX,
      targetX,
      startZ,
      endZ,
      0.05 // Same elevation as TrolleyController (0.05)
    );

    // Create tube geometry that matches the visual style
    const tubeGeometry = new THREE.TubeGeometry(curve, 32, 0.1, 8, false);
    const mesh = new THREE.Mesh(tubeGeometry, this.previewMaterial.clone());

    // Store creation parameters for future comparison
    mesh.userData = {
      creationSpeed: trolleySpeed,
      creationTime: Date.now(),
      trackTransition: `${currentTrack}->${trackNumber}`
    };

    // Calculate segment index for tracking
    const segmentLength = this.gameConfig.tracks.segmentLength;
    const segmentIndex = Math.floor(boundaryZ / segmentLength);

    console.log(`[InputManager] Created preview curve: Track ${currentTrack}->${trackNumber}, X=${currentX.toFixed(1)}->${targetX.toFixed(1)}, Z=${startZ.toFixed(1)}->${endZ.toFixed(1)} (speed=${trolleySpeed.toFixed(1)}, duration=${transitionDuration})`);

    return {
      trackNumber,
      segmentIndex,
      isVisible: true,
      opacity: 0.4,
      mesh
    };
  }

  /**
   * Update input system - called each frame
   */
  public update(deltaTime: number): void {
    if (!this.isEnabled) {
      return;
    }

    // Update enhanced path preview system
    this.pathPreviewSystem.update(deltaTime);



    // Check trolley position and handle preview/transition logic
    const trolleyPosition = this.trolleyController.position;
    const currentSection = this.trackGenerator.getCurrentSectionIndex(trolleyPosition);

    // Handle preview creation when approaching section end
    this.handlePreviewLogic(trolleyPosition, currentSection);

    // Handle section transitions - check for section boundary crossings
    if (currentSection > this.lastProcessedSection) {
      // Process each section boundary we've crossed
      for (let section = this.lastProcessedSection + 1; section <= currentSection; section++) {
        this.processSectionEntry(section);
      }
      this.lastProcessedSection = currentSection;
    }
  }

  /**
   * Handle preview logic - show preview throughout the section if track will change
   * Enhanced with dynamic color changes based on trolley position within section
   */
  private handlePreviewLogic(trolleyPosition: THREE.Vector3, currentSection: number): void {
    // Calculate section progress
    const sectionProgress = this.trackGenerator.getSectionProgress(trolleyPosition);
    const currentTrack = this.trolleyController.currentTrack;

    // Show preview throughout the entire section if selected track is different from current
    if (this.currentSelectedTrack !== currentTrack) {
      // Check if we need to recreate the preview due to speed changes
      const needsRecreation = !this.currentPreview || 
        this.currentPreview.trackNumber !== this.currentSelectedTrack ||
        this.shouldRecreatePreviewForSpeedChange();
      
      if (needsRecreation) {
        this.createPreviewAtNextSectionBoundary(this.currentSelectedTrack, currentSection);
      }
      
      // Update preview color based on trolley position within section
      this.updatePreviewColor(sectionProgress);
    } else {
      // If selected track is same as current, clear any existing preview
      this.clearCurrentPreview();
    }
  }

  /**
   * Check if preview needs to be recreated due to significant speed changes
   * Since curve shape depends on trolley speed, we need to update when speed changes significantly
   */
  private shouldRecreatePreviewForSpeedChange(): boolean {
    if (!this.currentPreview) return false;
    
    // Store the speed used to create the current preview
    if (!this.currentPreview.mesh?.userData.creationSpeed) {
      return true; // No speed stored, recreate
    }
    
    const currentSpeed = Math.max(this.trolleyController.speed, this.trolleyController.baseSpeed);
    const creationSpeed = this.currentPreview.mesh.userData.creationSpeed;
    const speedChangeThreshold = 0.2; // 20% change threshold
    
    return Math.abs(currentSpeed - creationSpeed) / creationSpeed > speedChangeThreshold;
  }

  /**
   * Update preview color based on trolley position within the current section
   * Yellow when in first 50% of section, Orange when in final 50%
   */
  private updatePreviewColor(sectionProgress: number): void {
    if (!this.currentPreview || !this.currentPreview.mesh) return;

    let previewColor: number;
    let previewOpacity: number;

    if (sectionProgress < 0.5) {
      // First 50% of section - Yellow preview
      previewColor = 0xFFD700; // Gold/Yellow
      previewOpacity = 0.4;
    } else {
      // Final 50% of section - Orange preview (more likely to follow this path)
      previewColor = 0xFF8C00; // Dark Orange
      previewOpacity = 0.6;
    }

    // Update the preview material color and opacity
    const material = this.currentPreview.mesh.material as THREE.Material;
    if ('color' in material) {
      (material as any).color.setHex(previewColor);
    }
    material.opacity = previewOpacity;

    // Also update the enhanced path preview system
    this.pathPreviewSystem.updatePreviewColor(this.currentSelectedTrack, previewColor, previewOpacity);
  }

  /**
   * Process section entry - check which button is pressed and execute track change immediately
   */
  private processSectionEntry(sectionIndex: number): void {
    // Check if we're at a section boundary where track changes can occur
    const trolleyPosition = this.trolleyController.position;
    const sectionLength = this.trackGenerator.getSectionLength();
    const sectionBoundaryZ = sectionIndex * sectionLength;

    // Check if trolley has reached the section boundary (with small tolerance)
    const tolerance = 1.0;
    if (trolleyPosition.z >= sectionBoundaryZ - tolerance) {
      const currentTrack = this.trolleyController.currentTrack;

      if (this.currentSelectedTrack !== currentTrack) {
        // Make preview solid/opaque before executing the transition
        if (this.currentPreview) {
          this.makePreviewSolid();
        }

        // Execute track change immediately at section boundary
        this.trolleyController.switchToTrack(this.currentSelectedTrack);

        // Clear preview after a short delay to show the solid transition
        setTimeout(() => {
          this.clearCurrentPreview();
        }, 500);

        console.log(`[InputManager] Executed track change to ${this.currentSelectedTrack} at section ${sectionIndex} boundary`);
      } else {
        // No track change needed, clear any preview
        this.clearCurrentPreview();
        console.log(`[InputManager] No track change needed at section ${sectionIndex}, staying on track ${currentTrack}`);
      }
    }
  }

  /**
   * Make the current preview solid to indicate the trolley is transitioning onto it
   */
  private makePreviewSolid(): void {
    if (!this.currentPreview || !this.currentPreview.mesh) return;

    // Change to solid green color to indicate active transition
    const material = this.currentPreview.mesh.material as THREE.Material;
    if ('color' in material) {
      (material as any).color.setHex(0x00FF00); // Bright green for active transition
    }
    material.transparent = false;
    material.opacity = 1.0;

    // Also update the enhanced path preview system
    this.pathPreviewSystem.makePathOpaque(this.currentPreview.trackNumber, this.currentPreview.segmentIndex);
    
    console.log(`[InputManager] Made preview solid for active transition`);
  }



  /**
   * Clear the current preview
   */
  private clearCurrentPreview(): void {
    if (!this.currentPreview) return;

    // Clear enhanced path preview system
    this.pathPreviewSystem.clearAllPaths();

    // Clear current preview
    if (this.currentPreview.mesh) {
      this.scene.remove(this.currentPreview.mesh);
      this.currentPreview.mesh.geometry.dispose();
      if (Array.isArray(this.currentPreview.mesh.material)) {
        this.currentPreview.mesh.material.forEach(mat => mat.dispose());
      } else {
        this.currentPreview.mesh.material.dispose();
      }
    }

    this.currentPreview = null;
  }

  /**
   * Mount the track selector UI to the DOM
   */
  public mount(): void {
    this.trackSelector.mount();
    // Default pressed is track 3
    const prev = this.isEnabled;
    this.isEnabled = false; // avoid triggering logic on initial select
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
   * Get current preview for debugging
   */
  public getCurrentPreview(): PathPreview | null {
    return this.currentPreview;
  }

  /**
   * Force select a track (for testing or programmatic control)
   */
  public selectTrack(trackNumber: number): void {
    this.trackSelector.selectTrack(trackNumber);
  }

  /**
   * Reset input system to initial state
   */
  public reset(): void {
    this.lastProcessedSection = -1;
    this.currentSelectedTrack = 3; // Reset to default track 3

    // Temporarily disable to avoid triggering selection handler
    const wasEnabled = this.isEnabled;
    this.isEnabled = false;
    this.trackSelector.selectTrack(3);
    this.isEnabled = wasEnabled;

    // Clear current preview
    this.clearCurrentPreview();

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

    // Dispose of material
    this.previewMaterial.dispose();

    // Clear current preview
    this.clearCurrentPreview();

    console.log('[InputManager] Disposed');
  }
}
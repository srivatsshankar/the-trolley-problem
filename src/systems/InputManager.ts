/**
 * InputManager - Handles input system and track selection logic
 * Simple approach: Check which button is pressed when trolley reaches section boundary
 * Implements requirements: 4.3, 4.4, 4.5, 5.1, 5.2
 */

import { TrackSelector, DEFAULT_TRACK_SELECTOR_CONFIG } from '../components/TrackSelector';
import { ScoreDisplay, DEFAULT_SCORE_DISPLAY_CONFIG } from '../components/ScoreDisplay';
import { TrolleyController } from './TrolleyController';
import { TrackGenerator } from './TrackGenerator';
import { GameConfig } from '../models/GameConfig';
import { GameState } from '../models/GameState';
import { PathPreviewSystem, createPathPreviewSystem } from './PathPreviewSystem';
// Removed unused CurvedTrackSystem and SegmentTransitionSystem (no queue needed)
import * as THREE from 'three';


export interface PathPreview {
  trackNumber: number;
  segmentIndex: number;
  isVisible: boolean;
  opacity: number;
}

export class InputManager {
  private trackSelector: TrackSelector;
  private scoreDisplay: ScoreDisplay;
  private trolleyController: TrolleyController;
  private gameConfig: GameConfig;
  private gameState: GameState;


  // Section-based state tracking (sections are 2.5x railway portions)
  private lastProcessedSection: number = -1;

  // Enhanced path preview system
  private pathPreviewSystem: PathPreviewSystem;



  // Track generator reference for section calculations
  private trackGenerator: TrackGenerator;

  // Single preview for the current transition
  private currentPreview: PathPreview | null = null;



  // State tracking - only track currently pressed button
  private isEnabled: boolean = true;
  private currentSelectedTrack: number = 3; // Default to track 3

  constructor(
    scene: THREE.Scene,
    trolleyController: TrolleyController,
    trackGenerator: TrackGenerator,
    gameConfig: GameConfig,
    gameState?: GameState
  ) {
    this.trolleyController = trolleyController;
    this.trackGenerator = trackGenerator;
    this.gameConfig = gameConfig;
    this.gameState = gameState || new GameState();

    // Create track selector UI component
    this.trackSelector = new TrackSelector(DEFAULT_TRACK_SELECTOR_CONFIG);
    
    // Create score display UI component
    this.scoreDisplay = new ScoreDisplay(DEFAULT_SCORE_DISPLAY_CONFIG);

    // Create enhanced path preview system
    this.pathPreviewSystem = createPathPreviewSystem(scene, trolleyController, gameConfig);





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

    // Store preview info for tracking
    this.currentPreview = {
      trackNumber,
      segmentIndex,
      isVisible: true,
      opacity: 0.4
    };

    console.log(`[InputManager] Created preview for track ${trackNumber} at next section boundary Z=${nextSectionBoundaryZ}`);
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

    // Update score display with current game state
    this.scoreDisplay.updateScore(this.gameState.score);

    // Don't process section transitions if game is over (e.g., after crash)
    if (this.gameState.isGameOver) {
      return;
    }

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
    // PathPreviewSystem handles speed changes internally
    return false;
  }

  /**
   * Update preview color based on trolley position within the current section
   * Yellow when in first 50% of section, Orange when in final 50%
   */
  private updatePreviewColor(sectionProgress: number): void {
    if (!this.currentPreview) return;

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

    // Update the enhanced path preview system
    this.pathPreviewSystem.updatePreviewColor(this.currentSelectedTrack, previewColor, previewOpacity);
  }

  /**
   * Process section entry - check which button is pressed and execute track change immediately
   * Also handles section completion scoring
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

      // Process section completion scoring before track change
      this.processSectionCompletion(sectionIndex - 1); // Previous section just completed

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
   * Process section completion - calculate people hit vs avoided and update score display
   */
  private processSectionCompletion(completedSectionIndex: number): void {
    if (completedSectionIndex < 0) return; // Skip negative sections

    // Get people in the completed section
    const contentManager = this.trackGenerator.getContentManager();
    const sectionLength = this.trackGenerator.getSectionLength();
    const sectionStartZ = completedSectionIndex * sectionLength;
    const sectionEndZ = (completedSectionIndex + 1) * sectionLength;

    // Get all people in this section
    const allPeopleInSection = contentManager.getPeopleManager().getPeopleInRange(sectionStartZ, sectionEndZ);
    const totalPeopleInSection = allPeopleInSection.length;

    // Count people hit in this section (those marked as hit)
    const peopleHitInSection = allPeopleInSection.filter(person => person.isHit).length;
    const peopleAvoidedInSection = totalPeopleInSection - peopleHitInSection;

    // Update game state with section results
    this.gameState.processSegmentCompletion(totalPeopleInSection, peopleHitInSection);

    // Show temporary score changes in the score display
    if (peopleHitInSection > 0 || peopleAvoidedInSection > 0) {
      this.scoreDisplay.showSectionCompletion(peopleHitInSection, peopleAvoidedInSection);
      console.log(`[InputManager] Section ${completedSectionIndex} completed - Hit: ${peopleHitInSection}, Avoided: ${peopleAvoidedInSection}`);
    }
  }

  /**
   * Make the current preview solid to indicate the trolley is transitioning onto it
   */
  private makePreviewSolid(): void {
    if (!this.currentPreview) return;

    // Update the enhanced path preview system to make it opaque
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

    this.currentPreview = null;
  }

  /**
   * Mount the track selector UI and score display to the DOM
   */
  public mount(): void {
    this.trackSelector.mount();
    this.scoreDisplay.mount();
    // Default pressed is track 3
    const prev = this.isEnabled;
    this.isEnabled = false; // avoid triggering logic on initial select
    this.trackSelector.selectTrack(3);
    this.currentSelectedTrack = 3;
    this.isEnabled = prev;
    console.log('[InputManager] Track selector UI and score display mounted');
  }

  /**
   * Unmount the track selector UI and score display from the DOM
   */
  public unmount(): void {
    this.trackSelector.unmount();
    this.scoreDisplay.unmount();
    console.log('[InputManager] Track selector UI and score display unmounted');
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
   * Get score display for external access
   */
  public getScoreDisplay(): ScoreDisplay {
    return this.scoreDisplay;
  }

  /**
   * Update game state (for external systems to update score)
   */
  public updateGameState(gameState: GameState): void {
    this.gameState = gameState;
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    this.trackSelector.dispose();
    this.scoreDisplay.dispose();

    // Dispose of enhanced path preview system
    this.pathPreviewSystem.dispose();

    // Clear current preview
    this.clearCurrentPreview();

    console.log('[InputManager] Disposed');
  }
}
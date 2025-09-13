/**
 * TrackGenerator - Handles procedural generation of track segments
 * Implements requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.3, 10.1, 10.2
 */

import * as THREE from 'three';
import { Track, createTrack } from '../models/Track';
import { GameConfig } from '../models/GameConfig';

export interface TrackSegment {
  id: number;
  tracks: Track[];
  position: THREE.Vector3;
  startZ: number;
  endZ: number;
  isVisible: boolean;
  isGenerated: boolean;
}

export interface GenerationConfig {
  maxVisibleSegments: number;
  viewDistance: number;
  cleanupDistance: number;
  trackSpacing: number;
}

/**
 * TrackGenerator manages procedural generation of track segments
 */
export class TrackGenerator {
  private segments: Map<number, TrackSegment> = new Map();
  private gameConfig: GameConfig;
  private generationConfig: GenerationConfig;
  private currentSegmentId: number = 0;
  private lastGeneratedSegment: number = -1;
  private scene: THREE.Scene;
  
  // Track layout constants
  private readonly SINGLE_TRACK_SEGMENTS = 3; // Number of segments before splitting
  private readonly TRACK_COUNT = 5;
  
  constructor(scene: THREE.Scene, gameConfig: GameConfig, generationConfig?: Partial<GenerationConfig>) {
    this.scene = scene;
    this.gameConfig = gameConfig;
    this.generationConfig = {
      maxVisibleSegments: gameConfig.rendering.maxVisibleSegments,
      viewDistance: gameConfig.rendering.viewDistance,
      cleanupDistance: gameConfig.rendering.viewDistance * 1.5,
      trackSpacing: gameConfig.tracks.width * 2.0, // Increased from 1.2 to 2.0 for better spacing
      ...generationConfig
    };
    
    this.log('TrackGenerator initialized');
  }

  /**
   * Generate initial track segments
   * Requirement 3.1: Start with single track, then split into 5 tracks
   * Generate extra segments upfront to ensure smooth gameplay
   */
  public initialize(): void {
    this.log('Generating initial track segments...');
    
    // Generate more initial segments to create a buffer
    const initialSegmentCount = this.generationConfig.maxVisibleSegments + 5; // Extra buffer
    for (let i = 0; i < initialSegmentCount; i++) {
      this.generateSegment(i);
    }
    
    this.log(`Generated ${this.segments.size} initial segments with buffer`);
  }

  /**
   * Generate a single track segment
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  public generateSegment(segmentIndex: number): TrackSegment {
    if (this.segments.has(segmentIndex)) {
      return this.segments.get(segmentIndex)!;
    }

    const segmentLength = this.gameConfig.tracks.segmentLength;
    const startZ = segmentIndex * segmentLength;
    const endZ = startZ + segmentLength;
    const position = new THREE.Vector3(0, 0, startZ);

    // Determine if this is a single track or multi-track segment
    const isSingleTrack = segmentIndex < this.SINGLE_TRACK_SEGMENTS;
    
    const segment: TrackSegment = {
      id: segmentIndex,
      tracks: [],
      position: position.clone(),
      startZ,
      endZ,
      isVisible: false,
      isGenerated: false
    };

    if (isSingleTrack) {
      // Generate single track segment (Requirement 3.1)
      segment.tracks = this.generateSingleTrack(segmentIndex, position);
    } else {
      // Generate 5 parallel tracks (Requirement 3.2)
      segment.tracks = this.generateParallelTracks(segmentIndex, position);
    }

    // Add tracks to scene
    segment.tracks.forEach(track => {
      this.scene.add(track.mesh);
    });

    segment.isGenerated = true;
    segment.isVisible = true;
    
    this.segments.set(segmentIndex, segment);
    this.lastGeneratedSegment = Math.max(this.lastGeneratedSegment, segmentIndex);
    
    this.log(`Generated segment ${segmentIndex} with ${segment.tracks.length} tracks`);
    return segment;
  }

  /**
   * Generate single track for initial segments
   * Requirement 3.1: Trolley starts on single track
   * Position single track to align with track 3 (center) of multi-track segments
   */
  private generateSingleTrack(_segmentIndex: number, basePosition: THREE.Vector3): Track[] {
    const trackId = this.getNextTrackId();
    const trackPosition = basePosition.clone();
    
    // Position single track to align with center track (track 3) of multi-track segments
    // This ensures smooth transition from single track to multi-track
    trackPosition.x = 0; // Center position matches track 3 in multi-track layout
    trackPosition.y = 0;
    
    // Create track with segment length to fill entire segment
    const track = createTrack(trackId, trackPosition, 'NORMAL', {
      length: this.gameConfig.tracks.segmentLength
    });
    return [track];
  }

  /**
   * Generate 5 parallel tracks for multi-track segments
   * Requirement 3.2: Single track separates into 5 tracks
   */
  private generateParallelTracks(_segmentIndex: number, basePosition: THREE.Vector3): Track[] {
    const tracks: Track[] = [];
    const trackSpacing = this.generationConfig.trackSpacing;
    
    // Calculate starting X position to center all tracks
    const totalWidth = (this.TRACK_COUNT - 1) * trackSpacing;
    const startX = -totalWidth / 2;
    
    for (let i = 0; i < this.TRACK_COUNT; i++) {
      const trackId = this.getNextTrackId();
      const trackPosition = basePosition.clone();
      
      // Position tracks horizontally (Requirement 3.4: tracks move vertically, divided horizontally)
      trackPosition.x = startX + (i * trackSpacing);
      trackPosition.y = 0;
      
      // Create track with segment length to fill entire segment
      const track = createTrack(trackId, trackPosition, 'NORMAL', {
        length: this.gameConfig.tracks.segmentLength
      });
      tracks.push(track);
    }
    
    return tracks;
  }

  /**
  * Progressive track generation based on camera/trolley position
   * Requirement 7.3: Progressive generation
   * Improved with buffer zone to prevent pauses during gameplay
   */
  public updateGeneration(currentPosition: THREE.Vector3): void {
    const currentZ = currentPosition.z;
    const segmentLength = this.gameConfig.tracks.segmentLength;
    const currentSegment = Math.floor(currentZ / segmentLength);
    
    // Calculate progress within current segment (0.0 to 1.0)
    const segmentProgress = (currentZ % segmentLength) / segmentLength;
    
    // Generate ahead segments with buffer zone
    // Start generating when 60% through current segment to avoid pauses
    const bufferZoneThreshold = 0.6;
    const baseGenerateAhead = Math.ceil(this.generationConfig.maxVisibleSegments / 2);
    
    // Add extra lookahead when approaching segment boundary
    const extraLookahead = segmentProgress > bufferZoneThreshold ? 2 : 0;
    const generateAhead = baseGenerateAhead + extraLookahead;
    
    const maxSegmentToGenerate = currentSegment + generateAhead;
    
    // Generate segments in batches to spread load across frames
    const maxGenerationsPerFrame = 2;
    let generationsThisFrame = 0;
    
    for (let i = this.lastGeneratedSegment + 1; i <= maxSegmentToGenerate && generationsThisFrame < maxGenerationsPerFrame; i++) {
      this.generateSegment(i);
      generationsThisFrame++;
    }
    
    // Update visibility (lightweight operation)
    this.updateSegmentVisibility(currentPosition);
    
    // Cleanup old segments (only when needed to avoid frame drops)
    if (segmentProgress < 0.1) { // Only cleanup at start of segments
      this.cleanupOldSegments(currentPosition);
    }
  }

  /**
   * Update segment visibility based on view distance
   * Requirement 10.1: Only display necessary elements on screen
   */
  private updateSegmentVisibility(currentPosition: THREE.Vector3): void {
    const viewDistance = this.generationConfig.viewDistance;
    
    this.segments.forEach((segment, _segmentId) => {
      const distance = Math.abs(segment.position.z - currentPosition.z);
      const shouldBeVisible = distance <= viewDistance;
      
      if (segment.isVisible !== shouldBeVisible) {
        segment.isVisible = shouldBeVisible;
        
        // Update track visibility
        segment.tracks.forEach(track => {
          track.mesh.visible = shouldBeVisible;
        });
      }
    });
  }

  /**
   * Cleanup old segments to manage memory
   * Requirements: 10.1, 10.2 - Avoid overloading processing and manage memory
   */
  public cleanupOldSegments(currentPosition?: THREE.Vector3): void {
    if (!currentPosition) return;
    
    const cleanupDistance = this.generationConfig.cleanupDistance;
    const segmentsToRemove: number[] = [];
    
    this.segments.forEach((segment, segmentId) => {
      const distance = currentPosition.z - segment.position.z;
      
      // Remove segments that are far behind
      if (distance > cleanupDistance) {
        segmentsToRemove.push(segmentId);
      }
    });
    
    // Remove old segments
    segmentsToRemove.forEach(segmentId => {
      const segment = this.segments.get(segmentId);
      if (segment) {
        // Remove tracks from scene and dispose
        segment.tracks.forEach(track => {
          this.scene.remove(track.mesh);
          track.dispose();
        });
        
        this.segments.delete(segmentId);
        this.log(`Cleaned up segment ${segmentId}`);
      }
    });
    
    if (segmentsToRemove.length > 0) {
      this.log(`Cleaned up ${segmentsToRemove.length} old segments`);
    }
  }

  /**
   * Get all visible segments
   */
  public getVisibleSegments(): TrackSegment[] {
    return Array.from(this.segments.values()).filter(segment => segment.isVisible);
  }

  /**
   * Get segment by index
   */
  public getSegment(segmentIndex: number): TrackSegment | undefined {
    return this.segments.get(segmentIndex);
  }

  /**
   * Get all segments
   */
  public getAllSegments(): TrackSegment[] {
    return Array.from(this.segments.values());
  }

  /**
   * Get segment containing a specific Z position
   */
  public getSegmentAtPosition(z: number): TrackSegment | undefined {
    const segmentLength = this.gameConfig.tracks.segmentLength;
    const segmentIndex = Math.floor(z / segmentLength);
    return this.segments.get(segmentIndex);
  }

  /**
   * Get tracks for a specific segment
   */
  public getTracksForSegment(segmentIndex: number): Track[] {
    const segment = this.segments.get(segmentIndex);
    return segment ? segment.tracks : [];
  }

  /**
   * Get track by position in segment (0-4 for multi-track segments)
   */
  public getTrackAtPosition(segmentIndex: number, trackPosition: number): Track | undefined {
    const tracks = this.getTracksForSegment(segmentIndex);
    return tracks[trackPosition];
  }

  /**
   * Check if segment has single track or multiple tracks
   */
  public isSegmentSingleTrack(segmentIndex: number): boolean {
    return segmentIndex < this.SINGLE_TRACK_SEGMENTS;
  }

  /**
   * Get the number of tracks in a segment
   */
  public getTrackCountForSegment(segmentIndex: number): number {
    return this.isSegmentSingleTrack(segmentIndex) ? 1 : this.TRACK_COUNT;
  }

  /**
   * Get statistics about generated segments
   */
  public getGenerationStats(): {
    totalSegments: number;
    visibleSegments: number;
    singleTrackSegments: number;
    multiTrackSegments: number;
    lastGeneratedSegment: number;
  } {
    const visibleCount = this.getVisibleSegments().length;
    const singleTrackCount = Array.from(this.segments.keys())
      .filter(id => this.isSegmentSingleTrack(id)).length;
    
    return {
      totalSegments: this.segments.size,
      visibleSegments: visibleCount,
      singleTrackSegments: singleTrackCount,
      multiTrackSegments: this.segments.size - singleTrackCount,
      lastGeneratedSegment: this.lastGeneratedSegment
    };
  }

  /**
   * Force regeneration of a segment (useful for testing)
   */
  public regenerateSegment(segmentIndex: number): TrackSegment {
    // Remove existing segment if it exists
    const existingSegment = this.segments.get(segmentIndex);
    if (existingSegment) {
      existingSegment.tracks.forEach(track => {
        this.scene.remove(track.mesh);
        track.dispose();
      });
      this.segments.delete(segmentIndex);
    }
    
    // Generate new segment
    return this.generateSegment(segmentIndex);
  }

  /**
   * Get next unique track ID
   */
  private getNextTrackId(): number {
    return this.currentSegmentId++;
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this.log('Disposing TrackGenerator...');
    
    // Dispose all segments
    this.segments.forEach(segment => {
      segment.tracks.forEach(track => {
        this.scene.remove(track.mesh);
        track.dispose();
      });
    });
    
    this.segments.clear();
    this.log('TrackGenerator disposed');
  }

  /**
   * Pre-generate segments asynchronously to avoid frame drops
   * This method can be called during idle time or in a web worker
   */
  public preGenerateSegments(startSegment: number, count: number): void {
    const endSegment = startSegment + count;
    
    // Use requestIdleCallback if available, otherwise setTimeout
    const generateBatch = (batchStart: number, batchSize: number = 1) => {
      const batchEnd = Math.min(batchStart + batchSize, endSegment);
      
      for (let i = batchStart; i < batchEnd; i++) {
        if (!this.segments.has(i)) {
          this.generateSegment(i);
        }
      }
      
      // Continue with next batch if more segments to generate
      if (batchEnd < endSegment) {
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(() => generateBatch(batchEnd, batchSize));
        } else {
          setTimeout(() => generateBatch(batchEnd, batchSize), 0);
        }
      }
    };
    
    generateBatch(startSegment);
  }

  /**
   * Get the current segment index based on position
   */
  public getCurrentSegmentIndex(position: THREE.Vector3): number {
    return Math.floor(position.z / this.gameConfig.tracks.segmentLength);
  }

  /**
   * Get progress within current segment (0.0 to 1.0)
   */
  public getSegmentProgress(position: THREE.Vector3): number {
    const segmentLength = this.gameConfig.tracks.segmentLength;
    return (position.z % segmentLength) / segmentLength;
  }

  /**
   * Check if we're approaching a segment boundary (for input handling)
   */
  public isApproachingSegmentBoundary(position: THREE.Vector3, threshold: number = 0.8): boolean {
    return this.getSegmentProgress(position) > threshold;
  }

  /**
   * Logging utility
   */
  private log(message: string): void {
    console.log(`[TrackGenerator] ${message}`);
  }
}
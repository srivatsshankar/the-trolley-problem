/**
 * SegmentTransitionSystem - Ensures track changes occur only at segment ends
 *
 * Responsibility:
 * - Accept scheduled track changes for a specific segment index
 * - Trigger TrolleyController.switchToTrack exactly when the trolley reaches
 *   the boundary z = segmentIndex * segmentLength (with small epsilon)
 * - Prevent mid-segment switches by deferring any change until boundary
 */

import { TrolleyController } from './TrolleyController';
import { GameConfig } from '../models/GameConfig';

interface ScheduledChange {
	segmentIndex: number;
	trackNumber: number;
}

export class SegmentTransitionSystem {
	private trolleyController: TrolleyController;
	private config: GameConfig;
	private pending: ScheduledChange[] = [];
	private readonly EPS = 1e-3; // numeric tolerance on z checks

	constructor(trolleyController: TrolleyController, config: GameConfig) {
		this.trolleyController = trolleyController;
		this.config = config;
	}

	/**
	 * Schedule a track change to be executed at the end of the given segment.
	 * If an existing change is scheduled for the same segment, replace it.
	 */
	public scheduleTrackChange(trackNumber: number, segmentIndex: number): void {
		// Remove existing for this segment
		this.pending = this.pending.filter(sc => sc.segmentIndex !== segmentIndex);
		this.pending.push({ segmentIndex, trackNumber });
		// Keep ordered by segment index
		this.pending.sort((a, b) => a.segmentIndex - b.segmentIndex);
	}

		/**
		 * Update and execute any scheduled changes whose section boundary has been reached.
		 * Note: segmentIndex here represents the calculated segment where section boundary occurs
		 */
	public update(_deltaTime: number): void {
		if (this.pending.length === 0) return;

		const z = this.trolleyController.position.z;
		const segLen = this.config.tracks.segmentLength;
		if (segLen <= 0) return;

		// Execute all whose section boundary has been crossed
		// The segmentIndex passed in represents where the section boundary occurs
		const toExecute: ScheduledChange[] = [];
		const remaining: ScheduledChange[] = [];
		for (const sc of this.pending) {
			// Calculate the actual Z position where this transition should occur
			// This is based on section boundaries (every 2.5 segments = 62.5 units)
			const sectionLength = segLen * 2.5;
			const sectionIndex = Math.floor((sc.segmentIndex * segLen) / sectionLength);
			const boundaryZ = (sectionIndex + 1) * sectionLength; // section boundary
			
			if (z + this.EPS >= boundaryZ) {
				toExecute.push(sc);
			} else {
				remaining.push(sc);
			}
		}

		// Replace pending with remaining first to maintain order
		this.pending = remaining;

		// Execute in order
		for (const sc of toExecute) {
			this.trolleyController.switchToTrack(sc.trackNumber);
			console.log(`[SegmentTransitionSystem] Executed track change to ${sc.trackNumber} at section boundary`);
		}
	}

	/**
	 * Clear any scheduled changes (e.g., on reset)
	 */
	public clear(): void {
		this.pending = [];
	}
}

export function createSegmentTransitionSystem(
	trolleyController: TrolleyController,
	config: GameConfig
): SegmentTransitionSystem {
	return new SegmentTransitionSystem(trolleyController, config);
}


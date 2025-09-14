/**
 * SectionTransitionSystem - Ensures track changes occur only at section ends
 *
 * Responsibility:
 * - Accept scheduled track changes for a specific section index
 * - Trigger TrolleyController.switchToTrack exactly when the trolley reaches
 *   the boundary z = sectionIndex * sectionLength (with small epsilon)
 * - Prevent mid-section switches by deferring any change until boundary
 */

import { TrolleyController } from './TrolleyController';
import { GameConfig } from '../models/GameConfig';

interface ScheduledChange {
	sectionIndex: number;
	trackNumber: number;
}

export class SectionTransitionSystem {
	private trolleyController: TrolleyController;
	private config: GameConfig;
	private pending: ScheduledChange[] = [];
	private readonly EPS = 1e-3; // numeric tolerance on z checks

	constructor(trolleyController: TrolleyController, config: GameConfig) {
		this.trolleyController = trolleyController;
		this.config = config;
	}

	/**
	 * Schedule a track change to be executed at the end of the given section.
	 * If an existing change is scheduled for the same section, replace it.
	 */
	public scheduleTrackChange(trackNumber: number, sectionIndex: number): void {
		// Remove existing for this section
		this.pending = this.pending.filter(sc => sc.sectionIndex !== sectionIndex);
		this.pending.push({ sectionIndex, trackNumber });
		// Keep ordered by section index
		this.pending.sort((a, b) => a.sectionIndex - b.sectionIndex);
	}

		/**
		 * Update and execute any scheduled changes whose section boundary has been reached.
		 */
	public update(_deltaTime: number): void {
		if (this.pending.length === 0) return;

		const z = this.trolleyController.position.z;
		const sectionLength = this.config.tracks.segmentLength * 2.5;
		if (sectionLength <= 0) return;

		// Execute all whose section boundary has been crossed
		const toExecute: ScheduledChange[] = [];
		const remaining: ScheduledChange[] = [];
		for (const sc of this.pending) {
			const boundaryZ = (sc.sectionIndex + 1) * sectionLength;
			
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
			console.log(`[SectionTransitionSystem] Executed track change to ${sc.trackNumber} at section boundary for section ${sc.sectionIndex}`);
		}
	}

	/**
	 * Clear any scheduled changes (e.g., on reset)
	 */
	public clear(): void {
		this.pending = [];
	}
}

export function createSectionTransitionSystem(
	trolleyController: TrolleyController,
	config: GameConfig
): SectionTransitionSystem {
	return new SectionTransitionSystem(trolleyController, config);
}


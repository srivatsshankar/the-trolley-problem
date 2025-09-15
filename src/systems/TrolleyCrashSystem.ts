/**
 * TrolleyCrashSystem - Handles trolley crash animation sequence
 * Implements crash effects: immediate stop, smoke stop, light flicker, window flicker, and fire
 * Trolley remains upright throughout the entire crash sequence
 */

import * as THREE from 'three';
import { Trolley } from '../models/Trolley';
import { VisualEffectsSystem } from './VisualEffectsSystem';

export interface CrashAnimationConfig {
    lightFlickerDuration: number;
    windowFlickerDuration: number;
    fireDuration: number;
    totalAnimationDuration: number;
}

export class TrolleyCrashSystem {
    private trolley: Trolley | null = null;
    private visualEffects: VisualEffectsSystem | null = null;
    private scene: THREE.Scene;

    // Animation state
    private isCrashing: boolean = false;
    private crashStartTime: number = 0;
    private animationPhase: 'lights' | 'fire' | 'complete' = 'lights';

    // Animation config
    private config: CrashAnimationConfig;

    // Original trolley state
    private originalPosition: THREE.Vector3 = new THREE.Vector3();
    private originalRotation: THREE.Euler = new THREE.Euler();

    // Fire effect
    private fireParticles: THREE.Points[] = [];
    private fireTime: number = 0;

    // Light flicker state
    private lightFlickerTime: number = 0;
    private windowFlickerTime: number = 0;

    // Callback for when animation completes
    private onAnimationComplete?: () => void;

    constructor(
        scene: THREE.Scene,
        config?: Partial<CrashAnimationConfig>
    ) {
        this.scene = scene;
        this.config = {
            lightFlickerDuration: 2.0,
            windowFlickerDuration: 2.0,
            fireDuration: 5.0, // 5 seconds of fire as requested
            totalAnimationDuration: 7.0, // Reduced total duration (no fall phase)
            ...config
        };
    }

    /**
     * Set the trolley to animate
     */
    public setTrolley(trolley: Trolley): void {
        this.trolley = trolley;
    }

    /**
     * Set the visual effects system for additional effects
     */
    public setVisualEffects(visualEffects: VisualEffectsSystem): void {
        this.visualEffects = visualEffects;
    }

    /**
     * Start the crash animation sequence
     */
    public startCrashAnimation(onComplete?: () => void): void {
        if (!this.trolley || this.isCrashing) return;

        console.log('[TrolleyCrashSystem] Starting crash animation');

        this.isCrashing = true;
        this.crashStartTime = Date.now() * 0.001;
        this.animationPhase = 'lights';
        this.onAnimationComplete = onComplete;

        // Store original state (current position after bounce)
        const trolleyGroup = this.trolley.getGroup();
        this.originalPosition.copy(trolleyGroup.position);
        this.originalRotation.copy(trolleyGroup.rotation);

        // Immediately stop trolley movement
        this.trolley.setAnimating(false);

        // Stop smoke particles immediately
        this.stopSmokeEffect();

        // Create explosion effect at collision point
        if (this.visualEffects) {
            this.visualEffects.createExplosionEffect(trolleyGroup.position.clone(), 2.0);
        }
    }

    /**
     * Update the crash animation
     */
    public update(deltaTime: number): void {
        if (!this.isCrashing || !this.trolley) return;

        const currentTime = Date.now() * 0.001;
        const elapsedTime = currentTime - this.crashStartTime;

        // Update animation phases - no fall phase, trolley stays upright
        if (elapsedTime < this.config.lightFlickerDuration) {
            this.updateLightFlicker(deltaTime);
            this.updateWindowFlicker(deltaTime);
        } else if (elapsedTime < this.config.totalAnimationDuration) {
            if (this.animationPhase === 'lights') {
                this.animationPhase = 'fire';
                this.createFireEffect();
                console.log('[TrolleyCrashSystem] Starting fire phase - trolley stays upright');
            }
            this.updateFireEffect(deltaTime);
        } else {
            if (this.animationPhase !== 'complete') {
                this.animationPhase = 'complete';
                this.completeAnimation();
            }
        }
    }

    /**
     * Update light flickering (blue and red)
     */
    private updateLightFlicker(deltaTime: number): void {
        this.lightFlickerTime += deltaTime;

        const trolleyGroup = this.trolley!.getGroup();
        const topLight = trolleyGroup.getObjectByName('TrolleyTopLight') as THREE.Mesh;

        if (topLight && topLight.material) {
            const material = topLight.material as THREE.MeshStandardMaterial;

            // Alternate between blue and red rapidly
            const flickerSpeed = 8.0;
            const isBlue = Math.sin(this.lightFlickerTime * flickerSpeed) > 0;

            if (isBlue) {
                material.emissive.setHex(0x0066FF); // Blue
                material.emissiveIntensity = 0.8 + Math.random() * 0.4;
            } else {
                material.emissive.setHex(0xFF0066); // Red
                material.emissiveIntensity = 0.8 + Math.random() * 0.4;
            }
        }
    }

    /**
     * Update window flickering (light and dark blue)
     */
    private updateWindowFlicker(deltaTime: number): void {
        this.windowFlickerTime += deltaTime;

        const trolleyGroup = this.trolley!.getGroup();
        const windows = [
            'FrontWindow', 'BackWindow', 'LeftWindow1', 'LeftWindow2', 'RightWindow1', 'RightWindow2'
        ];

        windows.forEach((windowName, index) => {
            const window = trolleyGroup.getObjectByName(windowName) as THREE.Mesh;
            if (window && window.material) {
                const material = window.material as THREE.MeshPhysicalMaterial;

                // Each window flickers at slightly different rate
                const flickerSpeed = 6.0 + index * 0.5;
                const phase = this.windowFlickerTime * flickerSpeed + index * Math.PI / 3;
                const isLight = Math.sin(phase) > 0;

                if (isLight) {
                    material.color.setHex(0x87CEEB); // Light blue
                    material.opacity = 0.9;
                } else {
                    material.color.setHex(0x1E3A8A); // Dark blue
                    material.opacity = 0.7;
                }
            }
        });
    }



    /**
     * Create fire effect particles
     */
    private createFireEffect(): void {
        const trolleyGroup = this.trolley!.getGroup();
        const firePosition = trolleyGroup.position.clone();
        firePosition.y += 1.0; // Above the upright trolley

        // Create multiple fire particle systems
        for (let i = 0; i < 3; i++) {
            const particleCount = 30;
            const positions = new Float32Array(particleCount * 3);
            const velocities = new Float32Array(particleCount * 3);
            const colors = new Float32Array(particleCount * 3);

            for (let j = 0; j < particleCount; j++) {
                const j3 = j * 3;

                // Random positions around fire center
                positions[j3] = (Math.random() - 0.5) * 2.0;
                positions[j3 + 1] = Math.random() * 0.5;
                positions[j3 + 2] = (Math.random() - 0.5) * 2.0;

                // Upward velocities with some randomness
                velocities[j3] = (Math.random() - 0.5) * 1.0;
                velocities[j3 + 1] = Math.random() * 2.0 + 1.0;
                velocities[j3 + 2] = (Math.random() - 0.5) * 1.0;

                // Fire colors (red, orange, yellow)
                const colorChoice = Math.random();
                if (colorChoice < 0.4) {
                    // Red
                    colors[j3] = 1.0;
                    colors[j3 + 1] = 0.2;
                    colors[j3 + 2] = 0.0;
                } else if (colorChoice < 0.7) {
                    // Orange
                    colors[j3] = 1.0;
                    colors[j3 + 1] = 0.5;
                    colors[j3 + 2] = 0.0;
                } else {
                    // Yellow
                    colors[j3] = 1.0;
                    colors[j3 + 1] = 1.0;
                    colors[j3 + 2] = 0.2;
                }
            }

            const fireGeometry = new THREE.BufferGeometry();
            fireGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            fireGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
            fireGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

            const fireMaterial = new THREE.PointsMaterial({
                size: 0.2,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending,
                vertexColors: true
            });

            const firePoints = new THREE.Points(fireGeometry, fireMaterial);
            firePoints.position.copy(firePosition);
            firePoints.position.x += (i - 1) * 0.5; // Spread fire systems

            this.fireParticles.push(firePoints);
            this.scene.add(firePoints);
        }

        console.log('[TrolleyCrashSystem] Fire effect created');
    }

    /**
     * Update fire effect animation
     */
    private updateFireEffect(deltaTime: number): void {
        this.fireTime += deltaTime;

        this.fireParticles.forEach(fireSystem => {
            const positions = fireSystem.geometry.getAttribute('position') as THREE.BufferAttribute;
            const velocities = fireSystem.geometry.getAttribute('velocity') as THREE.BufferAttribute;

            for (let i = 0; i < positions.count; i++) {
                const i3 = i * 3;

                // Update positions based on velocities
                positions.array[i3] += velocities.array[i3] * deltaTime;
                positions.array[i3 + 1] += velocities.array[i3 + 1] * deltaTime;
                positions.array[i3 + 2] += velocities.array[i3 + 2] * deltaTime;

                // Reset particles that have gone too high
                if (positions.array[i3 + 1] > 3.0) {
                    positions.array[i3] = (Math.random() - 0.5) * 2.0;
                    positions.array[i3 + 1] = 0;
                    positions.array[i3 + 2] = (Math.random() - 0.5) * 2.0;

                    // Randomize velocity again
                    velocities.array[i3] = (Math.random() - 0.5) * 1.0;
                    velocities.array[i3 + 1] = Math.random() * 2.0 + 1.0;
                    velocities.array[i3 + 2] = (Math.random() - 0.5) * 1.0;
                }
            }

            positions.needsUpdate = true;
        });
    }

    /**
     * Stop smoke effect from trolley chimney
     */
    private stopSmokeEffect(): void {
        const trolleyGroup = this.trolley!.getGroup();
        const smokeSystem = trolleyGroup.getObjectByName('TrolleySmoke') as THREE.Points;

        if (smokeSystem) {
            smokeSystem.visible = false;
        }
    }

    /**
     * Complete the animation and trigger callback
     */
    private completeAnimation(): void {
        console.log('[TrolleyCrashSystem] Crash animation complete');
        // Mark animation as no longer playing
        this.isCrashing = false;
        this.animationPhase = 'complete';

        // Fire completion callback once
        if (this.onAnimationComplete) {
            const cb = this.onAnimationComplete;
            this.onAnimationComplete = undefined;
            cb();
        }
    }

    /**
     * Check if crash animation is currently playing
     */
    public isCrashAnimationPlaying(): boolean {
        return this.isCrashing && this.animationPhase !== 'complete';
    }

    /**
     * Reset the crash system
     */
    public reset(): void {
        this.isCrashing = false;
        this.animationPhase = 'lights';
        this.crashStartTime = 0;
        this.lightFlickerTime = 0;
        this.windowFlickerTime = 0;
        this.fireTime = 0;

        // Clean up fire particles
        this.fireParticles.forEach(fireSystem => {
            this.scene.remove(fireSystem);
            fireSystem.geometry.dispose();
            (fireSystem.material as THREE.Material).dispose();
        });
        this.fireParticles = [];

        // Restore trolley if available - trolley stays in normal upright position
        if (this.trolley) {
            const trolleyGroup = this.trolley.getGroup();
            // Keep trolley in its current position (no need to restore fall position)
            trolleyGroup.rotation.copy(this.originalRotation); // Restore original rotation only
            this.trolley.setAnimating(true);

            // Restore smoke
            const smokeSystem = trolleyGroup.getObjectByName('TrolleySmoke') as THREE.Points;
            if (smokeSystem) {
                smokeSystem.visible = true;
            }
        }
    }

    /**
     * Dispose of all resources
     */
    public dispose(): void {
        this.reset();
        this.trolley = null;
        this.visualEffects = null;
    }
}
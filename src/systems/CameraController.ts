/**
 * CameraController - Manages camera movement and following behavior
 * Handles smooth camera following for the trolley with configurable parameters
 */

import * as THREE from 'three';

export interface CameraFollowConfig {
    /** Distance behind the target to follow */
    followDistance: number;
    /** Height above the target */
    followHeight: number;
    /** Side offset from the target */
    followOffset: number;
    /** How smoothly the camera follows (0-1, higher = smoother) */
    smoothness: number;
    /** Whether to look at the target or maintain fixed direction */
    lookAtTarget: boolean;
    /** Minimum distance to start following */
    minFollowDistance: number;
}

export class CameraController {
    private camera: THREE.OrthographicCamera;
    private target: THREE.Object3D | null = null;
    private config: CameraFollowConfig;

    // Camera state
    private currentPosition = new THREE.Vector3();
    private targetPosition = new THREE.Vector3();
    private currentLookAt = new THREE.Vector3();

    // Original camera settings for reset
    private originalPosition = new THREE.Vector3();
    private originalLookAt = new THREE.Vector3();

    constructor(camera: THREE.OrthographicCamera, config: Partial<CameraFollowConfig> = {}) {
        this.camera = camera;

        // Set default config - adjusted for the new zoomed out camera view
        this.config = {
            followDistance: 15, // Increased from 10 to account for larger frustum
            followHeight: 20,   // Increased from 15 to maintain good perspective
            followOffset: 8,    // Increased from 5 for better positioning
            smoothness: 0.05,
            lookAtTarget: true,
            minFollowDistance: 3, // Increased from 2
            ...config
        };

        // Store original camera position
        this.originalPosition.copy(camera.position);
        this.originalLookAt.set(0, 0, 0); // Default look-at point

        // Initialize current positions
        this.currentPosition.copy(camera.position);
        this.currentLookAt.copy(this.originalLookAt);

        this.log('CameraController initialized');
    }

    /**
     * Set the target object for the camera to follow
     */
    public setTarget(target: THREE.Object3D): void {
        this.target = target;
        this.log(`Camera target set to object at position (${target.position.x.toFixed(1)}, ${target.position.y.toFixed(1)}, ${target.position.z.toFixed(1)})`);
    }

    /**
     * Clear the current target
     */
    public clearTarget(): void {
        this.target = null;
        this.log('Camera target cleared');
    }

    /**
     * Update camera position to follow the target
     */
    public update(deltaTime: number): void {
        if (!this.target) {
            return;
        }

        // For isometric view, we simply maintain the same relative offset from the target
        // This preserves the isometric angle while following the trolley
        const targetPos = this.target.position;

        // Calculate target position maintaining isometric offset
        this.targetPosition.set(
            targetPos.x + this.config.followOffset,
            this.config.followHeight,
            targetPos.z + this.config.followDistance
        );

        // Smooth interpolation factor (frame-rate independent)
        const lerpFactor = 1 - Math.exp(-this.config.smoothness * deltaTime * 60);

        // Smoothly move camera to target position
        this.currentPosition.lerp(this.targetPosition, lerpFactor);

        // Update camera position
        this.camera.position.copy(this.currentPosition);

        // Debug logging (every 60 frames)
        if (Math.floor(Date.now() / 1000) % 2 === 0 && Math.random() < 0.01) {
            this.log(`Camera: (${this.camera.position.x.toFixed(1)}, ${this.camera.position.y.toFixed(1)}, ${this.camera.position.z.toFixed(1)}) | Target: (${targetPos.x.toFixed(1)}, ${targetPos.y.toFixed(1)}, ${targetPos.z.toFixed(1)})`);
        }

        // Don't change camera rotation - maintain isometric view
    }



    /**
     * Reset camera to original position
     */
    public resetCamera(): void {
        this.currentPosition.copy(this.originalPosition);
        this.currentLookAt.copy(this.originalLookAt);
        this.camera.position.copy(this.originalPosition);
        this.camera.lookAt(this.originalLookAt);
        this.log('Camera reset to original position');
    }

    /**
     * Set camera follow configuration
     */
    public setConfig(config: Partial<CameraFollowConfig>): void {
        this.config = { ...this.config, ...config };
        this.log('Camera follow config updated');
    }

    /**
     * Get current camera follow configuration
     */
    public getConfig(): CameraFollowConfig {
        return { ...this.config };
    }

    /**
     * Enable/disable camera following
     */
    public setFollowEnabled(enabled: boolean): void {
        if (!enabled) {
            this.clearTarget();
        }
    }

    /**
     * Get current target
     */
    public getTarget(): THREE.Object3D | null {
        return this.target;
    }

    /**
     * Check if camera is currently following a target
     */
    public isFollowing(): boolean {
        return this.target !== null;
    }

    /**
     * Logging utility
     */
    private log(message: string): void {
        console.log(`[CameraController] ${message}`);
    }
}
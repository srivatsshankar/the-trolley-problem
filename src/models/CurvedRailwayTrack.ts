/**
 * CurvedRailwayTrack class - Realistic curved railway track with metal rails and wooden ties
 * Creates smooth curved tracks that properly connect straight track segments
 */

import * as THREE from 'three';
import { DEFAULT_RAILWAY_CONFIG, RAILWAY_COLORS, RailwayTrackConfig } from './RailwayTrack';

export interface CurvedTrackConfig extends RailwayTrackConfig {
    curveSegments: number;
    smoothness: number;
}

/**
 * CurvedRailwayTrack creates realistic curved railway tracks with proper rail and tie geometry
 */
export class CurvedRailwayTrack {
    public readonly group: THREE.Group;
    private config: CurvedTrackConfig;
    private curve: THREE.Curve<THREE.Vector3>;
    private rails: THREE.Mesh[] = [];
    private ties: THREE.Mesh[] = [];
    private isDisposed: boolean = false;

    constructor(curve: THREE.Curve<THREE.Vector3>, config?: Partial<CurvedTrackConfig>) {
        this.curve = curve;
        this.config = {
            ...DEFAULT_RAILWAY_CONFIG,
            curveSegments: 32,
            smoothness: 1.0,
            ...config
        };

        // Create group to hold all track components
        this.group = new THREE.Group();
        this.group.userData = {
            type: 'curved-railway-track'
        };

        // Create track components
        this.createCurvedRails();
        this.createCurvedTies();

        // Enable shadows
        this.group.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }

    /**
     * Create curved metal railway rails that follow the curve path
     */
    private createCurvedRails(): void {
        const railMaterial = new THREE.MeshStandardMaterial({
            color: this.config.railColor,
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0x111111
        });

        // Create left and right rail curves offset from the center curve
        const leftRailCurve = this.createOffsetCurve(this.curve, -this.config.railSpacing / 2);
        const rightRailCurve = this.createOffsetCurve(this.curve, this.config.railSpacing / 2);

        // Create rail geometry using TubeGeometry for smooth curves
        const railRadius = this.config.railWidth / 2;
        const segments = Math.max(16, this.config.curveSegments);

        // Left rail
        const leftRailGeometry = new THREE.TubeGeometry(
            leftRailCurve,
            segments,
            railRadius,
            8,
            false
        );
        const leftRail = new THREE.Mesh(leftRailGeometry, railMaterial);
        leftRail.userData = { type: 'curved-rail', side: 'left' };

        // Right rail
        const rightRailGeometry = new THREE.TubeGeometry(
            rightRailCurve,
            segments,
            railRadius,
            8,
            false
        );
        const rightRail = new THREE.Mesh(rightRailGeometry, railMaterial.clone());
        rightRail.userData = { type: 'curved-rail', side: 'right' };

        this.rails.push(leftRail, rightRail);
        this.group.add(leftRail);
        this.group.add(rightRail);
    }

    /**
     * Create wooden railway ties that follow the curve and maintain proper spacing
     */
    private createCurvedTies(): void {
        const tieGeometry = new THREE.BoxGeometry(
            this.config.tieLength,
            this.config.tieHeight,
            this.config.tieWidth
        );

        const tieMaterial = new THREE.MeshLambertMaterial({
            color: this.config.tieColor
        });

        // Calculate number of ties based on curve length and spacing
        const curveLength = this.curve.getLength();
        const tieCount = Math.max(2, Math.floor(curveLength / this.config.tieSpacing));

        // Place ties along the curve
        for (let i = 0; i <= tieCount; i++) {
            const t = i / tieCount;
            const position = this.curve.getPoint(t);
            const tangent = this.curve.getTangent(t);

            // Create tie
            const tie = new THREE.Mesh(tieGeometry, tieMaterial);

            // Position tie at curve point
            tie.position.copy(position);
            tie.position.y += this.config.tieHeight / 2;

            // Rotate tie to be perpendicular to the curve direction
            const angle = Math.atan2(tangent.x, tangent.z);
            tie.rotation.y = angle;

            tie.userData = { type: 'curved-tie', index: i };

            this.ties.push(tie);
            this.group.add(tie);
        }
    }

    /**
     * Create an offset curve parallel to the main curve for rail placement
     */
    private createOffsetCurve(baseCurve: THREE.Curve<THREE.Vector3>, offset: number): THREE.CatmullRomCurve3 {
        const segments = Math.max(16, this.config.curveSegments);
        const points: THREE.Vector3[] = [];

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const point = baseCurve.getPoint(t);
            const tangent = baseCurve.getTangent(t);

            // Calculate perpendicular vector (binormal) for offset
            const up = new THREE.Vector3(0, 1, 0);
            const binormal = new THREE.Vector3().crossVectors(up, tangent).normalize();

            // Apply offset
            const offsetPoint = point.clone().addScaledVector(binormal, offset);

            // Raise rails to sit on top of ties
            offsetPoint.y += this.config.tieHeight + this.config.railHeight / 2;

            points.push(offsetPoint);
        }

        return new THREE.CatmullRomCurve3(points);
    }

    /**
     * Create a smooth curved path between two track positions
     */
    public static createSmoothTransition(
        startPos: THREE.Vector3,
        endPos: THREE.Vector3,
        startTangent?: THREE.Vector3,
        endTangent?: THREE.Vector3
    ): THREE.CubicBezierCurve3 {
        // Default tangents if not provided
        const defaultTangent = new THREE.Vector3(0, 0, 1);
        const start_tangent = startTangent || defaultTangent.clone();
        const end_tangent = endTangent || defaultTangent.clone();

        // Calculate control points for smooth S-curve
        const distance = startPos.distanceTo(endPos);
        const controlDistance = distance * 0.4; // Adjust for curve smoothness

        const control1 = startPos.clone().addScaledVector(start_tangent, controlDistance);
        const control2 = endPos.clone().addScaledVector(end_tangent, -controlDistance);

        return new THREE.CubicBezierCurve3(startPos, control1, control2, endPos);
    }

    /**
     * Create a gentle S-curve for track transitions
     */
    public static createTrackTransition(
        startTrackX: number,
        endTrackX: number,
        startZ: number,
        endZ: number,
        elevation: number = 0.1
    ): THREE.CubicBezierCurve3 {
        const startPos = new THREE.Vector3(startTrackX, elevation, startZ);
        const endPos = new THREE.Vector3(endTrackX, elevation, endZ);

        // Create smooth S-curve with intermediate control points
        const quarterZ = startZ + (endZ - startZ) * 0.25;
        const threeQuarterZ = startZ + (endZ - startZ) * 0.75;

        // Control points for smooth transition
        const control1 = new THREE.Vector3(
            startTrackX + (endTrackX - startTrackX) * 0.1,
            elevation + 0.05,
            quarterZ
        );

        const control2 = new THREE.Vector3(
            endTrackX - (endTrackX - startTrackX) * 0.1,
            elevation + 0.05,
            threeQuarterZ
        );

        return new THREE.CubicBezierCurve3(startPos, control1, control2, endPos);
    }

    /**
     * Update track colors for different states
     */
    public updateColors(railColor: number, tieColor: number): void {
        this.rails.forEach(rail => {
            const material = rail.material as THREE.MeshStandardMaterial;
            material.color.setHex(railColor);
        });

        this.ties.forEach(tie => {
            const material = tie.material as THREE.MeshLambertMaterial;
            material.color.setHex(tieColor);
        });
    }

    /**
     * Get the curve this track follows
     */
    public getCurve(): THREE.Curve<THREE.Vector3> {
        return this.curve;
    }

    /**
     * Get track bounds for collision detection
     */
    public getBounds(): THREE.Box3 {
        const box = new THREE.Box3();
        box.setFromObject(this.group);
        return box;
    }

    /**
     * Get track length
     */
    public getLength(): number {
        return this.curve.getLength();
    }

    /**
     * Get point on track at parameter t (0 to 1)
     */
    public getPointAt(t: number): THREE.Vector3 {
        return this.curve.getPoint(t);
    }

    /**
     * Get tangent at parameter t (0 to 1)
     */
    public getTangentAt(t: number): THREE.Vector3 {
        return this.curve.getTangent(t);
    }

    /**
     * Check if point is near this curved track
     */
    public containsPoint(point: THREE.Vector3, tolerance: number = 0.5): boolean {
        // Sample points along the curve and check distance
        const samples = 20;
        for (let i = 0; i <= samples; i++) {
            const t = i / samples;
            const curvePoint = this.curve.getPoint(t);
            if (curvePoint.distanceTo(point) <= tolerance) {
                return true;
            }
        }
        return false;
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        if (this.isDisposed) return;

        // Dispose geometries and materials
        this.ties.forEach(tie => {
            tie.geometry.dispose();
            if (Array.isArray(tie.material)) {
                tie.material.forEach(mat => mat.dispose());
            } else {
                tie.material.dispose();
            }
        });

        this.rails.forEach(rail => {
            rail.geometry.dispose();
            if (Array.isArray(rail.material)) {
                rail.material.forEach(mat => mat.dispose());
            } else {
                rail.material.dispose();
            }
        });

        // Remove from parent if it has one
        if (this.group.parent) {
            this.group.parent.remove(this.group);
        }

        this.isDisposed = true;
    }

    /**
     * Check if track is disposed
     */
    public isTrackDisposed(): boolean {
        return this.isDisposed;
    }
}

/**
 * Default curved track configuration
 */
export const DEFAULT_CURVED_RAILWAY_CONFIG: CurvedTrackConfig = {
    ...DEFAULT_RAILWAY_CONFIG,
    curveSegments: 32,
    smoothness: 1.0
};

/**
 * Utility function to create curved railway track
 */
export function createCurvedRailwayTrack(
    curve: THREE.Curve<THREE.Vector3>,
    colorType: 'NORMAL' | 'SELECTED' | 'DANGER' = 'NORMAL',
    customConfig?: Partial<CurvedTrackConfig>
): CurvedRailwayTrack {
    const config: CurvedTrackConfig = {
        ...DEFAULT_CURVED_RAILWAY_CONFIG,
        railColor: RAILWAY_COLORS[`${colorType}_RAIL` as keyof typeof RAILWAY_COLORS],
        tieColor: RAILWAY_COLORS[`${colorType}_TIE` as keyof typeof RAILWAY_COLORS],
        ...customConfig
    };

    return new CurvedRailwayTrack(curve, config);
}
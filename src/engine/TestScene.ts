/**
 * TestScene - Creates test objects to verify scene setup and isometric view
 * Implements requirements: 1.4, 1.5
 */

import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { createRailwayTrack } from '../models/RailwayTrack';

export class TestScene {
    private sceneManager: SceneManager;
    private testObjects: THREE.Object3D[] = [];
    private animationMixers: THREE.AnimationMixer[] = [];
    
    constructor(sceneManager: SceneManager) {
        this.sceneManager = sceneManager;
    }
    
    /**
     * Create test geometries to verify scene setup
     */
    public createTestObjects(): void {
        this.log('Creating test objects...');
        
        // Create ground plane to verify isometric view
        this.createGroundPlane();
        
        // Create test cubes at different positions
        this.createTestCubes();
        
        // Create test track segments
        this.createTestTracks();
        
        // Create coordinate system helper
        this.createCoordinateHelper();
        
        this.log(`Created ${this.testObjects.length} test objects`);
    }
    
    /**
     * Create a ground plane for reference
     */
    private createGroundPlane(): void {
        const geometry = new THREE.PlaneGeometry(30, 30);
        const material = new THREE.MeshLambertMaterial({ 
            color: 0x90EE90, // Light green
            transparent: true,
            opacity: 0.8
        });
        
        const ground = new THREE.Mesh(geometry, material);
        ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
        ground.position.y = -0.1; // Slightly below origin
        ground.receiveShadow = true;
        
        this.sceneManager.addToScene(ground);
        this.testObjects.push(ground);
        
        this.log('Ground plane created');
    }
    
    /**
     * Create test cubes at different positions to verify isometric view
     */
    private createTestCubes(): void {
        const cubePositions = [
            { x: -5, y: 1, z: -5, color: 0xff0000 }, // Red cube
            { x: 5, y: 1, z: -5, color: 0x00ff00 },  // Green cube
            { x: -5, y: 1, z: 5, color: 0x0000ff },  // Blue cube
            { x: 5, y: 1, z: 5, color: 0xffff00 },   // Yellow cube
            { x: 0, y: 2, z: 0, color: 0xff00ff }    // Magenta cube (center, elevated)
        ];
        
        cubePositions.forEach((pos, index) => {
            const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
            const material = new THREE.MeshLambertMaterial({ color: pos.color });
            
            const cube = new THREE.Mesh(geometry, material);
            cube.position.set(pos.x, pos.y, pos.z);
            cube.castShadow = true;
            cube.receiveShadow = true;
            
            // Add some rotation for visual interest
            cube.rotation.y = (index * Math.PI) / 4;
            
            this.sceneManager.addToScene(cube);
            this.testObjects.push(cube);
        });
        
        this.log('Test cubes created');
    }
    
    /**
     * Create test track segments to preview track system
     */
    private createTestTracks(): void {
        const trackWidth = 1.5;
        const trackLength = 10;
        const trackSpacing = 2;
        
        // Create 5 parallel tracks
        for (let i = 0; i < 5; i++) {
            const geometry = new THREE.BoxGeometry(trackWidth, 0.2, trackLength);
            const material = new THREE.MeshLambertMaterial({ 
                color: 0x8B4513 // Brown color for tracks
            });
            
            const track = new THREE.Mesh(geometry, material);
            track.position.set((i - 2) * trackSpacing, 0, 0);
            track.castShadow = true;
            track.receiveShadow = true;
            
            this.sceneManager.addToScene(track);
            this.testObjects.push(track);
        }
        
        // Create realistic railway tracks
        for (let i = 0; i < 5; i++) {
            const trackPosition = new THREE.Vector3((i - 2) * trackSpacing, 0, 0);
            const railwayTrack = createRailwayTrack(i, trackPosition, 'NORMAL', {
                length: trackLength
            });
            
            this.sceneManager.addToScene(railwayTrack.group);
            this.testObjects.push(railwayTrack.group);
        }
        
        this.log('Test tracks created');
    }
    
    /**
     * Create coordinate system helper for debugging
     */
    private createCoordinateHelper(): void {
        const axesHelper = new THREE.AxesHelper(5);
        this.sceneManager.addToScene(axesHelper);
        this.testObjects.push(axesHelper);
        
        // Add grid helper
        const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x444444);
        gridHelper.position.y = -0.05;
        this.sceneManager.addToScene(gridHelper);
        this.testObjects.push(gridHelper);
        
        this.log('Coordinate helpers created');
    }
    
    /**
     * Update test objects (for animation)
     */
    public update(deltaTime: number): void {
        // Rotate the center cube for visual feedback
        if (this.testObjects.length > 6) { // Center cube should be at index 6
            const centerCube = this.testObjects[6];
            if (centerCube) {
                centerCube.rotation.y += deltaTime * 0.5;
                centerCube.rotation.x += deltaTime * 0.3;
            }
        }
        
        // Update animation mixers if any
        this.animationMixers.forEach(mixer => mixer.update(deltaTime));
    }
    
    /**
     * Remove all test objects from scene
     */
    public cleanup(): void {
        this.log('Cleaning up test objects...');
        
        this.testObjects.forEach(object => {
            this.sceneManager.removeFromScene(object);
            
            // Dispose of geometries and materials
            if (object instanceof THREE.Mesh) {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            }
        });
        
        this.testObjects = [];
        this.animationMixers = [];
        
        this.log('Test objects cleaned up');
    }
    
    /**
     * Get test objects for external manipulation
     */
    public getTestObjects(): THREE.Object3D[] {
        return [...this.testObjects];
    }
    
    /**
     * Logging utility
     */
    private log(message: string): void {
        console.log(`[TestScene] ${message}`);
    }
}